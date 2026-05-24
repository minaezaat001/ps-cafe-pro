"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { decToNumber } from "@/lib/decimals";
import { getAppSetting } from "./settings.actions";
import { getTenantWhereForRead, requireWritableTenantContext } from "@/lib/tenant-scope";
import { requirePermissionAsync } from "@/lib/action-guards";
import { CustomerOrderSchema, OrderItemSchema, validateOrThrow } from "@/lib/validations";

export type CustomerMenuResult<T> = { success: true; data: T } | { success: false; message: string };

export async function getPublicMenuByDevice(
  deviceId: string
): Promise<
  CustomerMenuResult<{
    cafeName: string;
    deviceNumber: string;
    hasActiveSession: boolean;
    items: { id: string; name: string; category: string; price: number; stock: number }[];
  }>
> {
  try {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
    });
    if (!device) {
      return { success: false, message: "الجهاز غير موجود." };
    }

    const active = await prisma.session.findFirst({
      where: { deviceId, isActive: true },
      select: { id: true },
    });

    const items = await prisma.inventoryItem.findMany({
      where: {
        isActive: true,
        stock: { gt: 0 },
        ...(device.tenantId != null ? { tenantId: device.tenantId } : {}),
      },
      orderBy: { name: "asc" },
    });

    let cafeName = "PS Cafe";
    try {
      const name = await getAppSetting("CAFE_NAME");
      if (name) cafeName = name;
    } catch {
      /* ignore */
    }

    return {
      success: true,
      data: {
        cafeName,
        deviceNumber: device.number,
        hasActiveSession: !!active,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category,
          price: decToNumber(i.price),
          stock: i.stock,
        })),
      },
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر تحميل المنيو.";
    return { success: false, message: msg };
  }
}

export async function submitCustomerOrder(
  deviceId: string,
  cart: { itemId: string; quantity: number }[]
): Promise<{ success: true } | { success: false; message: string }> {
  try {
    validateOrThrow(CustomerOrderSchema, { deviceId, cart });

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device) {
      return { success: false, message: "الجهاز غير موجود." };
    }

    const session = await prisma.session.findFirst({
      where: { deviceId, isActive: true },
    });
    if (!session) {
      return {
        success: false,
        message: "لا توجد جلسة نشطة على هذا الجهاز. اطلب من الكاشير تشغيل الجهاز أولاً.",
      };
    }

    const shiftWhere: Prisma.ShiftWhereInput = {
      status: "OPEN",
      tenantId: device.tenantId ?? null,
    };
    const activeShift = await prisma.shift.findFirst({
      where: shiftWhere,
    });
    if (!activeShift) {
      return { success: false, message: "الكافيه مغلق حالياً للطلبات (لا توجد وردية مفتوحة)." };
    }

    const shiftId = session.shiftId ?? activeShift.id;

    await prisma.$transaction(async (tx) => {
      for (const line of cart) {
        if (line.quantity <= 0) continue;
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: line.itemId },
        });
        if (!inventoryItem || !inventoryItem.isActive) {
          throw new Error(`الصنف غير متوفر: ${line.itemId}`);
        }
        if (device.tenantId != null && inventoryItem.tenantId !== device.tenantId) {
          throw new Error("هذا الصنف غير متاح لهذا الفرع.");
        }
        if (inventoryItem.stock < line.quantity) {
          throw new Error(`الكمية غير كافية في المخزن لـ «${inventoryItem.name}». المتاح: ${inventoryItem.stock}`);
        }

        await tx.order.create({
          data: {
            sessionId: session.id,
            inventoryItemId: line.itemId,
            quantity: line.quantity,
            priceAtTime: inventoryItem.price,
            shiftId,
            tenantId: device.tenantId,
            status: "PENDING", // Wait for cashier confirmation
          },
        });

        // Stock deduction is removed here. It will happen when the cashier confirms the order.
      }
    });

    revalidatePath("/");
    revalidatePath("/inventory");
    revalidatePath("/cafeteria");

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر إرسال الطلب.";
    return { success: false, message: msg };
  }
}

export async function confirmPendingOrder(orderId: string): Promise<{ success: true } | { success: false; message: string }> {
  try {
    if (!orderId) throw new Error("معرف الطلب مطلوب");
    await requirePermissionAsync("cafeteria.manage");
    await requireWritableTenantContext();

    const order = await prisma.order.findFirst({ where: { id: orderId }, include: { inventoryItem: true } });
    if (!order) return { success: false, message: "الطلب غير موجود" };
    if (order.status !== "PENDING") return { success: false, message: "حالة الطلب لا تسمح بالتأكيد" };

    await prisma.$transaction(async (tx) => {
      // 1. Mark as DELIVERED
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" }
      });
      // 2. Atomic stock decrement with guard
      const updated = await tx.inventoryItem.updateMany({
        where: { id: order.inventoryItemId, stock: { gte: order.quantity } },
        data: { stock: { decrement: order.quantity } }
      });
      if (updated.count === 0) {
        throw new Error("الكمية غير كافية في المخزن");
      }
    });

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "حدث خطأ";
    return { success: false, message: msg };
  }
}

export async function cancelPendingOrder(orderId: string): Promise<{ success: true } | { success: false; message: string }> {
  try {
    if (!orderId) throw new Error("معرف الطلب مطلوب");
    await requirePermissionAsync("cafeteria.manage");
    await requireWritableTenantContext();

    const order = await prisma.order.findFirst({ where: { id: orderId } });
    if (!order) return { success: false, message: "الطلب غير موجود" };
    if (order.status !== "PENDING") return { success: false, message: "لا يمكن إلغاء طلب تم تنفيذه بالفعل" };

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" }
    });

    revalidatePath("/");
    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "حدث خطأ";
    return { success: false, message: msg };
  }
}

export async function getPendingOrders() {
  try {
    // Scope to the calling user's tenant so orders don't bleed across cafes.
    const tenantWhere = await getTenantWhereForRead().catch(() => ({}));

    const orders = await prisma.order.findMany({
      where: { status: "PENDING", isDeleted: false, ...tenantWhere },
      include: {
        inventoryItem: true,
        session: {
          include: { device: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, orders: orders.map(o => ({
      id: o.id,
      quantity: o.quantity,
      priceAtTime: Number(o.priceAtTime),
      status: o.status,
      inventoryItem: {
        id: o.inventoryItem.id,
        name: o.inventoryItem.name,
      },
      deviceNumber: o.session.device.number,
      deviceId: o.session.device.id,
      sessionId: o.session.id
    }))};
  } catch (e) {
    return { success: false, orders: [] };
  }
}
