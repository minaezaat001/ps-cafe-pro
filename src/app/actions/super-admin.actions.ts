"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./auth.actions";
import { revalidatePath } from "next/cache";

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

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { isSubscribed }
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
