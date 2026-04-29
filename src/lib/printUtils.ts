/**
 * printUtils.ts
 * ─────────────────────────────────────────────────────────
 * Silent printing via hidden iframe — no new tab is opened.
 * Works for both SESSION and SALE invoice types.
 */

import { PrintSettings } from './usePrintSettings';
import { format } from 'date-fns';

interface Order {
  name: string;
  quantity: number;
  priceAtTime: number;
}

interface Segment {
  deviceType: string;
  mode: string;
  cost: number;
  minutes: number;
}

interface InvoiceData {
  type: 'SESSION' | 'SALE';
  id: string;
  device: { number: string; type: string } | null;
  deviceRates: { hourlyRateSingle: number; hourlyRateMulti: number } | null;
  startTime: string;
  endTime: string | null;
  isMulti: boolean;
  orders: Order[];
  staff: string;
  segments: Segment[];
  fallbackGaming?: number;
  fallbackSingle?: number;
  fallbackMulti?: number;
  totalAmount?: number;
}

// ─────────────────────────────────────────────────────────
// Build receipt HTML string
// ─────────────────────────────────────────────────────────
function buildReceiptHtml(data: InvoiceData, settings: PrintSettings): string {
  const isThermal = settings.paperSize !== 'A4';
  const is58mm = settings.paperSize === 'THERMAL_58MM';

  const cafeteriaCost = data.orders.reduce((s, o) => s + o.priceAtTime * o.quantity, 0);
  const gamingCost = data.type === 'SESSION'
    ? (data.segments?.reduce((s, seg) => s + seg.cost, 0) || data.fallbackGaming || 0)
    : 0;
  const grandTotal = data.type === 'SALE' && data.totalAmount !== undefined
    ? data.totalAmount
    : gamingCost + cafeteriaCost;

  const invoiceNum = data.id.slice(-8).toUpperCase();
  const printDate = format(new Date(data.endTime || data.startTime), 'dd/MM/yyyy HH:mm');
  const startTime = format(new Date(data.startTime), 'HH:mm');
  const endTime = data.endTime ? format(new Date(data.endTime), 'HH:mm') : '';

  const headerText = settings.headerText || 'PS CAFE PRO';
  const footerText = settings.footerText || 'شكراً لزيارتكم • Thank you';

  const pageSize = is58mm ? '58mm' : isThermal ? '80mm' : 'A4';
  const maxWidth = is58mm ? '50mm' : isThermal ? '72mm' : '180mm';
  const bodyFontSize = is58mm ? '10px' : isThermal ? '11px' : '12px';

  let segmentsHtml = '';
  if (data.type === 'SESSION') {
    if (data.segments && data.segments.length > 0) {
      segmentsHtml = `
      <div style="margin-bottom:4px;">
        <div style="font-size:0.85em;font-weight:bold;margin-bottom:3px;">وقت اللعب / Gaming Time:</div>
        ${data.segments.map(seg => `
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span style="font-size:0.85em;">${seg.deviceType} (${seg.mode === 'SINGLE' ? 'Single' : 'Multi'})</span>
            <span style="font-size:0.85em;font-weight:bold;">${seg.cost.toFixed(2)} EGP</span>
          </div>
        `).join('')}
      </div>`;
    } else if (data.fallbackGaming && data.fallbackGaming > 0) {
      segmentsHtml = `
      <div style="margin-bottom:4px;">
        <div style="font-size:0.85em;font-weight:bold;margin-bottom:3px;">وقت اللعب / Gaming Time:</div>
        ${data.fallbackSingle && data.fallbackSingle > 0 ? `
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span style="font-size:0.85em;">${data.device?.type || 'Device'} (Single)</span>
            <span style="font-size:0.85em;font-weight:bold;">${data.fallbackSingle.toFixed(2)} EGP</span>
          </div>
        ` : ''}
        ${data.fallbackMulti && data.fallbackMulti > 0 ? `
          <div style="display:flex;justify-content:space-between;margin:2px 0;">
            <span style="font-size:0.85em;">${data.device?.type || 'Device'} (Multi)</span>
            <span style="font-size:0.85em;font-weight:bold;">${data.fallbackMulti.toFixed(2)} EGP</span>
          </div>
        ` : ''}
      </div>`;
    }
  }

  const ordersHtml = data.orders.length > 0
    ? `
    <div style="margin-bottom:4px;">
      <div style="font-size:0.85em;font-weight:bold;margin-bottom:3px;">
        ${data.type === 'SESSION' ? 'طلبات الكافيتريا / Cafeteria:' : 'المبيعات / Items:'}
      </div>
      ${data.orders.map(o => `
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span style="font-size:0.85em;">${o.name} × ${o.quantity}</span>
          <span style="font-size:0.85em;font-weight:bold;">${(o.priceAtTime * o.quantity).toFixed(2)} EGP</span>
        </div>
      `).join('')}
    </div>` : '';

  const deviceHtml = data.device
    ? `<div style="display:flex;justify-content:space-between;margin:2px 0;">
        <span style="font-size:0.85em;">جهاز / Station:</span>
        <span style="font-size:0.85em;font-weight:bold;">#${data.device.number} — ${data.device.type}</span>
      </div>` : '';

  const timeHtml = data.type === 'SESSION'
    ? `<div style="display:flex;justify-content:space-between;margin:2px 0;">
        <span style="font-size:0.85em;">الوقت / Time:</span>
        <span style="font-size:0.85em;font-weight:bold;">${startTime} → ${endTime}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin:2px 0;">
        <span style="font-size:0.85em;">النوع / Mode:</span>
        <span style="font-size:0.85em;font-weight:bold;">${data.isMulti ? 'Multi / متعدد' : 'Single / فردي'}</span>
      </div>` : '';

  // Repeat HTML for multiple copies
  const copies = Math.max(1, Math.min(5, settings.copies || 1));
  const receiptContent = `
    <div class="receipt">
      ${settings.showLogo ? `<div style="text-align:center;font-size:0.8em;opacity:0.5;letter-spacing:3px;margin-bottom:2px;">PS CAFE PRO</div>` : ''}
      <div style="text-align:center;margin-bottom:8px;">
        <div style="font-size:${isThermal ? '1.4em' : '1.8em'};font-weight:900;letter-spacing:2px;">${headerText}</div>
        <div style="font-size:0.85em;margin-top:2px;">━━━━━━━━━━━━━━━━━━━━</div>
        <div style="font-size:0.85em;font-weight:bold;">INVOICE / فاتورة</div>
      </div>

      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />

      <div style="margin-bottom:4px;">
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span style="font-size:0.85em;font-weight:bold;"># INV-${invoiceNum}</span>
          <span style="font-size:0.85em;">${printDate}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:2px 0;">
          <span style="font-size:0.85em;">موظف / Staff:</span>
          <span style="font-size:0.85em;font-weight:bold;">${data.staff}</span>
        </div>
        ${deviceHtml}
        ${timeHtml}
      </div>

      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />

      ${segmentsHtml}
      ${ordersHtml}

      <hr style="border:none;border-top:2px solid #000;margin:6px 0;" />

      <div style="text-align:center;margin-top:6px;border-top:2px solid #000;padding-top:6px;">
        <div style="font-size:0.85em;font-weight:bold;letter-spacing:1px;">TOTAL / الإجمالي</div>
        <div style="font-size:${isThermal ? '1.6em' : '2em'};font-weight:900;margin-top:4px;letter-spacing:2px;">
          ${grandTotal.toFixed(2)} <span style="font-size:0.55em;">EGP</span>
        </div>
      </div>

      <hr style="border:none;border-top:1px dashed #000;margin:6px 0;" />

      <div style="text-align:center;font-size:0.85em;margin-top:8px;">
        <div>${footerText}</div>
        <div style="margin-top:4px;opacity:0.4;font-size:0.75em;">PS Cafe Pro © ${new Date().getFullYear()}</div>
      </div>
    </div>
    ${copies > 1 ? '<div style="page-break-after:always;"></div>' : ''}
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoiceNum}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: white;
      font-family: 'Courier New', Courier, monospace;
      font-size: ${bodyFontSize};
      color: #000;
    }
    @page {
      size: ${pageSize} auto;
      margin: ${isThermal ? '3mm 4mm' : '15mm 20mm'};
    }
    .receipt {
      width: 100%;
      max-width: ${maxWidth};
      ${isThermal ? '' : 'margin: 0 auto;'}
      color: #000;
      background: white;
    }
  </style>
</head>
<body>
  ${Array.from({ length: copies }).map(() => receiptContent).join('')}
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────
// Main: Print receipt silently via hidden iframe
// ─────────────────────────────────────────────────────────
export async function printReceiptSilently(
  invoiceId: string,
  printSettings: PrintSettings
): Promise<void> {
  try {
    // 1. Fetch invoice data from API
    const res = await fetch(`/api/print/${invoiceId}`);
    if (!res.ok) throw new Error(`Failed to fetch invoice: ${res.status}`);
    const data: InvoiceData = await res.json();

    // 2. Build the receipt HTML
    const html = buildReceiptHtml(data, printSettings);

    // 3. Create hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0;';
    document.body.appendChild(iframe);

    // 4. Write HTML into iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Cannot access iframe document');

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // 5. Print after content loads
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Print timeout')), 10000);

      iframe.onload = () => {
        clearTimeout(timeout);
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // Clean up iframe after a brief delay
          setTimeout(() => {
            try { document.body.removeChild(iframe); } catch {}
            resolve();
          }, 1500);
        } catch (e) {
          reject(e);
        }
      };
    });
  } catch (error) {
    console.error('[printReceiptSilently] Error:', error);
    throw error;
  }
}
