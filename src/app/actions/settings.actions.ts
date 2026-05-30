"use server";

import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { getTenantWhereForRead, requireWritableTenantContext, getJwtTenantId } from "@/lib/tenant-scope";
import { createAuditLog } from "@/lib/audit";
import { SaveAppSettingSchema, UpdateTenantSettingsSchema, AddUserSchema, UpdateUserSchema, ClearOldDataSchema, validateOrThrow } from "@/lib/validations";

import bcrypt from "bcryptjs";
import { requireAdminAsync, requireAuthUser } from "@/lib/action-guards";

function requireSettingsAccess() {
  return requireAuthUser().then((user) => {
    if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("settings.manage")) {
      throw new Error("Forbidden");
    }
    return user;
  });
}

export async function clearBillingData() {
  const user = await requireAdminAsync();

  // Scope to own tenant for ADMIN; SUPER_ADMIN spans all
  const whereFilter = user.role === "SUPER_ADMIN" ? {} : { tenantId: user.tenantId };

  await prisma.$transaction([
    prisma.financialTransaction.deleteMany({ where: whereFilter }),
    prisma.order.deleteMany({ where: whereFilter }),
    prisma.session.deleteMany({ where: whereFilter }),
    prisma.saleItem.deleteMany({ where: whereFilter }),
    prisma.sale.deleteMany({ where: whereFilter }),
    prisma.shift.deleteMany({ where: whereFilter }),
  ]);

  await createAuditLog({
    action: "CLEAR_BILLING_DATA",
    entityType: "System",
    entityId: "billing",
    reason: `Billing data cleared by ${user.username}`,
    metadata: { performedBy: user.id, role: user.role, tenantId: user.tenantId, timestamp: new Date().toISOString() },
  });

  revalidatePath("/");
  revalidatePath("/reports");
  revalidatePath("/shift");
  revalidatePath("/finance");
  return { success: true };
}

export async function factoryReset() {
  const currentUser = await requireAdminAsync();

  const whereFilter = currentUser.role === "SUPER_ADMIN" ? {} : { tenantId: currentUser.tenantId };
  const tenantWhere = currentUser.role === "SUPER_ADMIN" ? {} : { tenantId: currentUser.tenantId };

  await prisma.$transaction([
    prisma.sessionSegment.deleteMany({ where: whereFilter }),
    prisma.order.deleteMany({ where: whereFilter }),
    prisma.saleItem.deleteMany({ where: whereFilter }),
    prisma.sale.deleteMany({ where: whereFilter }),
    prisma.session.deleteMany({ where: whereFilter }),
    prisma.financialTransaction.deleteMany({ where: whereFilter }),
    prisma.shift.deleteMany({ where: whereFilter }),
    prisma.device.deleteMany({ where: whereFilter }),
    prisma.deviceType.deleteMany({ where: whereFilter }),
    prisma.inventoryItem.deleteMany({ where: whereFilter }),
    prisma.appSetting.deleteMany({ where: whereFilter }),
    prisma.user.deleteMany({
      where: { ...tenantWhere, id: { not: currentUser.id } },
    }),
  ]);

  await createAuditLog({
    action: "FACTORY_RESET",
    entityType: "System",
    entityId: "factory",
    reason: `Factory reset by ${currentUser.username}`,
    metadata: { performedBy: currentUser.id, role: currentUser.role, tenantId: currentUser.tenantId, timestamp: new Date().toISOString() },
  });

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
  validateOrThrow(ClearOldDataSchema, { days });
  const user = await requireAdminAsync();

  const tenantFilter = user.role === "SUPER_ADMIN" ? {} : { tenantId: user.tenantId };

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  await prisma.session.deleteMany({
    where: {
      ...tenantFilter,
      endTime: { lt: cutoffDate },
    },
  });

  await prisma.sale.deleteMany({
    where: {
      ...tenantFilter,
      createdAt: { lt: cutoffDate },
    },
  });

  await prisma.financialTransaction.deleteMany({
    where: {
      ...tenantFilter,
      createdAt: { lt: cutoffDate },
    },
  });

  await prisma.shift.deleteMany({
    where: {
      ...tenantFilter,
      openedAt: { lt: cutoffDate },
    },
  });

  await createAuditLog({
    action: "CLEAR_OLD_DATA",
    entityType: "System",
    entityId: "cleanup",
    reason: `Old data (${days} days) cleared by ${user.username}`,
    metadata: { performedBy: user.id, role: user.role, tenantId: user.tenantId, cutoffDate: cutoffDate.toISOString() },
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
    validateOrThrow(SaveAppSettingSchema, { key, value });
    const user = await requireSettingsAccess();
    await requireWritableTenantContext();

    await prisma.$transaction(async (tx) => {
      await tx.appSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      });
      await createAuditLog({
        action: "CHANGE_SETTING",
        entityType: "AppSetting",
        entityId: key,
        reason: `Setting changed: ${key}`,
        metadata: { changedBy: user.id, key, oldValue: undefined, newValue: value, timestamp: new Date().toISOString() },
      }, tx);
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
  validateOrThrow(UpdateTenantSettingsSchema, data);
  await requireSettingsAccess();
  await requireWritableTenantContext();
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
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("staff.manage")) {
    throw new Error("Forbidden");
  }
  return prisma.user.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
  });
}

