import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBillBreakdown } from '@/lib/billing';
import { getAuthJwtPayload } from '@/lib/tenant-guard';
import { getTenantWhereForRead } from '@/lib/tenant-scope';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Authenticate
    const jwt = await getAuthJwtPayload();
    if (!jwt) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantFilter = await getTenantWhereForRead();

    // Try Session first
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

    if (session) {
      // Tenant isolation
      if (Object.keys(tenantFilter).length > 0 && session.tenantId !== tenantFilter.tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const filteredOrders = (session.orders as any[]).filter(o => !o.isDeleted);
      const breakdown = getBillBreakdown(session as any, session.device as any, session.endTime ? new Date(session.endTime).getTime() : Date.now());
      
      return NextResponse.json({
        type: 'SESSION',
        id: session.id,
        device: { number: session.device.number, type: session.device.type },
        deviceRates: {
          hourlyRateSingle: session.device.hourlyRateSingle,
          hourlyRateMulti: session.device.hourlyRateMulti,
        },
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
        isMulti: session.isMulti,
        orders: filteredOrders.map((o) => ({
          name: o.inventoryItem?.name || 'Item',
          quantity: o.quantity,
          priceAtTime: o.priceAtTime,
        })),
        staff: session.endedByUser?.username || session.user?.username || '---',
        segments: breakdown.segments.map((seg: any) => ({
          deviceType: seg.deviceType,
          mode: seg.mode,
          cost: seg.cost,
          minutes: seg.cost > 0 ? -1 : 0,
        })),
        fallbackGaming: breakdown.gaming,
        fallbackSingle: breakdown.single,
        fallbackMulti: breakdown.multi,
        totalAmount: undefined,
      });
    }

    // Try Sale
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: { include: { inventoryItem: true } },
        user: { select: { username: true } },
      },
    });

    if (sale) {
      // Tenant isolation
      if (Object.keys(tenantFilter).length > 0 && sale.tenantId !== tenantFilter.tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      return NextResponse.json({
        type: 'SALE',
        id: sale.id,
        device: null,
        deviceRates: null,
        startTime: sale.createdAt.toISOString(),
        endTime: sale.createdAt.toISOString(),
        isMulti: false,
        orders: sale.items.map((i) => ({
          name: i.inventoryItem?.name || 'Item',
          quantity: i.quantity,
          priceAtTime: i.priceAtTime,
        })),
        staff: sale.user?.username || '---',
        segments: [],
        totalAmount: sale.totalAmount,
      });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Print API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
