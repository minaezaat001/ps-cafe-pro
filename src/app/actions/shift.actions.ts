"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { calculateSessionTimeCost } from "@/lib/billing";
import { decToNumber, toDecimal } from "@/lib/decimals";
import { requirePermissionAsync, requireAuthUser } from "@/lib/action-guards";
import { getJwtTenantId, getTenantWhereForRead, requireWritableTenantContext } from "@/lib/tenant-scope";
import { ShiftOpenSchema, ShiftCloseSchema, ClearOldDataSchema, validateOrThrow } from "@/lib/validations";
import { computeShiftSummary } from "@/lib/shift-summary";
import { FT_INCOME } from "@/lib/finance-constants";
import { createAuditLog } from "@/lib/audit";

export async function openShift(openingFloat: number) {
  validateOrThrow(ShiftOpenSchema, { openingFloat });
  const user = await requirePermissionAsync("shift.manage");
  await requireWritableTenantContext();

  const tenantId = await getJwtTenantId();

  try {
    // Pre-flight check: verify no open shift exists for this tenant
    const existingOpen = await prisma.shift.findFirst({
      where: {
        status: "OPEN",
        ...(tenantId ? { tenantId } : {}),
      },
    });
    if (existingOpen) {
      throw new Error("هناك وردية مفتوحة بالفعل. يجب إغلاقها أولاً.");
    }

    const shift = await prisma.shift.create({
      data: {
        openedByUserId: user.id,
        openingFloat: toDecimal(openingFloat),
        status: "OPEN",
        ...(tenantId ? { tenantId } : {}),
      },
    });

    // Fire-and-forget audit log (not inside the create transaction to avoid holding it open)
    createAuditLog({
      action: "OPEN_SHIFT",
      entityType: "Shift",
      entityId: shift.id,
      reason: `Shift opened by ${user.username}`,
      metadata: { openedBy: user.id, shiftId: shift.id, openingFloat, tenantId, timestamp: new Date().toISOString() },
    }).catch(() => {});

    revalidatePath("/shift");
    return {
      ...shift,
      openingFloat: decToNumber(shift.openingFloat),
      expectedCash: decToNumber(shift.expectedCash),
      actualCash: decToNumber(shift.actualCash),
      variance: decToNumber(shift.variance),
    };
  } catch (error: any) {
    // Handle database-level partial unique index violation (concurrent create race)
    if (error.code === "P2002" && error.meta?.target?.includes("only_one_open_shift_per_tenant")) {
      throw new Error("هناك وردية مفتوحة بالفعل. يجب إغلاقها أولاً.");
    }
    throw error;
  }
}

export async function getActiveShift() {
  const tenantFilter = await getTenantWhereForRead();
  const shift = await prisma.shift.findFirst({
    where: {
      status: "OPEN",
      ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}),
    },
    include: {
      openedByUser: { select: { id: true, username: true, role: true } },
    },
  });
  if (!shift) return null;
  // Serialize Decimal fields to plain numbers so the object can cross
  // the server → client boundary without errors.
  return {
    ...shift,
    openingFloat: decToNumber(shift.openingFloat),
    expectedCash: decToNumber(shift.expectedCash),
    actualCash: decToNumber(shift.actualCash),
    variance: decToNumber(shift.variance),
  };
}

export async function calculateShiftSummary(shiftId: string) {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("shift.manage")) {
    throw new Error("Forbidden");
  }
  try {
    return await computeShiftSummary(shiftId);
  } catch (err) {
    console.error(`[ShiftSummary] Error calculating summary for shift ${shiftId}:`, err);
    throw err;
  }
}

/** Same as calculateShiftSummary but returns null if user lacks shift.manage (e.g. dashboard banner). */
export async function tryCalculateShiftSummary(shiftId: string) {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("shift.manage")) {
    return null;
  }
  try {
    return await computeShiftSummary(shiftId);
  } catch (err) {
    console.error(`[ShiftSummary] Error calculating summary for shift ${shiftId}:`, err);
    return null;
  }
}

