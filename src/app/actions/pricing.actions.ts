"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { requirePermissionAsync } from "@/lib/action-guards";
import { getJwtTenantId, requireWritableTenantContext } from "@/lib/tenant-scope";
import { createAuditLog } from "@/lib/audit";
import { toDecimal, decToNumber } from "@/lib/decimals";

export interface PricingTierData {
  id: string;
  name: string;
  startTime: string | null;
  endTime: string | null;
  dayOfWeek: number | null;
  multiplier: number;
  createdAt: Date;
}

export async function getPricingTiers(): Promise<PricingTierData[]> {
  const user = await requirePermissionAsync("settings.manage");
  const tenantId = user.tenantId ?? await getJwtTenantId();
  if (!tenantId) return [];

  const tiers = await prisma.pricingTier.findMany({
    where: { tenantId: tenantId as string },
    orderBy: { createdAt: "asc" },
  });

  return tiers.map((t) => ({
    ...t,
    multiplier: decToNumber(t.multiplier),
  }));
}

export async function addPricingTier(data: {
  name: string;
  startTime?: string;
  endTime?: string;
  dayOfWeek?: number;
  multiplier: number;
}) {
  const user = await requirePermissionAsync("settings.manage");
  await requireWritableTenantContext();
  const rawTenantId = user.tenantId ?? await getJwtTenantId();
  if (!rawTenantId) throw new Error("No tenant context");
  const tenantId: string = rawTenantId;

  if (!data.name || data.name.trim().length === 0) throw new Error("Name is required");
  if (data.multiplier <= 0) throw new Error("Multiplier must be positive");

  const tier = await prisma.pricingTier.create({
    data: {
      name: data.name.trim(),
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      dayOfWeek: data.dayOfWeek ?? null,
      multiplier: toDecimal(data.multiplier),
      tenantId,
    },
  });

  createAuditLog({
    action: "CREATE_PRICING_TIER",
    entityType: "PricingTier",
    entityId: tier.id,
    reason: `Pricing tier "${data.name}" created (×${data.multiplier})`,
    metadata: { ...data, tenantId },
  }).catch(() => {});

  revalidatePath("/settings");
  return { ...tier, multiplier: decToNumber(tier.multiplier) };
}

export async function updatePricingTier(
  id: string,
  data: { name?: string; startTime?: string; endTime?: string; dayOfWeek?: number; multiplier?: number }
) {
  const user = await requirePermissionAsync("settings.manage");
  await requireWritableTenantContext();
  const rawTenantId = user.tenantId ?? await getJwtTenantId();
  if (!rawTenantId) throw new Error("No tenant context");
  const tenantId: string = rawTenantId;

  const existing = await prisma.pricingTier.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new Error("Pricing tier not found");

  const updateData: any = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.startTime !== undefined) updateData.startTime = data.startTime || null;
  if (data.endTime !== undefined) updateData.endTime = data.endTime || null;
  if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek ?? null;
  if (data.multiplier !== undefined) updateData.multiplier = toDecimal(data.multiplier);

  const updated = await prisma.pricingTier.update({
    where: { id },
    data: updateData,
  });

  createAuditLog({
    action: "UPDATE_PRICING_TIER",
    entityType: "PricingTier",
    entityId: id,
    reason: `Pricing tier "${existing.name}" updated`,
    metadata: { before: existing, after: updateData, tenantId },
  }).catch(() => {});

  revalidatePath("/settings");
  return { ...updated, multiplier: decToNumber(updated.multiplier) };
}

export async function deletePricingTier(id: string) {
  const user = await requirePermissionAsync("settings.manage");
  await requireWritableTenantContext();
  const rawTenantId = user.tenantId ?? await getJwtTenantId();
  if (!rawTenantId) throw new Error("No tenant context");
  const tenantId: string = rawTenantId;

  const existing = await prisma.pricingTier.findFirst({
    where: { id, tenantId },
  });
  if (!existing) throw new Error("Pricing tier not found");

  await prisma.pricingTier.delete({ where: { id } });

  createAuditLog({
    action: "DELETE_PRICING_TIER",
    entityType: "PricingTier",
    entityId: id,
    reason: `Pricing tier "${existing.name}" deleted`,
    metadata: { tenantId },
  }).catch(() => {});

  revalidatePath("/settings");
}
