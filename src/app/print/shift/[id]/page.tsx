import prisma from "@/lib/prisma";
import { calculateShiftSummary } from "@/app/actions";
import ShiftPrintClient from "./ShiftPrintClient";
import { notFound } from "next/navigation";
import { decToNumber } from "@/lib/decimals";

export default async function PrintShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const shift = await prisma.shift.findUnique({
    where: { id },
    include: {
      openedByUser: { select: { username: true } },
      closedByUser: { select: { username: true } },
      sessions: { include: { orders: true, device: true, segments: true } },
      sales: true,
    }
  });

  if (!shift) return notFound();

  let summary = null;
  try { summary = await calculateShiftSummary(id); } catch {}

  const shiftData = {
    id: shift.id,
    openedAt: shift.openedAt.toISOString(),
    closedAt: shift.closedAt?.toISOString() || null,
    status: shift.status,
    openedByUser: shift.openedByUser?.username || '—',
    closedByUser: shift.closedByUser?.username || null,
    openingFloat: decToNumber(shift.openingFloat),
    expectedCash: decToNumber(shift.expectedCash),
    actualCash: shift.actualCash != null ? decToNumber(shift.actualCash) : null,
    variance: shift.variance != null ? decToNumber(shift.variance) : null,
    notes: shift.notes || null,
    sessionCount: shift.sessions.filter((s: any) => !s.isActive).length,
  };

  return <ShiftPrintClient shiftData={shiftData} summary={summary} />;
}
