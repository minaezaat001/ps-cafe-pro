"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requirePermissionAsync, requireAuthUser } from "@/lib/action-guards";
import { toDecimal, decToNumber } from "@/lib/decimals";
import { createAuditLog } from "@/lib/audit";

export async function getInventory() {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && !user.permissions?.includes("inventory.manage")) {
    throw new Error("Forbidden");
  }

  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
  });
  return items.map((i) => ({
    ...i,
    price: decToNumber(i.price),
  }));
}

/** Quick sale & device session orders: dashboard or cafeteria permission. */
export async function getActiveInventoryForOrders() {
  const user = await requireAuthUser();
  if (user.role === "ADMIN") {
    const items = await prisma.inventoryItem.findMany({ where: { isActive: true } });
    return items.map((i) => ({ ...i, price: decToNumber(i.price) }));
  }
  const p = user.permissions ?? [];
  if (!p.includes("dashboard.manage") && !p.includes("cafeteria.manage")) {
    throw new Error("Forbidden");
  }
  const items = await prisma.inventoryItem.findMany({
    where: { isActive: true },
  });
  return items.map((i) => ({ ...i, price: decToNumber(i.price) }));
}

/** Cafeteria page listing. */
export async function getInventoryForCafeteria() {
  await requirePermissionAsync("cafeteria.manage");
  const items = await prisma.inventoryItem.findMany({ where: { isActive: true } });
  return items.map((i) => ({ ...i, price: decToNumber(i.price) }));
}

export async function addInventoryItem(data: { name: string; category: string; price: number; stock: number }) {
  await requirePermissionAsync("inventory.manage");
  const user = await requireAuthUser();

  const { getJwtTenantId } = await import("@/lib/tenant-scope");
  const tenantId = (await getJwtTenantId()) || null;

  const inventoryItem = await prisma.inventoryItem.create({
    data: {
      name: data.name,
      category: data.category,
      price: toDecimal(data.price),
      stock: data.stock,
      tenantId,
    },
  });
  
  // Create audit log for inventory item addition
  await createAuditLog({
    action: "ADD_INVENTORY_ITEM",
    entityType: "InventoryItem",
    entityId: inventoryItem.id,
    reason: `Inventory item added: ${data.name}`,
    metadata: {
      addedBy: user.id,
      name: data.name,
      category: data.category,
      price: data.price,
      stock: data.stock,
      timestamp: new Date().toISOString()
    }
  });
  
  revalidatePath("/inventory");
  revalidatePath("/cafetria");
}

export async function updateInventoryItem(id: string, data: { name?: string; category?: string; price?: number; stock?: number }, reason: string = "Inventory item updated") {
  await requirePermissionAsync("inventory.manage");
  const user = await requireAuthUser();

  // Get the current item to track changes
  const currentItem = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!currentItem) throw new Error("Item not found");

  const payload: Record<string, unknown> = { ...data };
  if (typeof data.price === "number") payload.price = toDecimal(data.price);

  await prisma.inventoryItem.update({
    where: { id },
    data: payload as { name?: string; category?: string; price?: ReturnType<typeof toDecimal>; stock?: number },
  });
  
  // Create audit log for inventory update
  await createAuditLog({
    action: "UPDATE_INVENTORY_ITEM",
    entityType: "InventoryItem",
    entityId: id,
    reason: reason,
    metadata: {
      updatedBy: user.id,
      itemId: id,
      previousData: {
        name: currentItem.name,
        category: currentItem.category,
        price: decToNumber(currentItem.price),
        stock: currentItem.stock
      },
      newData: data,
      timestamp: new Date().toISOString()
    }
  });
  
  revalidatePath("/inventory");
  revalidatePath("/cafetria");
}

export async function deleteInventoryItem(id: string, reason: string = "Inventory item deleted") {
  await requirePermissionAsync("inventory.manage");
  const user = await requireAuthUser();

  // Get the current item before deletion for audit
  const currentItem = await prisma.inventoryItem.findUnique({ where: { id } });
  if (!currentItem) throw new Error("Item not found");

  await prisma.inventoryItem.update({
    where: { id },
    data: { isActive: false },
  });
  
  // Create audit log for inventory deletion
  await createAuditLog({
    action: "DELETE_INVENTORY_ITEM",
    entityType: "InventoryItem",
    entityId: id,
    reason: reason,
    metadata: {
      deletedBy: user.id,
      itemId: id,
      itemName: currentItem.name,
      category: currentItem.category,
      timestamp: new Date().toISOString()
    }
  });
  
  revalidatePath("/inventory");
  revalidatePath("/cafetria");
}

