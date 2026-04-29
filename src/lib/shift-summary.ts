import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { decToNumber } from "@/lib/decimals";
import { FT_SESSION_GAMING, FT_EXPENSE, FT_INCOME } from "@/lib/finance-constants";

export type DbClient = Prisma.TransactionClient | typeof prisma;

export async function computeShiftSummary(shiftId: string, db: DbClient = prisma) {
  const shift = await db.shift.findUnique({
    where: { id: shiftId },
    include: {
      sessions: {
        where: { isActive: false },
        include: { orders: true },
      },
      sales: true,
    },
  });

  if (!shift) {
    throw new Error("Shift not found");
  }

  const shiftSales = (shift.sales as any[]).filter(s => !s.isDeleted);

  const gamingAgg = await db.financialTransaction.aggregate({
    where: { shiftId, type: FT_SESSION_GAMING },
    _sum: { amount: true },
  });

  let gaming = decToNumber(gamingAgg._sum.amount);
  const sessionGamingFallback = shift.sessions.reduce(
    (acc, s) => acc + decToNumber(s.accumulatedTimeCost),
    0
  );
  if (gaming === 0) {
    gaming = sessionGamingFallback;
  }

  let sessionCafeteria = 0;
  for (const s of shift.sessions) {
    for (const o of s.orders.filter(order => !order.isDeleted)) {
      sessionCafeteria += decToNumber(o.priceAtTime) * o.quantity;
    }
  }

  const saleCafeteria = shiftSales.reduce((acc, s) => acc + decToNumber(s.totalAmount), 0);

  const shiftTx = await db.financialTransaction.findMany({
    where: { shiftId },
  });

  let income = 0;
  let expenses = 0;
  for (const t of shiftTx) {
    const amt = decToNumber(t.amount);
    if (t.type === FT_INCOME) income += amt;
    if (t.type === FT_EXPENSE) expenses += amt;
  }

  const totalRevenue = gaming + sessionCafeteria + saleCafeteria + income - expenses;
  const expectedCash = decToNumber(shift.openingFloat) + totalRevenue;

  return {
    gaming,
    cafeteria: sessionCafeteria + saleCafeteria,
    income,
    expenses,
    totalRevenue,
    expectedCash,
    openingFloat: decToNumber(shift.openingFloat),
    sessionCount: shift.sessions.length,
    transactionCount: shiftTx.length,
  };
}
