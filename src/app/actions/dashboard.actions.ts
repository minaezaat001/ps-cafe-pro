"use server";

import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/action-guards";
import { getTenantWhereForRead } from "@/lib/tenant-scope";
import { decToNumber } from "@/lib/decimals";
import { calculateSessionTimeCost } from "@/lib/billing";
import { FT_INCOME } from "@/lib/finance-constants";
import {
  serializeDashboardDevice,
  snapshotRevision,
  type DashboardDeviceSnapshot,
} from "@/lib/dashboard-serialize";
import { getActivePricingMultiplier } from "@/lib/pricing";

export type DevicesSnapshotResult =
  | { success: true; devices: DashboardDeviceSnapshot[]; revision: string; serverTime: number }
  | { success: false; error: string };

/**
 * Lightweight device + active session payload for dashboard polling (no stats queries).
 * Client compares `revision` to skip re-renders when nothing changed.
 */
export async function getDashboardData() {
  try {
    const user = await requireAuthUser();
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("dashboard.manage")) {
      throw new Error("Forbidden");
    }

    const now = new Date();
    const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0));
    const endOfToday = new Date(new Date(now).setHours(23, 59, 59, 999));

    const startOfYesterday = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 1));
    const endOfYesterday = new Date(new Date(endOfToday).setDate(endOfToday.getDate() - 1));

    const tenantFilter = await getTenantWhereForRead();
    const tenantWhere =
      Object.keys(tenantFilter).length > 0
        ? (tenantFilter as { tenantId: string })
        : null;

    const [devices, todaySessions, todaySales, yesterdaySessions, yesterdaySales, todayTransactions, yesterdayTransactions] =
      await Promise.all([
        prisma.device.findMany({
          where: {
            ...(tenantWhere ?? {}),
          },
          include: {
            sessions: {
              where: { isActive: true },
              include: {
                orders: {
                  include: { inventoryItem: true },
                },
                segments: true,
                device: true,
              },
            },
          },
        }),
        prisma.session.findMany({
          where: {
            endTime: { gte: startOfToday, lte: endOfToday },
            isActive: false,
            ...(tenantWhere ?? {}),
          },
          include: { orders: { include: { inventoryItem: true } }, device: true, segments: true },
        }),
        prisma.sale.findMany({
          where: {
            createdAt: { gte: startOfToday, lte: endOfToday },
            ...(tenantWhere ?? {}),
          },
        }),
        prisma.session.findMany({
          where: {
            endTime: { gte: startOfYesterday, lte: endOfYesterday },
            isActive: false,
            ...(tenantWhere ?? {}),
          },
          include: { orders: { include: { inventoryItem: true } }, device: true, segments: true },
        }),
        prisma.sale.findMany({
          where: {
            createdAt: { gte: startOfYesterday, lte: endOfYesterday },
            ...(tenantWhere ?? {}),
          },
        }),
        prisma.financialTransaction.findMany({
          where: {
            createdAt: { gte: startOfToday, lte: endOfToday },
            ...(tenantWhere ?? {}),
          },
          include: { user: true },
        }),
        prisma.financialTransaction.findMany({
          where: {
            createdAt: { gte: startOfYesterday, lte: endOfYesterday },
            ...(tenantWhere ?? {}),
          },
          include: { user: true },
        }),
      ]);

    const devicesRaw = (devices as any[]).filter(d => !d.isDeleted);
    const todaySalesRaw = (todaySales as any[]).filter(s => !s.isDeleted);
    const yesterdaySalesRaw = (yesterdaySales as any[]).filter(s => !s.isDeleted);

    const filterOrders = (sessions: any[]) => {
      sessions.forEach(s => {
        if (s.orders) s.orders = s.orders.filter((o: any) => !o.isDeleted);
      });
      return sessions;
    };

    filterOrders(todaySessions);
    filterOrders(yesterdaySessions);
    devicesRaw.forEach(d => {
      if (d.sessions) filterOrders(d.sessions);
    });

    const calculateRevenue = (
      endedSessions: typeof todaySessions,
      sales: typeof todaySales,
      transactions: { type: string; amount: unknown }[] = [],
      allDevices: typeof devices = []
    ) => {
      let gaming = 0;
      endedSessions.forEach((s) => {
        gaming += decToNumber(s.accumulatedTimeCost);
      });

      allDevices.forEach((device) => {
        device.sessions.forEach((s) => {
          if (s.isActive) {
            gaming += calculateSessionTimeCost(s, device);
          }
        });
      });

      let cafeteria = sales.reduce((acc, s) => acc + decToNumber(s.totalAmount), 0);
      endedSessions.forEach((s) => {
        cafeteria += (s.orders || [])
          .filter(o => !o.isDeleted)
          .reduce((acc, o) => acc + decToNumber(o.priceAtTime) * o.quantity, 0);
      });

      allDevices.forEach((device) => {
        device.sessions.forEach((s) => {
          if (s.isActive) {
            cafeteria += (s.orders || [])
              .filter(o => !o.isDeleted)
              .reduce((acc, o) => acc + decToNumber(o.priceAtTime) * o.quantity, 0);
          }
        });
      });

      let income = transactions
        .filter((t) => t.type === FT_INCOME)
        .reduce((acc, t) => acc + decToNumber(t.amount), 0);
      let expenses = transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((acc, t) => acc + decToNumber(t.amount), 0);

      return {
        total: gaming + cafeteria + income - expenses,
        cafeteria,
        gaming,
        income,
        expenses,
      };
    };

    const todayRev = calculateRevenue(todaySessions, todaySalesRaw, todayTransactions, devicesRaw);
    const yesterdayRev = calculateRevenue(
      yesterdaySessions,
      yesterdaySalesRaw,
      yesterdayTransactions,
      []
    );

    const activeUsers = devicesRaw.filter((d) => d.sessions.length > 0).length;

    const getTrend = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? "+100%" : "0%";
      const diff = ((curr - prev) / prev) * 100;
      return `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}% from yesterday`;
    };

    const oneHourAgo = new Date(new Date().getTime() - 3600000);
    const newSessionsLastHour = await prisma.session.count({
      where: {
        startTime: { gte: oneHourAgo },
        ...(tenantWhere ?? {}),
      },
    });

    return {
      devices,
      stats: {
        activeDevices: `${activeUsers}/${devices.length}`,
        activeDevicesTrend: "Real-time occupancy",
        totalRevenue: `${todayRev.total.toFixed(0)} LE`,
        totalRevenueTrend: getTrend(todayRev.total, yesterdayRev.total),
        activeUsers: activeUsers.toString(),
        activeUsersTrend: `${newSessionsLastHour} new in last hour`,
        cafeteriaSales: `${todayRev.cafeteria.toFixed(0)} LE`,
        cafeteriaSalesTrend: `Peak time: 8-10 PM`,
      },
    };
  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    return {
      devices: [],
      stats: {
        activeDevices: "0/0",
        activeDevicesTrend: "0%",
        totalRevenue: "0 LE",
        totalRevenueTrend: "0%",
        activeUsers: "0",
        activeUsersTrend: "0 new",
        cafeteriaSales: "0 LE",
        cafeteriaSalesTrend: "N/A",
      },
    };
  }
}

export async function getDevicesSnapshotForDashboard(): Promise<DevicesSnapshotResult> {
  try {
    const user = await requireAuthUser();
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("dashboard.manage")) {
      return { success: false, error: "Forbidden" };
    }

    const tenantFilter = await getTenantWhereForRead();
    const tenantId = Object.keys(tenantFilter).length > 0
      ? (tenantFilter as { tenantId: string }).tenantId
      : null;
    const pricingMultiplier = await getActivePricingMultiplier(tenantId);

    const raw = await prisma.device.findMany({
      where: {
        ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}),
      },
      orderBy: { number: "asc" },
      include: {
        sessions: {
          where: { isActive: true },
          include: {
            orders: { include: { inventoryItem: true } },
            segments: true,
            device: true,
          },
        },
      },
    });

    const devices = (raw as any[])
      .filter(d => !d.isDeleted)
      .map((d) => {
        if (d.sessions) {
          d.sessions.forEach((s: any) => {
            if (s.orders) {
              s.orders = s.orders.filter((o: any) => !o.isDeleted);
            }
          });
        }
        return serializeDashboardDevice(d, pricingMultiplier);
      });
    return {
      success: true,
      devices,
      revision: snapshotRevision(devices),
      serverTime: Date.now(),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg };
  }
}
