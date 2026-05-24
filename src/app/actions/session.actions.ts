"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { calculateSessionTimeCost, calculateActualElapsedCost, getBillBreakdown } from "@/lib/billing";
import { requirePermissionAsync, requireAuthUser } from "@/lib/action-guards";
import { getJwtTenantId, getTenantWhereForRead, requireWritableTenantContext } from "@/lib/tenant-scope";
import { createAuditLog } from "@/lib/audit";
import { getAppSetting } from "@/app/actions/settings.actions";
import { toDecimal, decToNumber } from "@/lib/decimals";
import { FT_SESSION_GAMING } from "@/lib/finance-constants";
import { StartSessionSchema, EndSessionSchema, AddSessionTimeSchema, CartSchema, OrderItemSchema, validateOrThrow } from "@/lib/validations";

async function findOpenShift() {
  const tenantFilter = await getTenantWhereForRead();
  return prisma.shift.findFirst({
    where: { status: "OPEN", ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}) },
  });
}

export async function startSession(
  deviceId: string,
  type: "OPEN" | "FIXED",
  durationMinutes?: number,
  isMulti: boolean = false
) {
  validateOrThrow(StartSessionSchema, { deviceId, type, durationMinutes, isMulti });
  await requirePermissionAsync("dashboard.manage");
  await requireWritableTenantContext();
  const user = await requireAuthUser();

  const activeShift = await findOpenShift();
  if (!activeShift) {
    throw new Error("يجب فتح وردية جديدة أولاً لبدء الجلسات");
  }

  // Atomic check-and-create to prevent double-booking
  const jwtTenantId = await getJwtTenantId();
  
  try {
    await prisma.$transaction(async (tx) => {
      // Lock the device row by reading it within transaction
      const device = await tx.device.findUnique({
        where: { id: deviceId },
        include: { sessions: { where: { isActive: true } } },
      });

      if (!device) {
        throw new Error("Device not found");
      }

      // Double-check: device must not have any active sessions
      if (device.sessions.length > 0) {
        throw new Error(
          `الجهاز مشغول بالفعل في جلسة أخرى (رقم الجلسة: ${device.sessions[0].id.slice(0, 8)})`
        );
      }

      const now = new Date();
      const tenantForSession = device.tenantId ?? jwtTenantId;
      await tx.session.create({
        data: {
          deviceId,
          userId: user.id,
          type,
          durationMinutes,
          isMulti,
          isActive: true,
          startTime: now,
          lastRateChangeTime: now,
          shiftId: activeShift.id,
          ...(tenantForSession ? { tenantId: tenantForSession } : {}),
        },
      });
    }, {
      // SQLite default isolation is SERIALIZABLE, which prevents concurrent writes
    });
  } catch (error: any) {
    // Re-throw our custom error messages
    if (error.message?.includes("الجهاز مشغول")) {
      throw error;
    }
    // If it's a Prisma unique constraint error (if we had one), handle it
    if (error.code === "P2002") {
      throw new Error("الجهاز مشغول بالفعل في جلسة أخرى");
    }
    throw error;
  }

  revalidatePath("/");
}

