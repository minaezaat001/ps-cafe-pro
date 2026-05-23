"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./auth.actions";

export type PriceHistoryEntry = {
  id: string;
  action: string;
  createdAt: string;
  changedBy: string;
  changes: Record<string, { old: unknown; new: unknown }>;
};

export async function getPriceHistory(
  entityType: "Device" | "InventoryItem",
  entityId: string
): Promise<PriceHistoryEntry[]> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const logs = await prisma.auditLog.findMany({
    where: {
      entityType,
      entityId,
      action: { in: ["UPDATE_DEVICE", "UPDATE_INVENTORY_ITEM"] },
    },
    include: { user: { select: { username: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return logs.map((l) => ({
    id: l.id,
    action: l.action,
    createdAt: l.createdAt.toISOString(),
    changedBy: l.user?.username ?? "system",
    changes: (l.metadata as any)?.changes ?? {},
  }));
}
