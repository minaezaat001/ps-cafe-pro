import { getDashboardData, getDeviceTypes, getActiveShift, getCurrentUser } from "./actions";
import DashboardClient from "./DashboardClient";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { serializeDashboardDevice, snapshotRevision, serializeShift } from "@/lib/dashboard-serialize";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role === 'SUPER_ADMIN' && !user.isImpersonating) {
    redirect('/super-admin/dashboard');
  }

  const { devices: rawDevices } = await getDashboardData();
  const devices = rawDevices.map((d) =>
    serializeDashboardDevice(d as Parameters<typeof serializeDashboardDevice>[0])
  );
  const initialRevision = snapshotRevision(devices);

  const deviceTypes = await getDeviceTypes();
  const activeShift = serializeShift(await getActiveShift());

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const appBaseUrl =
    host ? `${proto}://${host}` : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <DashboardClient
      initialDevices={devices}
      initialRevision={initialRevision}
      deviceTypes={deviceTypes}
      activeShift={activeShift}
      appBaseUrl={appBaseUrl}
      showDeviceQr={user?.role === "ADMIN"}
      initialServerTime={Date.now()}
    />
  );
}