export async function closeShift(
  shiftId: string,
  actualCash: number,
  notes?: string
): Promise<
  | { success: true; variance: number; expectedCash: number }
  | { success: false; message: string }
> {
  try {
    validateOrThrow(ShiftCloseSchema, { shiftId, actualCash, notes });
    const user = await requirePermissionAsync("shift.manage");
    await requireWritableTenantContext();

    const result = await prisma.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status !== "OPEN") {
      throw new Error("الوردية غير موجودة أو مغلقة بالفعل");
    }

    const summary = await computeShiftSummary(shiftId, tx);
    const variance = actualCash - summary.expectedCash;

    await tx.shift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closedByUserId: user.id,
        expectedCash: toDecimal(summary.expectedCash),
        actualCash: toDecimal(actualCash),
        variance: toDecimal(variance),
        notes: notes ?? null,
      },
    });

      await createAuditLog({
        action: "CLOSE_SHIFT",
        entityType: "Shift",
        entityId: shiftId,
        reason: `Shift closed by ${user.username}`,
        metadata: { closedBy: user.id, shiftId, actualCash, expectedCash: summary.expectedCash, variance, notes: notes ?? null, timestamp: new Date().toISOString() },
      }, tx);

      return { variance, expectedCash: summary.expectedCash };
    });

    revalidatePath("/shift");
    revalidatePath("/");
    return { success: true, ...result };
  } catch (e) {
    const message = e instanceof Error ? e.message : "تعذر إغلاق الوردية.";
    return { success: false, message };
  }
}

export async function getShiftHistory(limit: number = 20) {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("shift.manage")) {
    return [];
  }

  const tenantFilter = await getTenantWhereForRead();
  const shifts = await prisma.shift.findMany({
    where: {
      status: "CLOSED",
      ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}),
    },
    include: {
      openedByUser: { select: { username: true } },
      closedByUser: { select: { username: true } },
    },
    orderBy: { closedAt: "desc" },
    take: limit,
  });
  // Serialize Decimal fields to plain numbers
  return shifts.map((s) => ({
    ...s,
    openingFloat: decToNumber(s.openingFloat),
    expectedCash: decToNumber(s.expectedCash),
    actualCash: decToNumber(s.actualCash),
    variance: decToNumber(s.variance),
  }));
}

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

    // Apply internal order filtering for soft-delete
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

export async function getReportData(startDate: Date, endDate: Date) {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("reports.view")) {
    throw new Error("Forbidden");
  }

  const tenantFilter = await getTenantWhereForRead();
  const endOfDay = new Date(endDate);
  endOfDay.setHours(23, 59, 59, 999);

  const [sessions, sales, transactions, shifts] = await Promise.all([
    prisma.session.findMany({
      where: { endTime: { gte: startDate, lte: endOfDay }, isActive: false, ...tenantFilter },
      include: {
        device: true,
        endedByUser: true,
        segments: true,
        orders: {
          include: { inventoryItem: true },
        },
      },
    }),
    prisma.sale.findMany({
      where: { createdAt: { gte: startDate, lte: endOfDay }, ...tenantFilter },
      include: {
        user: true,
        items: { include: { inventoryItem: true } },
      },
    }),
    prisma.financialTransaction.findMany({
      where: { createdAt: { gte: startDate, lte: endOfDay }, ...tenantFilter },
      include: { user: true },
    }),
    prisma.shift.findMany({
      where: {
        ...tenantFilter,
        OR: [
          { openedAt: { gte: startDate, lte: endOfDay } },
          { closedAt: { gte: startDate, lte: endOfDay } }
        ]
      },
      include: {
        openedByUser: { select: { username: true } },
        closedByUser: { select: { username: true } },
      },
      orderBy: { openedAt: 'asc' }
    })
  ]);

  const filteredSessions = sessions.map(s => ({
    ...s,
    orders: s.orders.filter((o: any) => !o.isDeleted)
  }));
  const filteredSales = (sales as any[]).filter(s => !s.isDeleted);
  
  const serializedShifts = shifts.map(s => ({
    ...s,
    openingFloat: decToNumber(s.openingFloat),
    expectedCash: decToNumber(s.expectedCash),
    actualCash: decToNumber(s.actualCash),
    variance: decToNumber(s.variance),
  }));

  return { 
    sessions: filteredSessions, 
    sales: filteredSales, 
    transactions,
    shifts: serializedShifts
  };
}

