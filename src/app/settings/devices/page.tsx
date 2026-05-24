import { getCurrentUser, getDeviceTypes } from "@/app/actions";
import DevicesClient from "./DevicesClient";
import prisma from "@/lib/db";
import { decToNumber } from "@/lib/decimals";

export const dynamic = "force-dynamic";

export default async function DevicesManagerPage() {
  const user = await getCurrentUser();
  const rawDevices = await prisma.device.findMany({
    orderBy: { number: 'asc' }
  });
  
  const devices = (rawDevices as any[])
    .filter(d => !d.isDeleted)
    .map(d => ({
      ...d,
      hourlyRateSingle: decToNumber(d.hourlyRateSingle),
      hourlyRateMulti: decToNumber(d.hourlyRateMulti),
    }));

  const deviceTypes = await getDeviceTypes();

  return <DevicesClient initialDevices={devices} deviceTypes={deviceTypes} user={user} />;
}
