"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./auth.actions";
import { createAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FT_SESSION_GAMING } from "@/lib/finance-constants";

export type GlobalSystemStats = {
  activeSessions: number;
  todayRevenue: number;
  openShiftCount: number;
  overdueShifts: {
    shiftId: string;
    tenantId: string;
    tenantName: string;
    openedAt: string;
    openedBy: string;
    hoursOpen: number;
  }[];
  totalTenants: number;
  subscribedTenants: number;
  staleTenants: number; // trial expired and not subscribed
};

export async function getGlobalSystemStats(): Promise<GlobalSystemStats> {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Unauthorized access");
  }

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Run all queries in parallel
  const [activeSessions, todayRevenueAgg, openShiftCount, overdueShiftsData, totalTenants, subscribedTenants, staleTenants] =
    await Promise.all([
      prisma.session.count({
        where: { isActive: true },
      }),

      prisma.financialTransaction.aggregate({
        where: {
          type: FT_SESSION_GAMING,
          createdAt: { gte: startOfToday },
        },
        _sum: { amount: true },
      }),

      prisma.shift.count({
        where: { status: "OPEN" },
      }),

      prisma.shift.findMany({
        where: {
          status: "OPEN",
          openedAt: { lt: twentyFourHoursAgo },
        },
        include: {
          tenant: { select: { id: true, name: true } },
          openedByUser: { select: { username: true } },
        },
        orderBy: { openedAt: "asc" },
      }),

      prisma.tenant.count(),

      prisma.tenant.count({
        where: { isSubscribed: true },
      }),

      prisma.tenant.count({
        where: {
          isSubscribed: false,
          trialEndDate: { lt: now },
        },
      }),
    ]);

  return {
    activeSessions,
    todayRevenue: todayRevenueAgg._sum.amount
      ? parseFloat(todayRevenueAgg._sum.amount.toString())
      : 0,
    openShiftCount,
    overdueShifts: overdueShiftsData.map((s) => ({
      shiftId: s.id,
      tenantId: s.tenant?.id ?? "",
      tenantName: s.tenant?.name ?? "Unknown",
      openedAt: s.openedAt.toISOString(),
      openedBy: s.openedByUser?.username ?? "Unknown",
      hoursOpen: Math.round(
        (now.getTime() - s.openedAt.getTime()) / (1000 * 60 * 60)
      ),
    })),
    totalTenants,
    subscribedTenants,
    staleTenants,
  };
}

export async function getAllTenants() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Unauthorized access");
  }

  return await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          users: true,
          devices: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

export async function toggleTenantSubscription(tenantId: string, isSubscribed: boolean) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Unauthorized access");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  await prisma.$transaction(async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: { isSubscribed }
    });
    await createAuditLog({
      action: "TOGGLE_TENANT_SUBSCRIPTION",
      entityType: "Tenant",
      entityId: tenantId,
      reason: `Tenant subscription ${isSubscribed ? "enabled" : "disabled"}`,
      metadata: { superAdminId: user.id, tenantId, tenantName: tenant?.name, isSubscribed, timestamp: new Date().toISOString() },
    }, tx);
  });

  revalidatePath('/super-admin/dashboard');
}

export async function updateTenantTrial(tenantId: string, days: number) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Unauthorized access");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant not found");

  const newEndDate = new Date();
  newEndDate.setDate(newEndDate.getDate() + days);

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { 
      trialEndDate: newEndDate,
      isSubscribed: false // Ensure they are on trial
    }
  });

  revalidatePath('/super-admin/dashboard');
}

export async function impersonateTenant(tenantId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Forbidden: فقط السوبر ادمن يمكنه استخدام هذه الخاصية");
  }

  // Verify the tenant exists
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // Set impersonation cookie (5 minute expiry as a safety bound)
  const cookieStore = await cookies();
  cookieStore.set("impersonated_tenant_id", tenantId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60, // 1 hour safety bound (refreshed on each page load)
    path: "/",
    sameSite: 'lax',
  });

  // Audit log
  await createAuditLog({
    action: "IMPERSONATE_TENANT",
    entityType: "Tenant",
    entityId: tenantId,
    reason: `Super Admin ${user.username} started impersonating tenant ${tenant.name}`,
    metadata: {
      superAdminId: user.id,
      superAdminUsername: user.username,
      tenantId,
      tenantName: tenant.name,
      tenantEmail: tenant.email,
      timestamp: new Date().toISOString(),
    },
  });

  redirect("/");
}

export async function stopImpersonation() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Forbidden");
  }

  // Log before deleting cookie (we can still read the impersonated tenant ID)
  const cookieStore = await cookies();
  const impersonatedTenantId = cookieStore.get("impersonated_tenant_id")?.value;

  if (impersonatedTenantId) {
    await createAuditLog({
      action: "STOP_IMPERSONATION",
      entityType: "Tenant",
      entityId: impersonatedTenantId,
      reason: `Super Admin ${user.username} stopped impersonating tenant`,
      metadata: {
        superAdminId: user.id,
        superAdminUsername: user.username,
        tenantId: impersonatedTenantId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  cookieStore.delete("impersonated_tenant_id");

  redirect("/super-admin/dashboard");
}

export async function deleteTenant(tenantId: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Unauthorized access");
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

  // Use a transaction to ensure all related data is cleaned up properly if needed
  // Prisma Cascade delete should handle most of it if configured in schema
  await prisma.$transaction(async (tx) => {
    await tx.tenant.delete({
      where: { id: tenantId }
    });
    await createAuditLog({
      action: "DELETE_TENANT",
      entityType: "Tenant",
      entityId: tenantId,
      reason: `Tenant deleted: ${tenant?.name || tenantId}`,
      metadata: { superAdminId: user.id, tenantId, tenantName: tenant?.name, timestamp: new Date().toISOString() },
    }, tx);
  });

  revalidatePath('/super-admin/dashboard');
}
