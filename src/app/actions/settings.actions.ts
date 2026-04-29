"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getTenantWhereForRead } from "@/lib/tenant-scope";
import { createAuditLog } from "@/lib/audit";

import bcrypt from "bcryptjs";
import { requireAdminAsync, requireAuthUser } from "@/lib/action-guards";

function requireSettingsAccess() {
  return requireAuthUser().then((user) => {
    if (user.role !== "ADMIN" && !user.permissions?.includes("settings.manage")) {
      throw new Error("Forbidden");
    }
    return user;
  });
}

export async function clearBillingData() {
  await requireAdminAsync();

  await prisma.$transaction([
    prisma.financialTransaction.deleteMany(),
    prisma.order.deleteMany(),
    prisma.session.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.shift.deleteMany(),
  ]);

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/shift");
  revalidatePath("/finance");
  return { success: true };
}

export async function factoryReset() {
  const currentUser = await requireAdminAsync();

  await prisma.$transaction([
    prisma.sessionSegment.deleteMany(),
    prisma.order.deleteMany(),
    prisma.saleItem.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.session.deleteMany(),
    prisma.financialTransaction.deleteMany(),
    prisma.shift.deleteMany(),
    prisma.device.deleteMany(),
    prisma.deviceType.deleteMany(),
    prisma.inventoryItem.deleteMany(),
    prisma.appSetting.deleteMany(),
    prisma.user.deleteMany({
      where: { id: { not: currentUser.id } },
    }),
  ]);

  revalidatePath("/");
  revalidatePath("/devices");
  revalidatePath("/inventory");
  revalidatePath("/staff");
  revalidatePath("/reports");
  revalidatePath("/finance");
  revalidatePath("/settings");

  return { success: true };
}

export async function clearOldData(days: number) {
  await requireAdminAsync();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  await prisma.session.deleteMany({
    where: {
      endTime: {
        lt: cutoffDate,
      },
    },
  });

  await prisma.sale.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  await prisma.financialTransaction.deleteMany({
    where: {
      createdAt: {
        lt: cutoffDate,
      },
    },
  });

  await prisma.shift.deleteMany({
    where: {
      openedAt: {
        lt: cutoffDate,
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/finance");
  revalidatePath("/settings");
  revalidatePath("/shift");

  return { success: true };
}

export async function saveAppSetting(key: string, value: string) {
  try {
    await requireSettingsAccess();

    await prisma.appSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    revalidatePath("/", "layout");
    return { success: true };
  } catch (err: unknown) {
    console.error("Save AppSetting Error:", err);
    const message = err instanceof Error ? err.message : "Failed to save setting";
    throw new Error(message);
  }
}

export async function getAppSetting(key: string) {
  try {
    const setting = await prisma.appSetting.findUnique({ where: { key } });
    return setting?.value || null;
  } catch {
    return null;
  }
}

export async function getTenantSettings() {
  try {
    const tenantSettings = await prisma.tenantSettings.findFirst();
    if (!tenantSettings) {
      // Return default settings if not set
      return {
        currency: "EGP",
        currencySymbol: "ج.م",
        timezone: "Africa/Cairo"
      };
    }
    return tenantSettings;
  } catch {
    // Return default settings on error
    return {
      currency: "EGP",
      currencySymbol: "ج.م",
      timezone: "Africa/Cairo"
    };
  }
}

export async function updateTenantSettings(data: {
  currency?: string;
  currencySymbol?: string;
  timezone?: string;
  reason?: string;
}) {
  await requireSettingsAccess();
  const user = await requireAuthUser();

  // Get current settings for audit
  const currentSettings = await prisma.tenantSettings.findFirst();

  await prisma.tenantSettings.upsert({
    where: { tenantId: (await getTenantWhereForRead())?.tenantId || "" },
    update: {
      currency: data.currency,
      currencySymbol: data.currencySymbol,
      timezone: data.timezone,
    },
    create: {
      currency: data.currency || "EGP",
      currencySymbol: data.currencySymbol || "ج.م",
      timezone: data.timezone || "Africa/Cairo",
      tenantId: (await getTenantWhereForRead())?.tenantId || "",
    },
  });
  
  // Create audit log for settings change
  await createAuditLog({
    action: "CHANGE_SETTING",
    entityType: "TenantSettings",
    entityId: "tenant-settings",
    reason: data.reason || "Tenant settings updated",
    metadata: {
      updatedBy: user.id,
      previousSettings: currentSettings ? {
        currency: currentSettings.currency,
        currencySymbol: currentSettings.currencySymbol,
        timezone: currentSettings.timezone
      } : null,
      newSettings: data,
      timestamp: new Date().toISOString()
    }
  });
  
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/", "layout");
}



export async function getUsers() {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && !user.permissions?.includes("staff.manage")) {
    throw new Error("Forbidden");
  }
  return prisma.user.findMany();
}

export async function addUser(data: {
  username: string;
  password?: string;
  role: string;
  permissions?: string;
}) {
  await requireAdminAsync();

  if (!data.password?.trim()) {
    throw new Error("Password is required");
  }

  const { getJwtTenantId } = await import("@/lib/tenant-scope");
  const tenantId = (await getJwtTenantId()) || null;

  await prisma.user.create({
    data: {
      username: data.username,
      password: await bcrypt.hash(data.password, 10),
      role: data.role,
      permissions: data.permissions ?? "[]",
      tenantId,
    },
  });
  revalidatePath("/settings");
}

export async function updateUser(
  id: string,
  data: { username?: string; password?: string; role?: string; permissions?: string }
) {
  await requireAdminAsync();

  const payload: Record<string, unknown> = { ...data };
  if (data.password) {
    payload.password = await bcrypt.hash(data.password, 10);
  } else {
    delete payload.password;
  }
  await prisma.user.update({ where: { id }, data: payload as { username?: string; password?: string; role?: string; permissions?: string } });
  revalidatePath("/settings");
}

export async function deleteUser(id: string) {
  await requireAdminAsync();

  await prisma.user.delete({ where: { id } });
  revalidatePath("/settings");
}

export async function getAuditLogs(filters?: {
  action?: string;
  entityType?: string;
  startDate?: Date;
  endDate?: Date;
  userId?: string;
}) {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && !user.permissions?.includes("settings.manage")) {
    throw new Error("Forbidden");
  }

  const where: any = {};
  
  if (filters?.action) {
    where.action = filters.action;
  }
  
  if (filters?.entityType) {
    where.entityType = filters.entityType;
  }
  
  if (filters?.userId) {
    where.userId = filters.userId;
  }
  
  if (filters?.startDate && filters?.endDate) {
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: filters.startDate, lte: endOfDay };
  }
  
  // Apply tenant filter if applicable
  const tenantFilter = await getTenantWhereForRead();
  if (tenantFilter?.tenantId) {
    where.tenantId = tenantFilter.tenantId;
  }

  return prisma.auditLog.findMany({
    where,
    include: {
      user: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500, // Limit to last 500 entries
  });
}
