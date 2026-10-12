"use client";

import { useActionState } from "react";
import { saveCashAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { CashDay } from "@/lib/data/records";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { GlassCard } from "@/components/ui/glass-card";

export function CashPanel({
  day,
  cashIn,
  saved,
  canWrite,
  monthClosed,
}: {
  day: string;
  cashIn: number;
  saved: CashDay | null;
  canWrite: boolean;
  monthClosed: boolean;
}) {
  const [state, action, pending] = useActionState(saveCashAction, null);
  const cashOut = saved?.cashOut ?? 0;
  const expected = cashIn - cashOut;

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-4">
        <h2 className="text-base font-semibold">{day}</h2>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Uang masuk</dt>
            <dd className="font-semibold tabular-nums">{rupiah(cashIn)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Pengeluaran kas</dt>
            <dd className="font-semibold tabular-nums">{rupiah(cashOut)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-muted">Seharusnya di laci</dt>
            <dd className="font-semibold tabular-nums">{rupiah(expected)}</dd>
          </div>
          {saved?.counted !== null && saved?.counted !== undefined ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted">Hasil hitung</dt>
              <dd className="font-semibold tabular-nums">{rupiah(saved.counted)}</dd>
            </div>
          ) : null}
        </dl>
        <p className="mt-3 text-xs text-muted">Uang masuk dari SPK lunas dan kasir walk-in hari ini.</p>
      </GlassCard>
      {canWrite ? (
        <GlassCard className="p-4">
          <h2 className="text-base font-semibold">Tutup kas</h2>
          {monthClosed ? (
            <p className="mt-3 text-sm text-muted">Bulan ini sudah ditutup.</p>
          ) : (
            <form action={action} className="mt-3 flex flex-col gap-3">
              <input
                name="cashOut"
                required
                inputMode="numeric"
                placeholder="Pengeluaran kas"
                defaultValue={saved?.cashOut ?? 0}
                className={inputClass}
              />
              <input
                name="counted"
                required
                inputMode="numeric"
                placeholder="Uang yang dihitung"
                defaultValue={saved?.counted ?? ""}
                className={inputClass}
              />
              <input name="note" placeholder="Catatan" defaultValue={saved?.note ?? ""} className={inputClass} />
              {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
              <button className={buttonClass} disabled={pending}>
                Simpan tutup kas
              </button>
            </form>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
