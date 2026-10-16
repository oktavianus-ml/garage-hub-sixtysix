"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { rupiah } from "@/lib/data/format";
import { payMethodLabel } from "@/lib/data/payment";
import type { WalkInSale } from "@/lib/data/records";
import type { WorkshopSettings } from "@/lib/data/settings";
import {
  printReceiptSlip,
  ReceiptSlip,
  receiptDateLabel,
  receiptSlipFromSale,
  type ReceiptSlipData,
} from "@/components/workshop/receipt-slip";

export function SalesHistoryPanel({
  sales,
  settings,
}: {
  sales: WalkInSale[];
  settings: WorkshopSettings;
}) {
  const [job, setJob] = useState<{ nonce: number; data: ReceiptSlipData } | null>(null);
  const printed = useRef(0);
  const nonce = useRef(0);

  useEffect(() => {
    if (!job || printed.current === job.nonce) return;
    if (!(document.getElementById("receipt-print") instanceof HTMLElement)) return;
    printed.current = job.nonce;
    printReceiptSlip(job.data.paper);
  }, [job]);

  if (sales.length === 0) {
    return <p className="text-sm text-muted">Belum ada penjualan pada saringan ini.</p>;
  }

  return (
    <div className="relative">
      <p className="text-xs font-medium text-muted">
        {sales.length === 200 ? "200 penjualan terbaru pada saringan ini." : `${sales.length} penjualan`}
      </p>
      <ul className="mt-2 divide-y divide-line">
        {sales.map((sale) => (
          <li key={sale.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                {sale.no} · {receiptDateLabel(sale.businessDate)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {sale.lines.map((line) => `${line.name} × ${line.qty}`).join(", ")}
              </p>
              <p className="text-sm font-semibold text-amber tabular-nums">
                {rupiah(sale.total)} · {sale.payMethod ? payMethodLabel[sale.payMethod] : "Belum dicatat"}
                {sale.cashierName ? ` · ${sale.cashierName}` : ""}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line px-2.5 text-xs font-semibold"
              onClick={() => {
                nonce.current += 1;
                setJob({ nonce: nonce.current, data: receiptSlipFromSale(settings, sale) });
              }}
            >
              <Printer className="size-3.5" aria-hidden />
              Cetak ulang
            </button>
          </li>
        ))}
      </ul>
      {job ? (
        <div className="pointer-events-none absolute top-0 left-0 -z-10 h-0 overflow-hidden" aria-hidden>
          <ReceiptSlip data={job.data} />
        </div>
      ) : null}
    </div>
  );
}
