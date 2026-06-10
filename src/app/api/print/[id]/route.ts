import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getBillBreakdown } from '@/lib/billing';
import { getAuthJwtPayload } from '@/lib/tenant-guard';
import { getTenantWhereForRead } from '@/lib/tenant-scope';
import { format } from 'date-fns';

function buildThermalReceipt(data: any, cafeName: string): string {
  const invNum = data.id.slice(-8).toUpperCase();
  const printDate = format(new Date(data.endTime || data.startTime), 'dd/MM/yyyy HH:mm');
  const startTime = format(new Date(data.startTime), 'HH:mm');
  const endTime = data.endTime ? format(new Date(data.endTime), 'HH:mm') : '';

  const cafeteriaCost = data.orders?.reduce((s: number, o: any) => s + Number(o.priceAtTime) * o.quantity, 0) || 0;
  const gamingCost = data.type === 'SESSION' ? (Number(data.fallbackGaming) || 0) : 0;
  const grandTotal = data.type === 'SALE' && data.totalAmount != null ? Number(data.totalAmount) : gamingCost + cafeteriaCost;

  const ordersHtml = data.orders?.length
    ? data.orders.map((o: any) =>
        `<tr><td style="padding:2px 4px;font-size:11px;">${o.name} ×${o.quantity}</td><td style="padding:2px 4px;font-size:11px;text-align:right;">${(Number(o.priceAtTime) * o.quantity).toFixed(2)}</td></tr>`
      ).join('')
    : '';

  const isRTL = data.lang === 'ar';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Receipt ${invNum}</title>
<style>
  @page { size: 80mm auto; margin: 3mm 4mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px; color: #000; background: #fff;
    width: 72mm; padding: 8px;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  table { width: 100%; border-collapse: collapse; }
  td, th { font-size: 11px; font-weight: normal; }
  .c { text-align: center; }
  .r { text-align: right; }
  .l { text-align: left; }
  .b { font-weight: bold; }
  hr { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  .h { border-top: 2px solid #000; }
</style>
</head>
<body${isRTL ? ' dir="rtl"' : ''}>

<div class="c" style="margin-bottom:6px;">
  <div style="font-size:16px;font-weight:900;letter-spacing:2px;">${cafeName}</div>
  <div style="font-size:11px;margin-top:2px;">━━━━━━━━━━━━━━━━━━━━</div>
  <div style="font-size:11px;font-weight:bold;">INVOICE / فاتورة</div>
</div>

<hr/>

<table>
  <tr><td style="font-size:11px;"># INV-${invNum}</td><td style="font-size:11px;text-align:right;">${printDate}</td></tr>
  ${data.staff ? `<tr><td style="font-size:11px;">Staff / موظف</td><td style="font-size:11px;text-align:right;font-weight:bold;">${data.staff}</td></tr>` : ''}
  ${data.device ? `<tr><td style="font-size:11px;">Device / جهاز</td><td style="font-size:11px;text-align:right;font-weight:bold;">${data.device.number} — ${data.device.type}</td></tr>` : ''}
  ${data.type === 'SESSION' ? `
  <tr><td style="font-size:11px;">Time / الوقت</td><td style="font-size:11px;text-align:right;font-weight:bold;">${startTime} → ${endTime}</td></tr>
  <tr><td style="font-size:11px;">Mode / النوع</td><td style="font-size:11px;text-align:right;font-weight:bold;">${data.isMulti ? 'Multi / متعدد' : 'Single / فردي'}</td></tr>` : ''}
</table>

<hr/>

${gamingCost > 0 ? `
<div style="font-weight:bold;font-size:11px;margin:3px 0;">Gaming Time / وقت اللعب</div>
<table>
  ${data.segments?.map((seg: any) => `
    <tr><td style="font-size:11px;padding:1px 4px;">${seg.deviceType} (${seg.mode === 'SINGLE' ? 'Single' : 'Multi'})</td>
    <td style="font-size:11px;text-align:right;padding:1px 4px;">${Number(seg.cost).toFixed(2)}</td></tr>
  `).join('') || ''}
</table>` : ''}

${ordersHtml ? `
<div style="font-weight:bold;font-size:11px;margin:3px 0;">${data.type === 'SESSION' ? 'Cafeteria / الكافتيريا' : 'Items / الأصناف'}</div>
<table>${ordersHtml}</table>` : ''}

<hr class="h"/>

<div class="c" style="margin:4px 0;">
  <div style="font-size:11px;font-weight:bold;">TOTAL / الإجمالي</div>
  <div style="font-size:18px;font-weight:900;letter-spacing:2px;margin:2px 0;">
    ${grandTotal.toFixed(2)} <span style="font-size:10px;">EGP</span>
  </div>
</div>

<hr/>

<div class="c" style="font-size:11px;margin-top:6px;">
  <div>${isRTL ? 'شكراً لزيارتكم' : 'Thank you for visiting'}</div>
  <div style="margin-top:2px;opacity:0.5;font-size:10px;">PS Cafe Pro</div>
</div>

</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');

  try {
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
      if (Object.keys(tenantFilter).length > 0 && session.tenantId !== tenantFilter.tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const filteredOrders = (session.orders as any[]).filter(o => !o.isDeleted);
      const breakdown = getBillBreakdown(session as any, session.device as any, session.endTime ? new Date(session.endTime).getTime() : Date.now());

      // Try to get cafe name from app settings
      let cafeName = 'PS CAFE PRO';
      try {
        const setting = await prisma.appSetting.findFirst({
          where: { key: 'CAFE_NAME' },
        });
        if (setting?.value) cafeName = setting.value.toUpperCase();
      } catch {}

      if (format === 'html') {
        const data = {
          type: 'SESSION',
          id: session.id,
          device: { number: session.device.number, type: session.device.type },
          startTime: session.startTime.toISOString(),
          endTime: session.endTime?.toISOString() || null,
          isMulti: session.isMulti,
          orders: filteredOrders.map((o: any) => ({
            name: o.inventoryItem?.name || 'Item',
            quantity: o.quantity,
            priceAtTime: Number(o.priceAtTime),
          })),
          staff: session.endedByUser?.username || session.user?.username || '---',
          segments: breakdown.segments.map((seg: any) => ({
            deviceType: seg.deviceType,
            mode: seg.mode,
            cost: Number(seg.cost),
          })),
          fallbackGaming: breakdown.gaming,
          fallbackSingle: breakdown.single,
          fallbackMulti: breakdown.multi,
          lang: jwt.username?.includes('ar') ? 'ar' : 'en',
        };
        return new NextResponse(buildThermalReceipt(data, cafeName), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return NextResponse.json({
        type: 'SESSION',
        id: session.id,
        device: { number: session.device.number, type: session.device.type },
        deviceRates: {
          hourlyRateSingle: Number(session.device.hourlyRateSingle),
          hourlyRateMulti: Number(session.device.hourlyRateMulti),
        },
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
        isMulti: session.isMulti,
        orders: filteredOrders.map((o: any) => ({
          name: o.inventoryItem?.name || 'Item',
          quantity: o.quantity,
          priceAtTime: Number(o.priceAtTime),
        })),
        staff: session.endedByUser?.username || session.user?.username || '---',
        segments: breakdown.segments.map((seg: any) => ({
          deviceType: seg.deviceType,
          mode: seg.mode,
          cost: Number(seg.cost),
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
      if (Object.keys(tenantFilter).length > 0 && sale.tenantId !== tenantFilter.tenantId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      let cafeName = 'PS CAFE PRO';
      try {
        const setting = await prisma.appSetting.findFirst({
          where: { key: 'CAFE_NAME' },
        });
        if (setting?.value) cafeName = setting.value.toUpperCase();
      } catch {}

      if (format === 'html') {
        const data = {
          type: 'SALE',
          id: sale.id,
          device: null,
          startTime: sale.createdAt.toISOString(),
          endTime: sale.createdAt.toISOString(),
          isMulti: false,
          orders: sale.items.map((i: any) => ({
            name: i.inventoryItem?.name || 'Item',
            quantity: i.quantity,
            priceAtTime: Number(i.priceAtTime),
          })),
          staff: sale.user?.username || '---',
          segments: [],
          totalAmount: Number(sale.totalAmount),
          lang: jwt.username?.includes('ar') ? 'ar' : 'en',
        };
        return new NextResponse(buildThermalReceipt(data, cafeName), {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      return NextResponse.json({
        type: 'SALE',
        id: sale.id,
        device: null,
        deviceRates: null,
        startTime: sale.createdAt.toISOString(),
        endTime: sale.createdAt.toISOString(),
        isMulti: false,
        orders: sale.items.map((i: any) => ({
          name: i.inventoryItem?.name || 'Item',
          quantity: i.quantity,
          priceAtTime: Number(i.priceAtTime),
        })),
        staff: sale.user?.username || '---',
        segments: [],
        totalAmount: Number(sale.totalAmount),
      });
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('Print API error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
