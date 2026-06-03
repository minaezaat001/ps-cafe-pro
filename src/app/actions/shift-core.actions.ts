"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { decToNumber, toDecimal } from "@/lib/decimals";
import { requirePermissionAsync } from "@/lib/action-guards";
import { getJwtTenantId, requireWritableTenantContext } from "@/lib/tenant-scope";
import { ShiftOpenSchema, ShiftCloseSchema, validateOrThrow } from "@/lib/validations";
import { computeShiftSummary } from "@/lib/shift-summary";
import { createAuditLog } from "@/lib/audit";

export async function openShift(openingFloat: number) {
  validateOrThrow(ShiftOpenSchema, { openingFloat });
  const user = await requirePermissionAsync("shift.manage");
  await requireWritableTenantContext();

  const tenantId = await getJwtTenantId();

  try {
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
    if (error.code === "P2002" && error.meta?.target?.includes("only_one_open_shift_per_tenant")) {
      throw new Error("هناك وردية مفتوحة بالفعل. يجب إغلاقها أولاً.");
    }
    throw error;
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