export async function getAdvancedPerformanceMetrics() {
  try {
    const user = await requireAuthUser();
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("reports.view")) {
      return null;
    }

    const tenantFilter = await getTenantWhereForRead();
    const now = new Date();
    const startOfToday = new Date(new Date(now).setHours(0, 0, 0, 0));
    const endOfToday = new Date(new Date(now).setHours(23, 59, 59, 999));
    const startOfYesterday = new Date(new Date(startOfToday).setDate(startOfToday.getDate() - 1));
    const endOfYesterday = new Date(new Date(endOfToday).setDate(endOfToday.getDate() - 1));

    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonthSameDay = new Date(new Date(now).setMonth(now.getMonth() - 1));

    const [
      todaySessions,
      todaySales,
      todayTransactions,
      yesterdaySessions,
      yesterdaySales,
      yesterdayTransactions,
      thisMonthSessions,
      thisMonthSales,
      thisMonthTransactions,
      lastMonthSessions,
      lastMonthSales,
      lastMonthTransactions,
    ] = await Promise.all([
      prisma.session.findMany({
        where: { endTime: { gte: startOfToday, lte: endOfToday }, isActive: false, ...tenantFilter },
        include: { orders: true, segments: true },
      }),
      prisma.sale.findMany({ where: { createdAt: { gte: startOfToday, lte: endOfToday }, ...tenantFilter } }),
      prisma.financialTransaction.findMany({
        where: { createdAt: { gte: startOfToday, lte: endOfToday }, ...tenantFilter },
      }),
      prisma.session.findMany({
        where: { endTime: { gte: startOfYesterday, lte: endOfYesterday }, isActive: false, ...tenantFilter },
        include: { orders: true, segments: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: startOfYesterday, lte: endOfYesterday }, ...tenantFilter },
      }),
      prisma.financialTransaction.findMany({
        where: { createdAt: { gte: startOfYesterday, lte: endOfYesterday }, ...tenantFilter },
      }),
      prisma.session.findMany({
        where: { endTime: { gte: startOfThisMonth, lte: endOfToday }, isActive: false, ...tenantFilter },
        include: { orders: true, segments: true },
      }),
      prisma.sale.findMany({ where: { createdAt: { gte: startOfThisMonth, lte: endOfToday }, ...tenantFilter } }),
      prisma.financialTransaction.findMany({
        where: { createdAt: { gte: startOfThisMonth, lte: endOfToday }, ...tenantFilter },
      }),
      prisma.session.findMany({
        where: { endTime: { gte: startOfLastMonth, lte: endOfLastMonthSameDay }, isActive: false, ...tenantFilter },
        include: { orders: true, segments: true },
      }),
      prisma.sale.findMany({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonthSameDay }, ...tenantFilter },
      }),
      prisma.financialTransaction.findMany({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonthSameDay }, ...tenantFilter },
      }),
    ]);

    const filterAll = (sessions: any[], sales: any[]) => {
      const filteredSales = sales.filter(s => !s.isDeleted);
      const filteredSessions = sessions.map(s => ({
        ...s,
        orders: (s.orders || []).filter((o: any) => !o.isDeleted)
      }));
      return { sessions: filteredSessions, sales: filteredSales };
    };

    const today = filterAll(todaySessions, todaySales);
    const yesterday = filterAll(yesterdaySessions, yesterdaySales);
    const thisMonth = filterAll(thisMonthSessions, thisMonthSales);
    const lastMonth = filterAll(lastMonthSessions, lastMonthSales);

    const calc = (
      sessions: typeof todaySessions,
      sales: typeof todaySales,
      transactions: { type: string; amount: unknown }[]
    ) => {
      let gaming = sessions.reduce((acc, s) => acc + decToNumber(s.accumulatedTimeCost), 0);
      let cafeteria =
        sales.reduce((acc, s) => acc + decToNumber(s.totalAmount), 0) +
        sessions.reduce(
          (acc, s) =>
            acc +
            (s.orders || []).reduce((a, o) => a + decToNumber(o.priceAtTime) * o.quantity, 0),
          0
        );
      let income = transactions
        .filter((t) => t.type === FT_INCOME)
        .reduce((acc, t) => acc + decToNumber(t.amount), 0);
      let expenses = transactions
        .filter((t) => t.type === "EXPENSE")
        .reduce((acc, t) => acc + decToNumber(t.amount), 0);
      return gaming + cafeteria + income - expenses;
    };

    const todayRev = calc(today.sessions, today.sales, todayTransactions);
    const yesterdayRev = calc(yesterday.sessions, yesterday.sales, yesterdayTransactions);
    const thisMonthRev = calc(thisMonth.sessions, thisMonth.sales, thisMonthTransactions);
    const lastMonthRev = calc(lastMonth.sessions, lastMonth.sales, lastMonthTransactions);

    const getTrend = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
    };

    return {
      today: { value: todayRev, trend: getTrend(todayRev, yesterdayRev) },
      month: { value: thisMonthRev, trend: getTrend(thisMonthRev, lastMonthRev) },
      cafeteriaToday:
        today.sales.reduce((acc: number, s: any) => acc + decToNumber(s.totalAmount), 0) +
        today.sessions.reduce(
          (acc: number, s: any) =>
            acc +
            (s.orders || []).reduce((a: number, o: any) => a + decToNumber(o.priceAtTime) * o.quantity, 0),
          0
        ),
      gamingToday: today.sessions.reduce((acc: number, s: any) => acc + decToNumber(s.accumulatedTimeCost), 0),
      transactions: todayTransactions.map((t) => ({
        ...t,
        amount: decToNumber(t.amount),
      })),
    };
  } catch (err) {
    console.error("Error fetching advanced metrics:", err);
    return null;
  }
}

