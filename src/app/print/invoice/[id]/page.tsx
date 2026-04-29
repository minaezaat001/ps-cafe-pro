import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import PrintClient from './PrintClient';
import { decToNumber } from '@/lib/decimals';

export default async function PrintInvoicePage({ params, searchParams }: {
  params: { id: string };
  searchParams: { size?: string; source?: string };
}) {
  const { id } = await Promise.resolve(params);
  const resolvedSearch = await Promise.resolve(searchParams);
  const size = (resolvedSearch.size as 'THERMAL_80MM' | 'A4') || 'THERMAL_80MM';

  // Try to find a Session first
  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      device: true,
      orders: { include: { inventoryItem: true } },
      user: { select: { username: true } },
      endedByUser: { select: { username: true } },
      segments: true,
    },
  });

  // If not a session, try a cafeteria Sale
  let sale = null;
  if (!session) {
    sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { inventoryItem: true } },
        user: { select: { username: true } },
      },
    });
  }

  if (!session && !sale) {
    notFound();
  }

  const invoiceData = session
    ? {
        type: 'SESSION' as const,
        id: session.id,
        device: { number: session.device.number, type: session.device.type },
        deviceRates: {
          hourlyRateSingle: decToNumber(session.device.hourlyRateSingle),
          hourlyRateMulti: decToNumber(session.device.hourlyRateMulti),
        },
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
        isMulti: session.isMulti,
        orders: session.orders.map((o) => ({
          name: o.inventoryItem?.name || 'Item',
          quantity: o.quantity,
          priceAtTime: decToNumber(o.priceAtTime),
        })),
        staff: session.endedByUser?.username || session.user?.username || '---',
        segments: session.segments.map((seg) => ({
          deviceType: seg.deviceType,
          mode: seg.mode,
          cost: decToNumber(seg.cost),
          minutes: Math.round(seg.durationMins),
        })),
        totalAmount: undefined,
      }
    : {
        type: 'SALE' as const,
        id: sale!.id,
        device: null,
        deviceRates: null,
        startTime: sale!.createdAt.toISOString(),
        endTime: sale!.createdAt.toISOString(),
        isMulti: false,
        orders: sale!.items.map((i) => ({
          name: i.inventoryItem?.name || 'Item',
          quantity: i.quantity,
          priceAtTime: decToNumber(i.priceAtTime),
        })),
        staff: sale!.user?.username || '---',
        segments: [],
        totalAmount: decToNumber(sale!.totalAmount),
      };

  return <PrintClient invoiceData={invoiceData} paperSize={size} />;
}