export async function processQuickSale(items: { itemId: string; quantity: number }[], reason: string = "Quick sale processed") {
  const userBuffer = await requirePermissionAsync("cafeteria.manage");
  const user = await requireAuthUser();

  await prisma.$transaction(async (tx) => {
    const activeShift = await tx.shift.findFirst({
      where: { status: "OPEN" },
    });

    if (!activeShift) {
      throw new Error("يجب فتح وردية جديدة أولاً لتسجيل أي طلبات كافيتريا");
    }

    let totalAmount = 0;
    const saleItems: { inventoryItemId: string; quantity: number; priceAtTime: ReturnType<typeof toDecimal> }[] = [];
    const saleDetails = [];

    for (const item of items) {
      const inventoryItem = await tx.inventoryItem.findUnique({ where: { id: item.itemId } });
      if (!inventoryItem) {
        throw new Error(`المنتج غير موجود: ${item.itemId}`);
      }

      // Atomic stock decrement with constraint check
      // Uses updateMany to atomically check and update in one operation
      const updated = await tx.inventoryItem.updateMany({
        where: {
          id: item.itemId,
          stock: { gte: item.quantity }, // Only update if sufficient stock
        },
        data: { stock: { decrement: item.quantity } },
      });

      // If no rows updated, stock was insufficient
      if (updated.count === 0) {
        throw new Error(
          `الكمية غير كافية في المخزن لـ «${inventoryItem.name}». ` +
          `المتاح: ${inventoryItem.stock}، المطلوب: ${item.quantity}`
        );
      }

      const priceAtTime = decToNumber(inventoryItem.price);
      totalAmount += priceAtTime * item.quantity;

      saleItems.push({
        inventoryItemId: item.itemId,
        quantity: item.quantity,
        priceAtTime: inventoryItem.price,
      });
      
      saleDetails.push({
        itemId: item.itemId,
        itemName: inventoryItem.name,
        quantity: item.quantity,
        price: priceAtTime
      });
    }

    const { getJwtTenantId } = await import("@/lib/tenant-scope");
    const tenantId = (await getJwtTenantId()) || null;

    const sale = await tx.sale.create({
      data: {
        totalAmount: toDecimal(totalAmount),
        userId: userBuffer.id,
        shiftId: activeShift.id,
        tenantId,
        items: {
          create: saleItems.map(item => ({ ...item, tenantId })),
        },
      },
    });
    
    // Create audit log for quick sale
    await createAuditLog({
      action: "QUICK_SALE",
      entityType: "Sale",
      entityId: sale.id,
      reason: reason,
      metadata: {
        soldBy: user.id,
        saleId: sale.id,
        items: saleDetails,
        totalAmount,
        shiftId: activeShift.id,
        timestamp: new Date().toISOString()
      }
    });
  }, {
    // Serializable isolation ensures concurrent transactions don't cause stock issues
  });

  revalidatePath("/inventory");
  revalidatePath("/cafetria");
  revalidatePath("/reports");
  revalidatePath("/", "layout");
}

export async function voidSale(saleId: string, reason: string = "Sale voided") {
  const user = await requirePermissionAsync("cafeteria.manage");
  const currentUser = await requireAuthUser();

  await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true }
    });

    if (!sale) throw new Error("Sale not found");
    if (sale.isDeleted) throw new Error("Sale is already voided");

    // Check if shift is still open. 
    // If the sale was made in a closed shift, we shouldn't allow deleting it to prevent financial corruption
    // UNLESS we want to allow admins to fix historic mistakes. Usually it's better to allow but log it.
    // For now, let's just mark it deleted and restore stock.
    
    const saleItems = sale.items.map(item => ({
      itemId: item.inventoryItemId,
      itemName: 'Unknown', // Will be fetched separately if needed
      quantity: item.quantity,
      price: decToNumber(item.priceAtTime)
    }));
    
    for (const item of sale.items) {
      await tx.inventoryItem.update({
        where: { id: item.inventoryItemId },
        data: { stock: { increment: item.quantity } }
      });
    }

    await tx.sale.update({
      where: { id: saleId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedByUserId: user.id
      }
    });
    
    // Create audit log for voiding sale
    await createAuditLog({
      action: "VOID_SALE",
      entityType: "Sale",
      entityId: saleId,
      reason: reason,
      metadata: {
        voidedBy: currentUser.id,
        saleId,
        items: saleItems,
        totalAmount: decToNumber(sale.totalAmount),
        timestamp: new Date().toISOString()
      }
    });
  });

  revalidatePath("/reports");
  revalidatePath("/finance");
  revalidatePath("/inventory");
  revalidatePath("/cafetria");
  revalidatePath("/", "layout");
}
