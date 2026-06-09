"use client";

import { useEffect } from "react";
import { format } from "date-fns";

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
  type: "SESSION" | "SALE";
  id: string;
  device: { number: string; type: string } | null;
  deviceRates: { hourlyRateSingle: number; hourlyRateMulti: number } | null;
  startTime: string;
  endTime: string | null;
  isMulti: boolean;
  orders: Order[];
  staff: string;
  segments: Segment[];
  totalAmount?: number;
}

interface PrintClientProps {
  invoiceData: InvoiceData;
  paperSize: "THERMAL_80MM" | "A4";
}

function calcGamingCost(data: InvoiceData): number {
  if (data.type === "SALE" || !data.deviceRates) return 0;
  if (data.segments && data.segments.length > 0) {
    return data.segments.reduce((s, seg) => s + seg.cost, 0);
  }
  return 0;
}

export default function PrintClient({ invoiceData, paperSize }: PrintClientProps) {
  const isThermal = paperSize === "THERMAL_80MM";

  const cafeteriaCost = invoiceData.orders.reduce((s, o) => s + o.priceAtTime * o.quantity, 0);
  const gamingCost = invoiceData.type === "SESSION" ? calcGamingCost(invoiceData) : 0;
  const grandTotal =
    invoiceData.type === "SALE" && invoiceData.totalAmount !== undefined
      ? invoiceData.totalAmount
      : gamingCost + cafeteriaCost;

  const invoiceNum = invoiceData.id.slice(-8).toUpperCase();
  const printDate = format(new Date(invoiceData.endTime || invoiceData.startTime), "dd/MM/yy HH:mm");
  const startTime = format(new Date(invoiceData.startTime), "HH:mm");
  const endTime = invoiceData.endTime ? format(new Date(invoiceData.endTime), "HH:mm") : "";

  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
      window.addEventListener("afterprint", () => window.close(), { once: true });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontWeight: bold ? "bold" : "normal" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  const pageStyle = isThermal
    ? `@page { size: 80mm auto; margin: 3mm 4mm; }`
    : `@page { size: A4; margin: 15mm 20mm; } #print-root { max-width: 180mm !important; margin: 0 auto; }`;

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 8px; background: white; font-family: 'Courier New', Courier, monospace; font-size: ${isThermal ? '11px' : '15px'}; color: #000; }
        ${pageStyle}
        @media print { .no-print { display: none !important; } body { padding: 0; } }
        .separator { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .double-sep { border: none; border-top: 2px solid #000; margin: 6px 0; }
        .center { text-align: center; }
        .big { font-size: 1.5em; font-weight: 900; letter-spacing: 1px; }
        .xlarge { font-size: 1.8em; font-weight: 900; }
        .tag { border: 1px solid #000; padding: 1px 5px; font-size: 0.8em; font-weight: bold; border-radius: 3px; display: inline-block; margin: 2px 0; border-color: #3b82f6; color: #3b82f6; background: rgba(59,130,246,0.1); }
        .no-print { position: fixed; bottom: 16px; left: 16px; padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; }
      `}</style>

      <div id="print-root" dir="rtl" style={{ maxWidth: "72mm", margin: "0 auto" }}>
        {/* Header */}
        <div className="center" style={{ marginBottom: 8 }}>
          <div className="big">PS CAFE PRO</div>
          <div style={{ fontSize: "0.85em", marginTop: 2 }}>━━━━━━━━━━━━━━━━━━━━</div>
          <div style={{ fontWeight: "bold" }}>فاتورة / INVOICE</div>
          {invoiceData.type === "SESSION" && (
            <div className="tag" style={{ marginTop: 4 }}>
              {invoiceData.isMulti ? "🎮 متعدد (Multi)" : "🎮 فردي (Single)"}
            </div>
          )}
        </div>

        <div className="separator" />

        {/* Invoice Meta */}
        <Row label="رقم الطلب #" value={invoiceNum} />
        <Row label="الكاشير:" value={invoiceData.staff} bold />
        {invoiceData.device && (
          <Row label="الجهاز:" value={`${invoiceData.device.number} — ${invoiceData.device.type}`} bold />
        )}
        <Row label="طُبع في:" value={printDate} />
        {invoiceData.type === "SESSION" && (
          <Row label="وقت الجلسة:" value={`${startTime} ← ${endTime}`} />
        )}

        <div className="separator" />

        <div style={{ fontWeight: "bold", marginBottom: 4 }}>تفاصيل الفاتورة:</div>
        
        {/* Gaming Breakdown */}
        {invoiceData.type === "SESSION" && (
          <>
            <Row label="🎮 وقت اللعب:" value={`${gamingCost.toFixed(2)} ج`} bold />
            <div className="separator" />
            {invoiceData.segments.map((seg, i) => (
              <Row 
                key={i} 
                label={`— ${seg.deviceType} (${seg.mode === "SINGLE" ? "فردي" : "متعدد"}) ${seg.minutes} دقيقة`} 
                value={`${seg.cost.toFixed(2)} ج`} 
              />
            ))}
            {invoiceData.segments.length > 0 && <div className="separator" /> }
          </>
        )}

        {/* Cafeteria Breakdown */}
        {invoiceData.orders.length > 0 && (
          <>
            <Row label={invoiceData.type === "SESSION" ? "☕ كافيتريا:" : "🛒 مبيعات كافيتريا:"} value={`${cafeteriaCost.toFixed(2)} ج`} bold />
            <div className="separator" />
            {invoiceData.orders.map((o, i) => (
              <Row 
                key={i} 
                label={`— ${o.name} × ${o.quantity}`} 
                value={`${(o.priceAtTime * o.quantity).toFixed(2)} ج`} 
              />
            ))}
            <div className="separator" />
          </>
        )}

        {/* Empty State spacing just in case */}
        {invoiceData.orders.length === 0 && invoiceData.segments.length === 0 && <div style={{ height: "4px" }} />}

        <div className="double-sep" />

        {/* Grand Total */}
        <div className="center" style={{ marginBottom: 6 }}>
          <div style={{ fontSize: "0.85em", fontWeight: "bold" }}>إجمالي الفاتورة / TOTAL</div>
          <div className="xlarge" style={{ marginTop: 2 }}>{grandTotal.toFixed(2)} <span style={{ fontSize: "0.5em" }}>ج</span></div>
        </div>

        <div className="separator" />

        {/* Footer */}
        <div className="center" style={{ fontSize: "0.75em", opacity: 0.5, marginTop: 6, lineHeight: 1.4 }}>
          <div>شكراً لزيارتكم ونتمنى لكم وقتاً ممتعاً ✌️</div>
          <div>Thank you for playing here</div>
          <div style={{ marginTop: 4 }}>PS Cafe Pro © {new Date().getFullYear()}</div>
        </div>
      </div>

      <button className="no-print" onClick={() => window.print()}>🖨️ إعادة الطباعة</button>
    </>
  );
}
