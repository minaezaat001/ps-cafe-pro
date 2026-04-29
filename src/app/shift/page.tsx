import { getActiveShift, tryCalculateShiftSummary, getShiftHistory, getCurrentUser } from "@/app/actions";
import { serializeShift } from "@/lib/dashboard-serialize";
import ShiftClient from "./ShiftClient";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function ShiftPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const [activeShift, shiftHistory] = await Promise.all([
    getActiveShift(),
    getShiftHistory(15),
  ]);

  let summary = null;
  if (activeShift) {
    summary = await tryCalculateShiftSummary(activeShift.id);
  }

  const serializedActiveShift = serializeShift(activeShift);
  const serializedShiftHistory = shiftHistory.map(h => serializeShift(h)).filter(Boolean);

  return <ShiftClient activeShift={serializedActiveShift} summary={summary} shiftHistory={serializedShiftHistory} />;
}