export async function endSession(sessionId: string, reason: string = "Session ended") {
  validateOrThrow(EndSessionSchema, { sessionId, reason });
  await requirePermissionAsync("dashboard.manage");
  await requireWritableTenantContext();
  const userBuffer = await requireAuthUser();

  await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { device: true },
    });

    if (!session) {
      throw new Error("Session not found");
    }
    if (!session.isActive) {
      throw new Error("Session is already closed");
    }

    const tenantFilter = await getTenantWhereForRead();
    const currentShift = await tx.shift.findFirst({
      where: {
        status: "OPEN",
        ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}),
      },
    });

    if (!currentShift) {
      throw new Error("يجب فتح وردية جديدة أولاً لتتمكن من إغلاق الجلسات وتحصيل الحساب");
    }

    const now = new Date();
    const gamingBreakdown = getBillBreakdown(
      session,
      session.device,
      now.getTime()
    );
    const currentSegmentActualCost = calculateActualElapsedCost(session, session.device, now.getTime());

    if (
      currentSegmentActualCost > 0 ||
      now.getTime() - new Date(session.lastRateChangeTime).getTime() > 60000
    ) {
      await tx.sessionSegment.create({
        data: {
          sessionId,
          deviceName: session.device.number,
          deviceType: session.device.type,
          mode: session.isMulti ? "MULTI" : "SINGLE",
          startTime: new Date(session.lastRateChangeTime),
          endTime: now,
          durationMins: (now.getTime() - new Date(session.lastRateChangeTime).getTime()) / 60000,
          cost: toDecimal(currentSegmentActualCost),
          tenantId: session.tenantId,
        },
      });
    }

    await tx.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        endTime: now,
        lastRateChangeTime: now,
        endedByUserId: userBuffer.id,
        accumulatedTimeCost: toDecimal(gamingBreakdown.gaming),
        accumulatedSingleCost: toDecimal(gamingBreakdown.single),
        accumulatedMultiCost: toDecimal(gamingBreakdown.multi),
        shiftId: currentShift.id,
      },
    });

    const collectedAmount = toDecimal(gamingBreakdown.total);
    await tx.financialTransaction.create({
      data: {
        type: FT_SESSION_GAMING,
        amount: collectedAmount,
        description: `Session settlement · ${sessionId} · device #${session.device.number}`,
        userId: userBuffer.id,
        shiftId: currentShift.id,
        tenantId: session.tenantId,
      },
    });
    
    // Create audit log for session ending
    await createAuditLog({
      action: "END_SESSION",
      entityType: "Session",
      entityId: sessionId,
      reason: reason,
      metadata: {
        endedBy: userBuffer.id,
        sessionId,
        deviceId: session.deviceId,
        gamingCost: gamingBreakdown.gaming,
        itemsCost: gamingBreakdown.items,
        totalCollected: gamingBreakdown.total,
        timestamp: new Date().toISOString()
      }
    });
  });

  revalidatePath("/");
  revalidatePath("/reports");
}

export async function toggleSessionMode(sessionId: string, reason: string = "Session mode toggled") {
  await requirePermissionAsync("dashboard.manage");
  await requireWritableTenantContext();
  const user = await requireAuthUser();

  await prisma.$transaction(async (tx) => {
    const session = await tx.session.findUnique({
      where: { id: sessionId },
      include: { device: true },
    });
    if (!session || !session.isActive) return;

    const now = new Date();
    const currentSegmentActualCost = calculateActualElapsedCost(session, session.device, now.getTime());

    if (
      currentSegmentActualCost > 0 ||
      now.getTime() - new Date(session.lastRateChangeTime).getTime() > 60000
    ) {
      await tx.sessionSegment.create({
        data: {
          sessionId,
          deviceName: session.device.number,
          deviceType: session.device.type,
          mode: session.isMulti ? "MULTI" : "SINGLE",
          startTime: new Date(session.lastRateChangeTime),
          endTime: now,
          durationMins: (now.getTime() - new Date(session.lastRateChangeTime).getTime()) / 60000,
          cost: toDecimal(currentSegmentActualCost),
          tenantId: session.tenantId,
        },
      });
    }

    await tx.session.update({
      where: { id: sessionId },
      data: {
        isMulti: !session.isMulti,
        accumulatedTimeCost: toDecimal(
          decToNumber(session.accumulatedTimeCost) + currentSegmentActualCost
        ),
        accumulatedSingleCost: toDecimal(
          !session.isMulti
            ? decToNumber(session.accumulatedSingleCost) + currentSegmentActualCost
            : decToNumber(session.accumulatedSingleCost)
        ),
        accumulatedMultiCost: toDecimal(
          session.isMulti
            ? decToNumber(session.accumulatedMultiCost) + currentSegmentActualCost
            : decToNumber(session.accumulatedMultiCost)
        ),
        lastRateChangeTime: now,
      },
    });
    
    // Create audit log for session mode toggle
    await createAuditLog({
      action: "TOGGLE_SESSION_MODE",
      entityType: "Session",
      entityId: sessionId,
      reason: reason,
      metadata: {
        changedBy: user.id,
        sessionId,
        previousMode: session.isMulti ? 'MULTI' : 'SINGLE',
        newMode: !session.isMulti ? 'MULTI' : 'SINGLE',
        timestamp: new Date().toISOString()
      }
    });
  });

  revalidatePath("/");
}

