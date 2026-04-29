import { getAuthJwtPayload } from "@/lib/tenant-guard";
import prisma from "@/lib/prisma";

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
  | string;

export interface AuditLogData {
  action: AuditLogAction;
  entityType: string;
  entityId?: string;
  reason: string; // Mandatory justification
  metadata?: Record<string, any>;
}

export async function createAuditLog(data: AuditLogData) {
  try {
    const jwt = await getAuthJwtPayload();
    
    await prisma.auditLog.create({
      data: {
        userId: jwt?.id ?? "system",
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId || "unknown",
        reason: data.reason,
        metadata: data.metadata ? JSON.parse(JSON.stringify(data.metadata)) : undefined,
        tenantId: jwt?.tenantId ?? null,
      },
    });
  } catch (error) {
    // Don't let audit logging failures break the main operation
    console.error("Failed to create audit log:", error);
  }
}