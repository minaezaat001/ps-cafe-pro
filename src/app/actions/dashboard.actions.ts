"use server";

import prisma from "@/lib/prisma";
import { requireAuthUser } from "@/lib/action-guards";
import { getTenantWhereForRead } from "@/lib/tenant-scope";
import {
  serializeDashboardDevice,
  snapshotRevision,
  type DashboardDeviceSnapshot,
} from "@/lib/dashboard-serialize";

export type DevicesSnapshotResult =
  | { success: true; devices: DashboardDeviceSnapshot[]; revision: string }
  | { success: false; error: string };

/**
 * Lightweight device + active session payload for dashboard polling (no stats queries).
 * Client compares `revision` to skip re-renders when nothing changed.
 */
export async function getDevicesSnapshotForDashboard(): Promise<DevicesSnapshotResult> {
  try {
    const user = await requireAuthUser();
    if (user.role !== "ADMIN" && !user.permissions?.includes("dashboard.manage")) {
      return { success: false, error: "Forbidden" };
    }

    const tenantFilter = await getTenantWhereForRead();
    const raw = await prisma.device.findMany({
      where: {
        ...(Object.keys(tenantFilter).length > 0 ? tenantFilter : {}),
      },
      orderBy: { number: "asc" },
      include: {
        sessions: {
          where: { isActive: true },
          include: {
            orders: { include: { inventoryItem: true } },
            segments: true,
            device: true,
          },
        },
      },
    });

    const devices = (raw as any[])
      .filter(d => !d.isDeleted)
      .map((d) => {
        // Filter out deleted orders from sessions
        if (d.sessions) {
          d.sessions.forEach((s: any) => {
            if (s.orders) {
              s.orders = s.orders.filter((o: any) => !o.isDeleted);
            }
          });
        }
        return serializeDashboardDevice(d);
      });
    return {
      success: true,
      devices,
      revision: snapshotRevision(devices),
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: msg };
  }
}
