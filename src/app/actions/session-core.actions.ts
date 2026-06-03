"use server";

import prisma from "@/lib/db";
import { requirePermissionAsync } from "@/lib/action-guards";

export async function pingSession(sessionId: string) {
  await requirePermissionAsync("dashboard.manage");
  await prisma.session.update({
    where: { id: sessionId },
    data: { lastHeartbeat: new Date() },
  });
}