export async function addSessionTime(sessionId: string, additionalMinutes: number, reason: string = "Session time extended") {
  validateOrThrow(AddSessionTimeSchema, { sessionId, additionalMinutes, reason });
  await requirePermissionAsync("dashboard.manage");
  await requireWritableTenantContext();
  const user = await requireAuthUser();

  const session = await prisma.session.findFirst({
    where: { id: sessionId },
  });
  if (!session || !session.isActive || session.type !== "FIXED") {
    throw new Error("Only active fixed sessions can be extended");
  }

  await prisma.session.update({
    where: { id: sessionId },
    data: {
      durationMinutes: (session.durationMinutes || 0) + additionalMinutes,
    },
  });
  
  // Create audit log for session time extension
  await createAuditLog({
    action: "EXTEND_SESSION_TIME",
    entityType: "Session",
    entityId: sessionId,
    reason: reason,
    metadata: {
      extendedBy: user.id,
      sessionId,
      additionalMinutes,
      newDuration: (session.durationMinutes || 0) + additionalMinutes,
      timestamp: new Date().toISOString()
    }
  });

  revalidatePath("/");
}

export async function removeOrderFromSession(orderId: string, reason: string = "Order deleted without justification") {
  await requirePermissionAsync("dashboard.manage");
  await requireWritableTenantContext();
  const user = await requireAuthUser();

  await prisma.$transaction(async (tx) => {
    // Lock the order and its session
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { session: true },
    });

    if (!order) {
      throw new Error("الطلب غير موجود.");
    }

    // Cannot delete orders from ended sessions (already paid)
    if (!order.session.isActive) {
      throw new Error(
        "لا يمكن حذف الطلب - الجلسة مغلقة بالفعل وتم تحصيل قيمتها. " +
        "يرجى إنشاء معاملة مالية منفصلة للاسترداد."
      );
    }

    // Cannot delete already deleted orders
    if (order.isDeleted) {
      throw new Error("الطلب محذوف بالفعل.");
    }

    // Restore stock atomically
    await tx.inventoryItem.update({
      where: { id: order.inventoryItemId },
      data: { stock: { increment: order.quantity } },
    });

    // Soft delete the order (preserves financial record for audit)
    await tx.order.update({
      where: { id: orderId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: user.id,
      },
    });
     
    // Create audit log for order deletion
    await createAuditLog({
      action: "DELETE_ORDER",
      entityType: "Order",
      entityId: orderId,
      reason: reason,
      metadata: {
        deletedBy: user.id,
        orderId,
        timestamp: new Date().toISOString()
      }
    });
  });
}

