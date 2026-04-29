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
          },
        });

        await tx.inventoryItem.update({
          where: { id: line.itemId },
          data: { stock: { decrement: line.quantity } },
        });
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
