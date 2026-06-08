import { getAuthJwtPayload } from "@/lib/tenant-guard";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditLogAction =
  | "DELETE_ORDER"
  | "ADJUST_INVENTORY"
  | "CHANGE_PRICE"
  | "ADD_EXPENSE"
  | "ADD_INCOME"
  | "CREATE_USER"
  | "UPDATE_USER"
  | "DELETE_USER"
  | "CHANGE_SETTING"
  | "START_SHIFT"
  | "END_SHIFT"
  | "OPEN_SHIFT"
  | "CLOSE_SHIFT"
  | "DELETE_DEVICE"
  | "UPDATE_DEVICE_TYPE"
  | "DELETE_DEVICE_TYPE"
  | "TOGGLE_TENANT_SUBSCRIPTION"
  | "STOP_IMPERSONATION"
  | "DELETE_TENANT"
  | string;

export interface AuditLogData {
  action: AuditLogAction;
  entityType: string;
  entityId?: string;
  reason: string; // Mandatory justification
  metadata?: Record<string, any>;
}

type TxLike = { auditLog: { create: (args: any) => Promise<any> } };

export async function createAuditLog(data: AuditLogData, tx?: TxLike) {
  try {
    const jwt = await getAuthJwtPayload();
    const db = tx ?? prisma;
    
    await db.auditLog.create({
      data: {
        userId: jwt?.id ?? "system",
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || "unknown",
        reason: data.reason,
        metadata: data.metadata ? JSON.stringify(data.metadata) : undefined,
        tenantId: jwt?.tenantId ?? null,
      },
    });
  } catch (error) {
    // Don't let audit logging failures break the main operation
    console.error("Failed to create audit log:", error);
  }
}