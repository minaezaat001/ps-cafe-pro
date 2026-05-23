"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import path from "path";
import fs from "fs/promises";
import { requirePermissionAsync, requireAdminAsync, requireAuthUser } from "@/lib/action-guards";
import { createAuditLog } from "@/lib/audit";
import { toDecimal } from "@/lib/decimals";

export async function addDevice(data: {
  number: string;
  type: string;
  hourlyRateSingle: number;
  hourlyRateMulti: number;
}) {
  await requirePermissionAsync("devices.manage");

  const { getJwtTenantId } = await import("@/lib/tenant-scope");
  const tenantId = (await getJwtTenantId()) || null;

  await prisma.device.create({
    data: {
      number: data.number,
      type: data.type,
      hourlyRateSingle: toDecimal(data.hourlyRateSingle),
      hourlyRateMulti: toDecimal(data.hourlyRateMulti),
      tenantId,
    },
  });
  revalidatePath("/");
  revalidatePath("/devices");
}

export async function downloadDatabase() {
  await requireAdminAsync();

  const dbPath = path.join(process.cwd(), "prisma", "dev.db");
  const backupPath = path.join(process.cwd(), "prisma", `backup-${Date.now()}.db`);

  try {
    // Use SQLite's native backup mechanism (VACUUM INTO) for consistency
    // This creates a clean, consistent snapshot without locking issues
    await prisma.$queryRaw`VACUUM INTO ${backupPath}`;

    // Read the consistent backup file
    const data = await fs.readFile(backupPath);

    // Clean up temporary backup file
    await fs.unlink(backupPath).catch(() => {
      // Ignore cleanup errors
    });

    return { data: Array.from(new Uint8Array(data)), filename: `ps-cafe-backup-${new Date().toISOString().split('T')[0]}.db` };
  } catch (error) {
    // Fallback: direct file copy with warning (for older SQLite versions)
    console.warn("VACUUM INTO failed, falling back to direct copy:", error);
    const data = await fs.readFile(dbPath);
    return { data: Array.from(new Uint8Array(data)), filename: `ps-cafe-backup-${new Date().toISOString().split('T')[0]}.db` };
  }
}

export async function getDeviceTypes() {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN") {
    const p = user.permissions ?? [];
    if (!p.includes("devices.manage") && !p.includes("dashboard.manage")) {
      throw new Error("Forbidden");
    }
  }

  let types = await prisma.deviceType.findMany();

  if (types.length === 0) {
    await prisma.deviceType.createMany({
      data: [
        { name: "PS5", color: "blue", icon: "Gamepad2" },
        { name: "PS4", color: "violet", icon: "Gamepad2" },
        { name: "PRIVATE", color: "amber", icon: "Monitor" },
      ],
    });
    types = await prisma.deviceType.findMany();
  }
  return types;
}

export async function addDeviceType(data: { name: string; color: string; icon: string }) {
  await requirePermissionAsync("devices.manage");

  const { getJwtTenantId } = await import("@/lib/tenant-scope");
  const tenantId = (await getJwtTenantId()) || null;

  const existing = await prisma.deviceType.findFirst({ where: { name: data.name, tenantId: tenantId ?? undefined } });
  if (existing) throw new Error("A device type with this name already exists");

  await prisma.deviceType.create({ data: { ...data, tenantId } });
  revalidatePath("/");
  revalidatePath("/devices");
}

export async function deleteDeviceType(id: string) {
  const user = await requirePermissionAsync("devices.manage");

  const typeObj = await prisma.deviceType.findUnique({ where: { id } });
  if (!typeObj) throw new Error("Type not found / النوع غير موجود");

  const activeDevices = await prisma.device.findFirst({ where: { type: typeObj.name } });
  if (activeDevices) {
    throw new Error(
      `لا يمكن مسح هذا النوع لأنه مستخدم بالفعل مع أجهزة قائمة / Cannot delete this type because it is currently assigned to existing devices.`
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.deviceType.delete({ where: { id } });
      await createAuditLog({
        action: "DELETE_DEVICE_TYPE",
        entityType: "DeviceType",
        entityId: id,
        reason: `Device type deleted: ${typeObj.name}`,
        metadata: { deletedBy: user.id, typeName: typeObj.name, timestamp: new Date().toISOString() },
      }, tx);
    });
  } catch (err: any) {
    // Catch Prisma foreign key constraint errors (P2003, P2014)
    if (err?.code === 'P2003' || err?.code === 'P2014' || err?.message?.includes('Foreign key constraint')) {
      throw new Error(
        `لا يمكن مسح هذا النوع لأنه مستخدم بالفعل مع أجهزة قائمة / Cannot delete this type because it is currently assigned to existing devices.`
      );
    }
    throw new Error(
      `حدث خطأ أثناء الحذف. حاول مرة أخرى / An error occurred while deleting. Please try again.`
    );
  }

  revalidatePath("/");
  revalidatePath("/devices");
}

export async function updateDeviceType(id: string, data: { name: string; color: string; icon: string }) {
  const user = await requirePermissionAsync("devices.manage");

  const oldType = await prisma.deviceType.findUnique({ where: { id } });
  if (!oldType) throw new Error("Type not found");

  await prisma.$transaction(async (tx) => {
    if (oldType.name !== data.name) {
      const exists = await tx.deviceType.findFirst({ where: { name: data.name } });
      if (exists) throw new Error("Type name already in use");

      await tx.device.updateMany({
        where: { type: oldType.name },
        data: { type: data.name },
      });
    }

    await tx.deviceType.update({
      where: { id },
      data,
    });

    await createAuditLog({
      action: "UPDATE_DEVICE_TYPE",
      entityType: "DeviceType",
      entityId: id,
      reason: `Device type updated: ${oldType.name}`,
      metadata: { updatedBy: user.id, typeId: id, old: oldType, new: data, timestamp: new Date().toISOString() },
    }, tx);
  });

  revalidatePath("/");
  revalidatePath("/devices");
}

