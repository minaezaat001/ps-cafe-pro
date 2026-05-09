"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decToNumber } from "@/lib/decimals";
import { getAppSetting } from "./settings.actions";

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
    if (!cart.length) {
      return { success: false, message: "السلة فارغة." };
    }

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
    revalidatePath("/cafetria");

    return { success: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "تعذر إرسال الطلب.";
    return { success: false, message: msg };
  }
}

export async function confirmPendingOrder(orderId: string): Promise<{ success: true } | { success: false; message: string }> {
  try {
    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { inventoryItem: true } });
    if (!order) return { success: false, message: "الطلب غير موجود" };
    if (order.status !== "PENDING") return { success: false, message: "حالة الطلب لا تسمح بالتأكيد" };
    if (order.inventoryItem.stock < order.quantity) {
      return { success: false, message: `الكمية غير كافية في المخزن. المتاح: ${order.inventoryItem.stock}` };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark as DELIVERED
      await tx.order.update({
        where: { id: orderId },
        data: { status: "DELIVERED" }
      });
      // 2. Deduct stock
      await tx.inventoryItem.update({
        where: { id: order.inventoryItemId },
        data: { stock: { decrement: order.quantity } }
      });
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
    const order = await prisma.order.findUnique({ where: { id: orderId } });
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
    const orders = await prisma.order.findMany({
      where: { status: "PENDING", isDeleted: false },
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
