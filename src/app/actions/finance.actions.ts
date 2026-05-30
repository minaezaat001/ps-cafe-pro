"use server";

import type { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { revalidatePath } from "next/cache";
import { toDecimal } from "@/lib/decimals";
import { requirePermissionAsync, requireAdminAsync, requireAuthUser } from "@/lib/action-guards";
import { requireWritableTenantContext } from "@/lib/tenant-scope";
import { FT_SESSION_GAMING } from "@/lib/finance-constants";
import { createAuditLog } from "@/lib/audit";
import { getTenantWhereForRead, getJwtTenantId } from "@/lib/tenant-scope";
import { FinanceTransactionSchema, DeleteFinanceSchema, validateOrThrow } from "@/lib/validations";

export async function addFinancialTransaction(data: {
  type: "INCOME" | "EXPENSE";
  amount: number;
  description: string;
  reason: string;
}) {
  validateOrThrow(FinanceTransactionSchema, data);
  const user = await requirePermissionAsync("finance.manage");

  // Restrict STAFF users from adding EXPENSE without explicit permission
  if (data.type === "EXPENSE") {
    const hasExpensePermission = user.permissions?.includes("finance.expense") || user.role === "ADMIN";
    if (!hasExpensePermission) {
      throw new Error("You don't have permission to add expense transactions. Contact your admin.");
    }

  }

  const tenantId = (await getJwtTenantId()) || null;

  const shift = await prisma.shift.findFirst({
    where: {
      status: "OPEN",
      ...(tenantId ? { tenantId } : {}),
    },
  });
  if (!shift) {
    throw new Error("يجب فتح وردية الكاشير لربط المعاملة المالية بالوردية");
  }

  let transaction;
  await prisma.$transaction(async (tx) => {
    transaction = await tx.financialTransaction.create({
      data: {
        type: data.type,
        amount: toDecimal(data.amount),
        description: data.description,
        userId: user.id,
        shiftId: shift.id,
        tenantId,
      },
    });

    await createAuditLog({
      action: data.type === "INCOME" ? "ADD_INCOME" : "ADD_EXPENSE",
      entityType: "FinancialTransaction",
      entityId: transaction.id,
      reason: data.reason,
      metadata: {
        createdBy: user.id,
        transactionId: transaction.id,
        type: data.type,
        amount: data.amount,
        description: data.description,
        shiftId: shift.id,
        timestamp: new Date().toISOString()
      }
    }, tx);
  });

  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/");
}

export async function getFinancialTransactions(startDate?: Date, endDate?: Date) {
  const user = await requireAuthUser();
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.permissions?.includes("finance.manage")) {
    throw new Error("Forbidden");
  }

  const tenantId = (await getJwtTenantId()) || null;

  const where: Prisma.FinancialTransactionWhereInput = {
    type: { not: FT_SESSION_GAMING },
    ...(tenantId ? { tenantId } : {}),
  };

  if (startDate && endDate) {
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    where.createdAt = { gte: startDate, lte: endOfDay };
  }

  return prisma.financialTransaction.findMany({
    where,
    include: { user: true, shift: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteFinancialTransaction(id: string, reason: string = "Financial transaction deleted") {
  validateOrThrow(DeleteFinanceSchema, { id, reason });
  const user = await requireAdminAsync();
  await requireWritableTenantContext();

  const row = await prisma.financialTransaction.findFirst({ where: { id } });
  if (row?.type === FT_SESSION_GAMING) {
    throw new Error("Cannot delete automated session settlement records");
  }

  await prisma.$transaction(async (tx) => {
    await tx.financialTransaction.delete({ where: { id } });
    
    await createAuditLog({
      action: "DELETE_FINANCIAL_TRANSACTION",
      entityType: "FinancialTransaction",
      entityId: id,
      reason: reason,
      metadata: {
        deletedBy: user.id,
        transactionId: id,
        type: row?.type,
        amount: row ? parseFloat(row.amount.toString()) : 0,
        timestamp: new Date().toISOString()
      }
    }, tx);
  });
  
  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/");
}
