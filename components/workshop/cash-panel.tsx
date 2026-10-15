"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useState, type ReactNode } from "react";
import { Lock, Receipt, Wallet } from "lucide-react";
import { saveCashAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { payMethodLabel } from "@/lib/data/payment";
import type { CashDay, ChannelTotals, CustomerPayment } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { MoneyInput } from "@/components/ui/money-input";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 5;

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-semibold tabular-nums ${warn ? "text-amber" : ""}`}>{value}</dd>
    </div>
  );
}

function gapLabel(gap: number) {
  if (gap === 0) return "Cocok";
  if (gap > 0) return `Lebih ${rupiah(gap)}`;
  return `Kurang ${rupiah(Math.abs(gap))}`;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

export function CashPanel({
  day,
  channels,
  payments,
  saved,
  canWrite,
  monthClosed,
}: {
  day: string;
  channels: ChannelTotals;
  payments: CustomerPayment[];
  saved: CashDay | null;
  canWrite: boolean;
  monthClosed: boolean;
}) {
  const [state, action, pending] = useQueuedAction(saveCashAction, "saveCash");
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(payments.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visiblePayments = payments.slice(start, start + PAGE_SIZE);
  const rangeStart = payments.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visiblePayments.length;
  const cashOut = saved?.cashOut ?? 0;
  const cashGap = saved?.counted !== null && saved?.counted !== undefined ? saved.counted - (channels.tunai - cashOut) : null;
  const qrisGap = saved?.qrisReceived !== null && saved?.qrisReceived !== undefined ? saved.qrisReceived - channels.qris : null;
  const bankGap = saved?.bankReceived !== null && saved?.bankReceived !== undefined ? saved.bankReceived - channels.bank : null;

  return (
    <div className={cn("mt-5 grid items-start gap-4", canWrite && "lg:grid-cols-2")}>
      <GlassCard className="p-4">
        <SectionTitle icon={Wallet} tone="teal">
          Yang dicatat
        </SectionTitle>
        <p className="mt-1 text-sm text-muted">{day}. Dari pembayaran pelanggan.</p>
        <dl className="mt-3 grid gap-2 text-sm">
          <Row label="Tunai" value={rupiah(channels.tunai)} />
          <Row label="QRIS" value={rupiah(channels.qris)} />
          <Row label="Transfer" value={rupiah(channels.bank)} />
        </dl>
        {cashGap !== null || qrisGap !== null || bankGap !== null || cashOut > 0 ? (
          <>
            <p className="mt-4 text-sm font-medium">Hasil cek</p>
            <dl className="mt-2 grid gap-2 text-sm">
              {cashOut > 0 ? <Row label="Diambil dari laci" value={rupiah(cashOut)} /> : null}
              {cashGap !== null ? <Row label="Tunai di laci" value={gapLabel(cashGap)} warn={cashGap !== 0} /> : null}
              {qrisGap !== null ? <Row label="QRIS" value={gapLabel(qrisGap)} warn={qrisGap !== 0} /> : null}
              {bankGap !== null ? <Row label="Transfer" value={gapLabel(bankGap)} warn={bankGap !== 0} /> : null}
            </dl>
          </>
        ) : null}
        <div className="mt-4 border-t border-line pt-4">
          <SectionTitle icon={Receipt} tone="teal">
            Per orang
          </SectionTitle>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada pembayaran per orang pada tanggal ini.</p>
          ) : (
            <>
              <ul className="mt-2 divide-y divide-line">
                {visiblePayments.map((payment) => (
                  <li key={payment.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <div>
                      <p className="font-medium">{payment.customerName}</p>
                      <p className="text-muted">
                        {payMethodLabel[payment.payMethod]}
                        {payment.note ? ` · ${payment.note}` : ""}
                      </p>
                    </div>
                    <p className="font-semibold tabular-nums">{rupiah(payment.amount)}</p>
                  </li>
                ))}
              </ul>
              {payments.length > PAGE_SIZE ? (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <p className="text-xs text-muted">
                    {rangeStart}–{rangeEnd} dari {payments.length}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-line bg-chip px-3 text-sm font-medium disabled:opacity-40"
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-line bg-chip px-3 text-sm font-medium disabled:opacity-40"
                      disabled={currentPage >= pageCount - 1}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      Berikutnya
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </GlassCard>
      {canWrite ? (
        <GlassCard accent className="p-4">
          <SectionTitle icon={Lock}>Cek uang</SectionTitle>
          {monthClosed ? (
            <p className="mt-3 text-sm text-muted">Bulan ini sudah ditutup.</p>
          ) : (
            <form action={action} className="mt-3 flex flex-col gap-3">
              <p className="text-sm text-muted">Isi uang yang benar-benar ada. Kolom selain tunai boleh dikosongkan.</p>
              <input type="hidden" name="day" value={day} />
              <Field label="Tunai di laci">
                <MoneyInput name="counted" required placeholder="0" defaultValue={saved?.counted ?? ""} />
              </Field>
              <Field label="QRIS yang masuk">
                <MoneyInput name="qrisReceived" placeholder="Kosongkan kalau tidak dicek" defaultValue={saved?.qrisReceived ?? ""} />
              </Field>
              <Field label="Transfer yang masuk">
                <MoneyInput name="bankReceived" placeholder="Kosongkan kalau tidak dicek" defaultValue={saved?.bankReceived ?? ""} />
              </Field>
              <Field label="Diambil dari laci">
                <MoneyInput name="cashOut" placeholder="0 kalau tidak ada" defaultValue={saved ? saved.cashOut : ""} />
              </Field>
              <Field label="Catatan">
                <input name="note" placeholder="Opsional" defaultValue={saved?.note ?? ""} className={inputClass} />
              </Field>
              <FormMessage state={state} />
              <SaveButton pending={pending}>Simpan</SaveButton>
            </form>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
