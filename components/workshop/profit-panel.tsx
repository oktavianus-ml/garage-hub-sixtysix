"use client";

import { useActionState, useState } from "react";
import { Lock, Percent, PieChart, Plus, Trash2 } from "lucide-react";
import { closeMonthAction, saveSplitAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import {
  MAX_PARTNERS,
  allocateShares,
  splitError,
  type ProfitPartner,
  type ProfitShare,
} from "@/lib/data/profit-split";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

type Draft = { id: string; name: string; percent: string };

function draftsFrom(shares: ProfitShare[]): Draft[] {
  return shares.map((share) => ({
    id: share.id,
    name: share.name,
    percent: String(share.percent),
  }));
}

function draftPercent(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  const percent = Number(value.trim());
  if (percent > 100) return null;
  return percent;
}

function formPartners(drafts: Draft[]): ProfitPartner[] {
  return drafts.map((draft) => ({
    id: draft.id,
    name: draft.name,
    percent: draftPercent(draft.percent) ?? Number.NaN,
  }));
}

export function ProfitPanel({
  month,
  canWrite,
  closed,
  revenue,
  cogs,
  cashOut,
  profit,
  shares,
}: {
  month: string;
  canWrite: boolean;
  closed: boolean;
  revenue: number;
  cogs: number;
  cashOut: number;
  profit: number;
  shares: ProfitShare[];
}) {
  const [splitState, splitAction, splitPending] = useActionState(saveSplitAction, null);
  const [closeState, closeAction, closePending] = useActionState(closeMonthAction, null);
  const [drafts, setDrafts] = useState(() => draftsFrom(shares));
  const editing = canWrite && !closed;
  const savedKey = shares.map((share) => `${share.id}:${share.name}:${share.percent}`).join("|");
  const draftKey = drafts
    .map((draft) => `${draft.id}:${draft.name.trim()}:${draftPercent(draft.percent) ?? ""}`)
    .join("|");
  const dirty = savedKey !== draftKey;
  const issue = editing ? splitError(formPartners(drafts)) : null;
  const percents = drafts.map((draft) => draftPercent(draft.percent));
  const percentsReady = percents.every((percent) => percent !== null);
  const total = percents.reduce((sum, percent) => sum + (percent ?? 0), 0);
  const live = allocateShares(
    profit,
    drafts.map((draft) => ({
      id: draft.id,
      name: draft.name.trim() || "Belum diisi",
      percent: draftPercent(draft.percent) ?? 0,
    })),
  );
  const shareRows = editing
    ? drafts.map((draft, index) => {
        const percent = draftPercent(draft.percent);
        const name = draft.name.trim() || "Belum diisi";
        return {
          key: draft.id,
          label: percent === null ? name : `${name} ${percent}%`,
          value: live[index]?.amount ?? 0,
        };
      })
    : shares.map((share) => ({
        key: share.id,
        label: `${share.name} ${share.percent}%`,
        value: share.amount,
      }));
  const rows = [
    { key: "revenue", label: "Pendapatan", value: revenue },
    { key: "cogs", label: "Harga pokok", value: cogs },
    { key: "cash", label: "Pengeluaran kas", value: cashOut },
    { key: "profit", label: "Laba", value: profit },
    ...shareRows,
  ];

  function changeDraft(id: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft)));
  }

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <GlassCard className="p-4">
        <SectionTitle icon={closed ? Lock : PieChart} tone="teal">
          {closed ? "Bulan terkunci" : "Pratinjau bulan"}
        </SectionTitle>
        <dl className="mt-3 divide-y divide-line">
          {rows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <dt className="text-muted">{row.label}</dt>
              <dd className="font-semibold tabular-nums">{rupiah(row.value)}</dd>
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
                <ul className="flex flex-col gap-3">
                  {drafts.map((draft, index) => {
                    const amount = live[index]?.amount ?? 0;
                    return (
                      <li key={draft.id} className="flex flex-col gap-1">
                        <input type="hidden" name="partnerId" value={draft.id} />
                        <div className="flex items-center gap-2">
                          <input
                            name="partnerName"
                            required
                            value={draft.name}
                            onChange={(event) => changeDraft(draft.id, { name: event.target.value })}
                            className={`${inputClass} min-w-0`}
                            aria-label={`Nama orang ${index + 1}`}
                            placeholder="Nama"
                          />
                          <div className="w-20 shrink-0">
                            <input
                              name="partnerPercent"
                              required
                              inputMode="numeric"
                              value={draft.percent}
                              onChange={(event) => changeDraft(draft.id, { percent: event.target.value })}
                              className={inputClass}
                              aria-label={`Persen orang ${index + 1}`}
                            />
                          </div>
                          <button
                            type="button"
                            className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line-strong text-muted disabled:opacity-40"
                            aria-label={`Hapus orang ${index + 1}`}
                            disabled={drafts.length <= 1}
                            onClick={() =>
                              setDrafts((current) =>
                                current.length <= 1 ? current : current.filter((item) => item.id !== draft.id),
                              )
                            }
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                        <p className="text-right text-sm font-semibold tabular-nums">{rupiah(amount)}</p>
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold disabled:opacity-40"
                  disabled={drafts.length >= MAX_PARTNERS}
                  onClick={() =>
                    setDrafts((current) =>
                      current.length >= MAX_PARTNERS
                        ? current
                        : [...current, { id: crypto.randomUUID(), name: "", percent: "" }],
                    )
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  Tambah orang
                </button>
                {percentsReady ? (
                  <p
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      total === 100 && !issue ? "text-teal" : "text-danger",
                    )}
                  >
                    Total {total}%.
                  </p>
                ) : null}
                {issue ? <p className="text-sm text-danger">{issue}</p> : null}
                {splitState?.message ? <p className="text-sm text-danger">{splitState.message}</p> : null}
                <SaveButton pending={splitPending} disabled={issue !== null}>
                  Simpan persentase
                </SaveButton>
              </form>
              <form action={closeAction} className="mt-4">
                <input type="hidden" name="month" value={month} />
                {dirty ? <p className="mb-2 text-sm text-muted">Simpan persentase dulu.</p> : null}
                {closeState?.message ? <p className="mb-2 text-sm text-danger">{closeState.message}</p> : null}
                <SaveButton pending={closePending} disabled={dirty} className="w-full">
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
