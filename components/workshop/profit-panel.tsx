"use client";

import { useActionState } from "react";
import { Lock, Percent, PieChart } from "lucide-react";
import { closeMonthAction, saveSplitAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

export function ProfitPanel({
  month,
  canWrite,
  closed,
  revenue,
  cogs,
  cashOut,
  profit,
  ownerPercent,
  investorPercent,
  ownerShare,
  investorShare,
}: {
  month: string;
  canWrite: boolean;
  closed: boolean;
  revenue: number;
  cogs: number;
  cashOut: number;
  profit: number;
  ownerPercent: number;
  investorPercent: number;
  ownerShare: number;
  investorShare: number;
}) {
  const [splitState, splitAction, splitPending] = useActionState(saveSplitAction, null);
  const [closeState, closeAction, closePending] = useActionState(closeMonthAction, null);
  const rows = [
    ["Pendapatan", revenue],
    ["Harga pokok", cogs],
    ["Pengeluaran kas", cashOut],
    ["Laba", profit],
    [`Pemilik ${ownerPercent}%`, ownerShare],
    [`Investor ${investorPercent}%`, investorShare],
  ] as const;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-4">
        <SectionTitle icon={closed ? Lock : PieChart} tone="teal">
          {closed ? "Bulan terkunci" : "Pratinjau bulan"}
        </SectionTitle>
        <dl className="mt-3 divide-y divide-line">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 py-2 text-sm">
              <dt className="text-muted">{label}</dt>
              <dd className="font-semibold tabular-nums">{rupiah(value)}</dd>
            </div>
          ))}
        </dl>
      </GlassCard>
      {canWrite ? (
        <GlassCard accent className="p-4">
          <SectionTitle icon={Percent}>Persentase</SectionTitle>
          {closed ? (
            <p className="mt-3 text-sm text-muted">Angka bulan ini sudah dikunci.</p>
          ) : (
            <>
              <form action={splitAction} className="mt-3 flex flex-col gap-3">
                <input type="hidden" name="month" value={month} />
                <input
                  name="ownerPercent"
                  required
                  inputMode="numeric"
                  defaultValue={ownerPercent}
                  className={inputClass}
                  aria-label="Persen pemilik"
                />
                <input
                  name="investorPercent"
                  required
                  inputMode="numeric"
                  defaultValue={investorPercent}
                  className={inputClass}
                  aria-label="Persen investor"
                />
                {splitState?.message ? <p className="text-sm text-danger">{splitState.message}</p> : null}
                <SaveButton pending={splitPending}>Simpan persentase</SaveButton>
              </form>
              <form action={closeAction} className="mt-4">
                <input type="hidden" name="month" value={month} />
                {closeState?.message ? <p className="mb-2 text-sm text-danger">{closeState.message}</p> : null}
                <SaveButton pending={closePending} className="w-full">
                  Tutup buku bulan ini
                </SaveButton>
              </form>
            </>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