import { calculateActualElapsedCost } from "@/lib/billing";
import { decToNumber } from "@/lib/decimals";

export async function updateDevice(
  id: string,
  data: {
    number?: string;
    type?: string;
    hourlyRateSingle?: number;
    hourlyRateMulti?: number;
  }
) {
  await requirePermissionAsync("devices.manage");

  await prisma.$transaction(async (tx) => {
    const oldDevice = await tx.device.findUnique({
      where: { id },
      include: {
        sessions: {
          where: { isActive: true },
        },
      },
    });

    if (!oldDevice) return;

    // Check if rates are changing
    const rateChanged =
      (data.hourlyRateSingle !== undefined && data.hourlyRateSingle !== decToNumber(oldDevice.hourlyRateSingle)) ||
      (data.hourlyRateMulti !== undefined && data.hourlyRateMulti !== decToNumber(oldDevice.hourlyRateMulti));

    if (rateChanged && oldDevice.sessions.length > 0) {
      const now = new Date();
      for (const session of oldDevice.sessions) {
        // Compute cost with old rate
        const currentSegmentActualCost = calculateActualElapsedCost(
          session as any,
          oldDevice as any,
          now.getTime()
        );

        if (
          currentSegmentActualCost > 0 ||
          now.getTime() - new Date(session.lastRateChangeTime).getTime() > 60000
        ) {
          await tx.sessionSegment.create({
            data: {
              sessionId: session.id,
              deviceName: oldDevice.number,
              deviceType: oldDevice.type,
              mode: session.isMulti ? "MULTI" : "SINGLE",
              startTime: new Date(session.lastRateChangeTime),
              endTime: now,
              durationMins: (now.getTime() - new Date(session.lastRateChangeTime).getTime()) / 60000,
              cost: toDecimal(currentSegmentActualCost),
            },
          });

          await tx.session.update({
            where: { id: session.id },
            data: {
              accumulatedTimeCost: toDecimal(decToNumber(session.accumulatedTimeCost) + currentSegmentActualCost),
              accumulatedSingleCost: toDecimal(
                !session.isMulti ? decToNumber(session.accumulatedSingleCost) + currentSegmentActualCost : decToNumber(session.accumulatedSingleCost)
              ),
              accumulatedMultiCost: toDecimal(
                session.isMulti ? decToNumber(session.accumulatedMultiCost) + currentSegmentActualCost : decToNumber(session.accumulatedMultiCost)
              ),
              lastRateChangeTime: now,
            },
          });
        }
      }
    }

    const payload: any = {};
    if (data.number !== undefined) payload.number = data.number;
    if (data.type !== undefined) payload.type = data.type;
    if (typeof data.hourlyRateSingle === "number") payload.hourlyRateSingle = toDecimal(data.hourlyRateSingle);
    if (typeof data.hourlyRateMulti === "number") payload.hourlyRateMulti = toDecimal(data.hourlyRateMulti);

    await tx.device.update({ where: { id }, data: payload });

    // Audit log for device changes
    const currentUser = await requireAuthUser();
    const changeDetails: Record<string, { old: unknown; new: unknown }> = {};
    if (data.number !== undefined) changeDetails.number = { old: oldDevice.number, new: data.number };
    if (data.type !== undefined) changeDetails.type = { old: oldDevice.type, new: data.type };
    if (typeof data.hourlyRateSingle === "number") changeDetails.hourlyRateSingle = { old: decToNumber(oldDevice.hourlyRateSingle), new: data.hourlyRateSingle };
    if (typeof data.hourlyRateMulti === "number") changeDetails.hourlyRateMulti = { old: decToNumber(oldDevice.hourlyRateMulti), new: data.hourlyRateMulti };
    await createAuditLog({
      action: "UPDATE_DEVICE",
      entityType: "Device",
      entityId: id,
      reason: "Device settings updated",
      metadata: {
        updatedBy: currentUser.id,
        deviceId: id,
        changes: changeDetails,
        timestamp: new Date().toISOString(),
      },
    }, tx);
  });

  revalidatePath("/");
  revalidatePath("/devices");
}

export async function deleteDevice(id: string) {
  const user = await requirePermissionAsync("devices.manage");

  const device = await prisma.device.findUnique({
    where: { id },
    include: { sessions: { take: 1 } }
  });

  if (!device) throw new Error("الجهاز غير موجود.");

  await prisma.$transaction(async (tx) => {
    // If it has history (sessions), we SOFT delete it
    if (device.sessions.length > 0) {
      await (tx.device as any).update({ where: { id }, data: { isDeleted: true } });
    } else {
      // If it's a new device with no history, we can HARD delete it
      await tx.device.delete({ where: { id } });
    }

    await createAuditLog({
      action: "DELETE_DEVICE",
      entityType: "Device",
      entityId: id,
      reason: `Device deleted: #${device.number}`,
      metadata: { deletedBy: user.id, deviceId: id, deviceNumber: device.number, hardDelete: device.sessions.length === 0, timestamp: new Date().toISOString() },
    }, tx);
  });
  
  revalidatePath("/");
  revalidatePath("/devices");
}
