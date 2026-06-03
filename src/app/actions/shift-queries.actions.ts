"use server";

import prisma from "@/lib/db";
import { decToNumber } from "@/lib/decimals";
import { requireAuthUser } from "@/lib/action-guards";
import { getTenantWhereForRead } from "@/lib/tenant-scope";

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
  return {
    ...shift,
    openingFloat: decToNumber(shift.openingFloat),
    expectedCash: decToNumber(shift.expectedCash),
    actualCash: decToNumber(shift.actualCash),
    variance: decToNumber(shift.variance),
  };
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
  return shifts.map((s) => ({
    ...s,
    openingFloat: decToNumber(s.openingFloat),
    expectedCash: decToNumber(s.expectedCash),
    actualCash: decToNumber(s.actualCash),
    variance: decToNumber(s.variance),
  }));
}

export async function getShiftItemsBreakdown(shiftId: string): Promise<{
  items: { name: string; category: string; quantity: number; total: number }[];
  totalQty: number;
  totalAmount: number;
}> {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("shift.manage")) {
    throw new Error("Forbidden");
  }

  const directOrders = await prisma.order.findMany({
    where: { shiftId, isDeleted: false, status: "DELIVERED" },
    include: { inventoryItem: true },
  });

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