export async function addOrderToSession(
  sessionId: string,
  items: { itemId: string; quantity: number }[],
  reason: string = "Order added to session"
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    validateOrThrow(CartSchema, items);
    await requirePermissionAsync("dashboard.manage");
    await requireWritableTenantContext();
    const user = await requireAuthUser();

    await prisma.$transaction(async (tx) => {
      const tenantFilter = await getTenantWhereForRead();
      const activeShift = await tx.shift.findFirst({
        where: {
          status: "OPEN",
          ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}),
        },
      });

      if (!activeShift) {
        throw new Error("يجب فتح وردية الكاشير أولاً لإضافة طلبات للجلسة");
      }

      const session = await tx.session.findUnique({ where: { id: sessionId } });
      if (!session) {
        throw new Error("الجلسة غير موجودة.");
      }

      const shiftId = session.shiftId ?? activeShift.id;
      const orderDetails = [];
      
      for (const item of items) {
        const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
        if (!inventoryItem) {
          throw new Error(`الصنف غير موجود في المينو (${item.itemId}).`);
        }

        // Atomic stock check and decrement - prevents race condition
        const updated = await tx.inventoryItem.updateMany({
          where: {
            id: item.itemId,
            stock: { gte: item.quantity },
          },
          data: { stock: { decrement: item.quantity } },
        });

        if (updated.count === 0) {
          throw new Error(
            `الكمية غير كافية في المخزن لـ «${inventoryItem.name}». المتاح: ${inventoryItem.stock}`
          );
        }

        await tx.order.create({
          data: {
            sessionId,
            inventoryItemId: item.itemId,
            quantity: item.quantity,
            priceAtTime: inventoryItem.price,
            shiftId,
            tenantId: session.tenantId,
          },
        });
        
        orderDetails.push({
          itemId: item.itemId,
          itemName: inventoryItem.name,
          quantity: item.quantity,
          price: inventoryItem.price
        });
      }
      
      // Create audit log for adding orders to session
      await createAuditLog({
        action: "ADD_ORDER_TO_SESSION",
        entityType: "Session",
        entityId: sessionId,
        reason: reason,
        metadata: {
          addedBy: user.id,
          sessionId,
          orders: orderDetails,
          timestamp: new Date().toISOString()
        }
      });
    });
    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/cafeteria");
    revalidatePath("/", "layout");
    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "تعذر إضافة الطلب للجلسة.";
    return { success: false, message };
  }
}

export async function transferSession(currentSessionId: string, targetDeviceId: string, reason: string = "Session transferred to another device") {
  await requirePermissionAsync("dashboard.manage");
  await requireWritableTenantContext();
  const user = await requireAuthUser();

  await prisma.$transaction(async (tx) => {
    const activeTargetSession = await tx.session.findFirst({
      where: { deviceId: targetDeviceId, isActive: true },
    });
    if (activeTargetSession) throw new Error("Target device is not available");

    const session = await tx.session.findUnique({
      where: { id: currentSessionId },
      include: { device: true },
    });
    if (!session || !session.isActive) return;

    const now = new Date();
    const currentSegmentActualCost = calculateActualElapsedCost(session, session.device, now.getTime());

    if (
      currentSegmentActualCost > 0 ||
      now.getTime() - new Date(session.lastRateChangeTime).getTime() > 60000
    ) {
      await tx.sessionSegment.create({
        data: {
          sessionId: currentSessionId,
          deviceName: session.device.number,
          deviceType: session.device.type,
          mode: session.isMulti ? "MULTI" : "SINGLE",
          startTime: new Date(session.lastRateChangeTime),
          endTime: now,
          durationMins: (now.getTime() - new Date(session.lastRateChangeTime).getTime()) / 60000,
          cost: toDecimal(currentSegmentActualCost),
          tenantId: session.tenantId,
        },
      });
    }

    await tx.session.update({
      where: { id: currentSessionId },
      data: {
        deviceId: targetDeviceId,
        accumulatedTimeCost: toDecimal(
          decToNumber(session.accumulatedTimeCost) + currentSegmentActualCost
        ),
        accumulatedSingleCost: toDecimal(
          !session.isMulti
            ? decToNumber(session.accumulatedSingleCost) + currentSegmentActualCost
            : decToNumber(session.accumulatedSingleCost)
        ),
        accumulatedMultiCost: toDecimal(
          session.isMulti
            ? decToNumber(session.accumulatedMultiCost) + currentSegmentActualCost
            : decToNumber(session.accumulatedMultiCost)
        ),
        lastRateChangeTime: now,
      },
    });
    
    // Create audit log for session transfer
    await createAuditLog({
      action: "TRANSFER_SESSION",
      entityType: "Session",
      entityId: currentSessionId,
      reason: reason,
      metadata: {
        transferredBy: user.id,
        sessionId: currentSessionId,
        fromDeviceId: session.deviceId,
        fromDeviceNumber: session.device.number,
        toDeviceId: targetDeviceId,
        timestamp: new Date().toISOString()
      }
    });
  });

  revalidatePath("/");
}