/** Returns a breakdown of cafeteria items (drinks, food) delivered during a specific shift. */
export async function getShiftItemsBreakdown(shiftId: string): Promise<{
  items: { name: string; category: string; quantity: number; total: number }[];
  totalQty: number;
  totalAmount: number;
}> {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("shift.manage")) {
    throw new Error("Forbidden");
  }

  // Orders directly linked to the shift (via QR / cafeteria orders)
  const directOrders = await prisma.order.findMany({
    where: { shiftId, isDeleted: false, status: "DELIVERED" },
    include: { inventoryItem: true },
  });

  // Orders linked via session → shift (legacy path where shiftId was set on session)
  const sessionOrders = await prisma.order.findMany({
    where: {
      isDeleted: false,
      status: "DELIVERED",
      shiftId: null,
      session: { shiftId },
    },
    include: { inventoryItem: true },
  });

  const allOrders = [...directOrders, ...sessionOrders];

  // Aggregate by inventory item
  const itemMap: Record<string, { name: string; category: string; quantity: number; total: number }> = {};
  for (const o of allOrders) {
    const key = o.inventoryItemId;
    if (!itemMap[key]) {
      itemMap[key] = {
        name: o.inventoryItem.name,
        category: o.inventoryItem.category ?? "",
        quantity: 0,
        total: 0,
      };
    }
    itemMap[key].quantity += o.quantity;
    itemMap[key].total += decToNumber(o.priceAtTime) * o.quantity;
  }

  const items = Object.values(itemMap).sort((a, b) => b.quantity - a.quantity);
  const totalQty = items.reduce((acc, i) => acc + i.quantity, 0);
  const totalAmount = items.reduce((acc, i) => acc + i.total, 0);

  return { items, totalQty, totalAmount };
}