export async function addUser(data: {
  username: string;
  password?: string;
  role: string;
  permissions?: string;
}) {
  validateOrThrow(AddUserSchema, data);
  const currentUser = await requireAdminAsync();

  if (data.role === "SUPER_ADMIN") {
    throw new Error("Cannot create a Super Admin account");
  }

  if (!data.password?.trim()) {
    throw new Error("Password is required");
  }

  const passwordHash = await bcrypt.hash(data.password!, 10);
  await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        username: data.username,
        password: passwordHash,
        role: data.role,
        permissions: data.permissions ?? "[]",
      },
    });
    await createAuditLog({
      action: "CREATE_USER",
      entityType: "User",
      entityId: newUser.id,
      reason: `User created: ${data.username}`,
      metadata: { createdBy: currentUser.id, username: data.username, role: data.role, timestamp: new Date().toISOString() },
    }, tx);
  });
  revalidatePath("/settings");
}

export async function updateUser(
  id: string,
  data: { username?: string; password?: string; role?: string; permissions?: string }
) {
  validateOrThrow(UpdateUserSchema, data);
  const currentUser = await requireAdminAsync();
  await requireWritableTenantContext();

  // Prevent changing a user to SUPER_ADMIN or modifying SUPER_ADMIN accounts
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("User not found");
  }
  if (existing.role === "SUPER_ADMIN") {
    throw new Error("Cannot modify a Super Admin account");
  }
  if (data.role === "SUPER_ADMIN") {
    throw new Error("Cannot set role to Super Admin");
  }

  const updatePayload: Record<string, unknown> = { ...data };
  if (data.password) {
    updatePayload.password = await bcrypt.hash(data.password, 10);
  } else {
    delete updatePayload.password;
  }
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: updatePayload as any });
    await createAuditLog({
      action: "UPDATE_USER",
      entityType: "User",
      entityId: id,
      reason: `User updated: ${data.username || existing?.username || id}`,
      metadata: { updatedBy: currentUser.id, userId: id, changes: data, timestamp: new Date().toISOString() },
    }, tx);
  });
  revalidatePath("/settings");
}

export async function deleteUser(id: string) {
  const currentUser = await requireAdminAsync();
  await requireWritableTenantContext();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("User not found");
  }
  if (existing.role === "SUPER_ADMIN") {
    throw new Error("Cannot delete a Super Admin account");
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.delete({ where: { id } });
    await createAuditLog({
      action: "DELETE_USER",
      entityType: "User",
      entityId: id,
      reason: `User deleted: ${existing?.username || id}`,
      metadata: { deletedBy: currentUser.id, userId: id, timestamp: new Date().toISOString() },
    }, tx);
  });
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
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("settings.manage")) {
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
