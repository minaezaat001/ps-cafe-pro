import { notFound } from "next/navigation";
import { getPublicMenuByDevice } from "@/app/actions";
import MenuClient from "./MenuClient";

export const dynamic = "force-dynamic";

export default async function CustomerMenuPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  const result = await getPublicMenuByDevice(deviceId);
  if (!result.success) {
    notFound();
  }

  return <MenuClient deviceId={deviceId} initial={result.data} />;
}
