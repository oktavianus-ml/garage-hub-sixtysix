"use client";

import { useActionState } from "react";
import { Lock, Wallet } from "lucide-react";
import { saveCashAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { payMethodLabel } from "@/lib/data/payment";
import type { CashDay, ChannelTotals, CustomerPayment } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

function Row({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={`font-semibold tabular-nums ${warn ? "text-amber" : ""}`}>{value}</dd>
    </div>
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
  const [state, action, pending] = useActionState(saveCashAction, null);
  const cashOut = saved?.cashOut ?? 0;
  const cashGap = saved?.counted !== null && saved?.counted !== undefined ? saved.counted - (channels.tunai - cashOut) : null;
  const qrisGap = saved?.qrisReceived !== null && saved?.qrisReceived !== undefined ? saved.qrisReceived - channels.qris : null;
  const bankGap = saved?.bankReceived !== null && saved?.bankReceived !== undefined ? saved.bankReceived - channels.bank : null;

  return (
    <>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-4">
          <SectionTitle icon={Wallet} tone="teal">
            {day}
          </SectionTitle>
          <dl className="mt-3 grid gap-2 text-sm">
            <Row label="Tunai" value={rupiah(channels.tunai)} />
            <Row label="Rekening QRIS" value={rupiah(channels.qris)} />
            <Row label="Rekening bank" value={rupiah(channels.bank)} />
            {cashOut > 0 ? <Row label="Pengeluaran dari laci" value={rupiah(cashOut)} /> : null}
            {cashGap !== null ? <Row label="Selisih tunai" value={rupiah(cashGap)} warn={cashGap !== 0} /> : null}
            {qrisGap !== null ? <Row label="Selisih QRIS" value={rupiah(qrisGap)} warn={qrisGap !== 0} /> : null}
            {bankGap !== null ? <Row label="Selisih rekening bank" value={rupiah(bankGap)} warn={bankGap !== 0} /> : null}
          </dl>
        </GlassCard>
        {canWrite ? (
          <GlassCard accent className="p-4">
            <SectionTitle icon={Lock}>Pengecekan</SectionTitle>
            {monthClosed ? (
              <p className="mt-3 text-sm text-muted">Bulan ini sudah ditutup.</p>
            ) : (
              <form action={action} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="day" value={day} />
                <input
                  name="cashOut"
                  required
                  inputMode="numeric"
                  placeholder="Pengeluaran dari laci"
                  defaultValue={saved?.cashOut ?? 0}
                  className={inputClass}
                />
                <input
                  name="counted"
                  required
                  inputMode="numeric"
                  placeholder="Uang tunai yang dihitung"
                  defaultValue={saved?.counted ?? ""}
                  className={inputClass}
                />
                <input
                  name="qrisReceived"
                  inputMode="numeric"
                  placeholder="Uang QRIS yang masuk"
                  defaultValue={saved?.qrisReceived ?? ""}
                  className={inputClass}
                />
                <input
                  name="bankReceived"
                  inputMode="numeric"
                  placeholder="Uang rekening bank yang masuk"
                  defaultValue={saved?.bankReceived ?? ""}
                  className={inputClass}
                />
                <input name="note" placeholder="Catatan" defaultValue={saved?.note ?? ""} className={inputClass} />
                {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
                <SaveButton pending={pending}>Simpan pengecekan</SaveButton>
              </form>
            )}
          </GlassCard>
        ) : null}
      </div>
      <GlassCard className="mt-4 p-4">
        <SectionTitle icon={Wallet} tone="teal">
          Per orang
        </SectionTitle>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada pembayaran per orang pada tanggal ini.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {payments.map((payment) => (
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
        )}
      </GlassCard>
    </>
  );
}
