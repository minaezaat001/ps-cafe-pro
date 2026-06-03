"use server";

import prisma from "@/lib/db";
import { decToNumber } from "@/lib/decimals";
import { requireAuthUser } from "@/lib/action-guards";
import { getTenantWhereForRead } from "@/lib/tenant-scope";
import { computeShiftSummary } from "@/lib/shift-summary";
import { calculateSessionTimeCost } from "@/lib/billing";
import { FT_INCOME } from "@/lib/finance-constants";

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
