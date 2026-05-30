"use server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "./auth.actions";
import { revalidatePath } from "next/cache";

export type AnnouncementData = {
  id: string;
  message: string;
  type: string;
  createdAt: string;
  createdBy: string;
};

/** SUPER_ADMIN only — creates a new announcement (global or tenant-specific). */
export async function createAnnouncement(message: string, type: string = "INFO", tenantId?: string) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SUPER_ADMIN') {
    throw new Error("Forbidden: only super admins can broadcast announcements");
  }

  if (!message.trim()) {
    throw new Error("Announcement message cannot be empty");
  }

  const allowedTypes = ["INFO", "WARNING", "UPDATE"];
  if (!allowedTypes.includes(type)) {
    throw new Error(`Invalid type. Allowed: ${allowedTypes.join(", ")}`);
  }

  await prisma.systemAnnouncement.create({
    data: {
      message: message.trim(),
      type,
      createdBy: user.username,
      tenantId: tenantId || null,
    },
  });

  revalidatePath("/super-admin/dashboard");
}

/** Accessible by all authenticated users — returns active announcements (global + tenant-specific). */
export async function getActiveAnnouncements(): Promise<AnnouncementData[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  const announcements = await prisma.systemAnnouncement.findMany({
    where: {
      isActive: true,
      OR: [
        { tenantId: null },            // global broadcasts
        { tenantId: user.tenantId },   // targeted to this tenant
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return announcements.map((a) => ({
    id: a.id,
    message: a.message,
    type: a.type,
    createdAt: a.createdAt.toISOString(),
    createdBy: a.createdBy,
  }));
}

/** Any user can dismiss an announcement (dismissal stored in localStorage by the client). */
export async function dismissAnnouncement(id: string) {
  const user = await getCurrentUser();
  if (!user) return;
}
