"use client";

import { useEffect } from "react";
import { format } from "date-fns";

interface ShiftSummary {
  gaming: number;
  cafeteria: number;
  income: number;
  expenses: number;
  totalRevenue: number;
  expectedCash: number;
  openingFloat: number;
  sessionCount: number;
  transactionCount: number;
}

interface ShiftData {
  id: string;
  openedAt: string;
  closedAt: string | null;
  status: string;
  openedByUser: string;
  closedByUser: string | null;
  openingFloat: number;
  expectedCash: number;
  actualCash: number | null;
  variance: number | null;
  notes: string | null;
  sessionCount: number;
}

interface Props {
  shiftData: ShiftData;
  summary: ShiftSummary | null;
}

export default function ShiftPrintClient({ shiftData, summary }: Props) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
      window.addEventListener("afterprint", () => window.close(), { once: true });
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const isClosed = shiftData.status === "CLOSED";
  const expected = isClosed ? shiftData.expectedCash : summary?.expectedCash ?? 0;
  const actual = shiftData.actualCash;
  const variance = shiftData.variance ?? (actual !== null ? actual - expected : null);

  const totalGaming = summary?.gaming ?? 0;

  const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", margin: "3px 0", fontWeight: bold ? "bold" : "normal" }}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 8px; background: white; font-family: 'Courier New', Courier, monospace; font-size: 11px; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: 80mm auto; margin: 3mm 4mm; }
        @media print { .no-print { display: none !important; } body { padding: 0; color: #000 !important; } }
        .separator { border: none; border-top: 1px dashed #000; margin: 6px 0; }
        .double-sep { border: none; border-top: 2px solid #000; margin: 6px 0; }
        .center { text-align: center; }
        .big { font-size: 1.5em; font-weight: 900; letter-spacing: 1px; }
        .xlarge { font-size: 1.8em; font-weight: 900; }
        .tag { border: 1px solid #000; padding: 1px 5px; font-size: 0.8em; font-weight: bold; border-radius: 3px; display: inline-block; margin: 2px 0; }
        .no-print { position: fixed; bottom: 16px; right: 16px; padding: 8px 20px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: bold; cursor: pointer; }
      `}</style>

      <div style={{ maxWidth: "72mm", margin: "0 auto" }}>
        {/* Header */}
        <div className="center" style={{ marginBottom: 8 }}>
          <div className="big">PS CAFE PRO</div>
          <div style={{ fontSize: "0.85em", marginTop: 2 }}>━━━━━━━━━━━━━━━━━━━━</div>
          <div style={{ fontWeight: "bold" }}>X-REPORT / تقرير الوردية</div>
          {shiftData.status === "OPEN" && (
            <div className="tag" style={{ marginTop: 4 }}>🟢 وردية مفتوحة</div>
          )}
        </div>

        <div className="separator" />

        {/* Shift Meta */}
        <Row label="الوردية #" value={shiftData.id.slice(-8).toUpperCase()} />
        <Row label="الكاشير (فتح):" value={shiftData.openedByUser} bold />
        <Row label="وقت الفتح:" value={format(new Date(shiftData.openedAt), "dd/MM/yy HH:mm")} />
        {isClosed && shiftData.closedAt && (
          <>
            <Row label="الكاشير (إغلاق):" value={shiftData.closedByUser || shiftData.openedByUser} />
            <Row label="وقت الإغلاق:" value={format(new Date(shiftData.closedAt), "dd/MM/yy HH:mm")} />
          </>
        )}
        <Row label="طُبع في:" value={format(new Date(), "dd/MM/yy HH:mm")} />

        <div className="separator" />

        {/* Revenue Breakdown */}
        {summary && (
          <>
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>تفاصيل الإيرادات:</div>
            <Row label="عهدة البداية:" value={`${summary.openingFloat.toFixed(2)} ج`} />
            <div className="separator" />
            <Row label="🎮 إيراد الألعاب:" value={`${summary.gaming.toFixed(2)} ج`} />
            <Row label="☕ كافيتريا:" value={`${summary.cafeteria.toFixed(2)} ج`} />
            {summary.income > 0 && <Row label="+ إيرادات أخرى:" value={`${summary.income.toFixed(2)} ج`} />}
            {summary.expenses > 0 && <Row label="- مصروفات:" value={`${summary.expenses.toFixed(2)} ج`} />}
            <div className="separator" />
            <Row label="إجمالي الإيرادات:" value={`${summary.totalRevenue.toFixed(2)} ج`} bold />
            <Row label="عدد الجلسات:" value={`${summary.sessionCount}`} />
          </>
        )}

        <div className="double-sep" />

        {/* Expected Cash */}
        <div className="center" style={{ marginBottom: 6 }}>
          <div style={{ fontSize: "0.85em", fontWeight: "bold" }}>المبلغ المتوقع بالصندوق</div>
          <div className="xlarge">{expected.toFixed(2)} <span style={{ fontSize: "0.5em" }}>ج</span></div>
        </div>

        {/* Variance (if closed) */}
        {isClosed && actual !== null && variance !== null && (
          <>
            <div className="separator" />
            <Row label="الفعلي بالصندوق:" value={`${actual.toFixed(2)} ج`} bold />
            <Row
              label={variance >= 0 ? "✓ زيادة:" : "⚠ عجز:"}
              value={`${variance >= 0 ? "+" : ""}${variance.toFixed(2)} ج`}
              bold
            />
          </>
        )}

        {/* Notes */}
        {shiftData.notes && (
          <>
            <div className="separator" />
            <div style={{ fontSize: "0.85em" }}>ملاحظات: {shiftData.notes}</div>
          </>
        )}

        <div className="separator" />
        <div className="center" style={{ fontSize: "0.75em", opacity: 0.5, marginTop: 6 }}>
          PS Cafe Pro © {new Date().getFullYear()}
        </div>
      </div>

      <button className="no-print" onClick={() => window.print()}>🖨️ إعادة الطباعة</button>
    </>
  );
}
