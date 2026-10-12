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
import { isRole, roleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

type ProfitPerson = { id: string; name: string; role: string };
type Draft = { key: string; userId: string; name: string; percent: string };

function personLabel(person: ProfitPerson) {
  const role = isRole(person.role) ? roleLabel[person.role] : "";
  return role ? `${person.name} · ${role}` : person.name;
}

function draftsFrom(shares: ProfitShare[], people: ProfitPerson[]): Draft[] {
  const used = new Set<string>();
  return shares.map((share) => {
    const direct = people.find((person) => person.id === share.id);
    const byRole =
      share.id === "owner"
        ? people.find((person) => person.role === "pemilik" && !used.has(person.id))
        : share.id === "investor"
          ? people.find((person) => person.role === "investor" && !used.has(person.id))
          : undefined;
    const match = direct ?? byRole;
    if (match) used.add(match.id);
    return {
      key: share.id,
      userId: match?.id ?? "",
      name: match?.name ?? "",
      percent: String(share.percent),
    };
  });
}

function draftPercent(value: string) {
  if (!/^\d+$/.test(value.trim())) return null;
  const percent = Number(value.trim());
  if (percent > 100) return null;
  return percent;
}

function formPartners(drafts: Draft[]): ProfitPartner[] {
  return drafts.map((draft) => ({
    id: draft.userId,
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
  people,
}: {
  month: string;
  canWrite: boolean;
  closed: boolean;
  revenue: number;
  cogs: number;
  cashOut: number;
  profit: number;
  shares: ProfitShare[];
  people: ProfitPerson[];
}) {
  const [splitState, splitAction, splitPending] = useActionState(saveSplitAction, null);
  const [closeState, closeAction, closePending] = useActionState(closeMonthAction, null);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [drafts, setDrafts] = useState(() => draftsFrom(shares, people));
  const allowedIds = new Set(people.map((person) => person.id));
  const editing = canWrite && !closed;
  const savedKey = shares.map((share) => `${share.id}:${share.name}:${share.percent}`).join("|");
  const draftKey = drafts
    .map((draft) => `${draft.userId}:${draft.name.trim()}:${draftPercent(draft.percent) ?? ""}`)
    .join("|");
  const dirty = savedKey !== draftKey;
  const issue = editing ? splitError(formPartners(drafts), allowedIds) : null;
  const percents = drafts.map((draft) => draftPercent(draft.percent));
  const percentsReady = percents.every((percent) => percent !== null);
  const total = percents.reduce<number>((sum, percent) => sum + (percent ?? 0), 0);
  const live = allocateShares(
    profit,
    drafts.map((draft) => ({
      id: draft.userId || draft.key,
      name: draft.name.trim() || "Belum diisi",
      percent: draftPercent(draft.percent) ?? 0,
    })),
  );
  const shareRows = editing
    ? drafts.map((draft, index) => {
        const percent = draftPercent(draft.percent);
        const name = draft.name.trim() || "Belum diisi";
        return {
          key: draft.key,
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

  function changeDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
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
                {people.length === 0 ? (
                  <p className="text-sm text-muted">Tambah pegawai dulu.</p>
                ) : (
                <ul className="flex flex-col gap-3">
                  {drafts.map((draft, index) => {
                    const amount = live[index]?.amount ?? 0;
                    const taken = new Set(drafts.filter((item) => item.key !== draft.key).map((item) => item.userId));
                    return (
                      <li key={draft.key} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <select
                            name="partnerId"
                            required
                            value={draft.userId}
                            onChange={(event) => {
                              const person = people.find((item) => item.id === event.target.value);
                              changeDraft(draft.key, { userId: event.target.value, name: person?.name ?? "" });
                            }}
                            className={`${inputClass} min-w-0`}
                            aria-label={`Orang ${index + 1}`}
                          >
                            <option value="">Pilih pegawai</option>
                            {people.map((person) => (
                              <option key={person.id} value={person.id} disabled={taken.has(person.id)}>
                                {personLabel(person)}
                              </option>
                            ))}
                          </select>
                          <div className="w-20 shrink-0">
                            <input
                              name="partnerPercent"
                              required
                              inputMode="numeric"
                              value={draft.percent}
                              onChange={(event) => changeDraft(draft.key, { percent: event.target.value })}
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
                                current.length <= 1 ? current : current.filter((item) => item.key !== draft.key),
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
                )}
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line-strong px-4 text-sm font-semibold disabled:opacity-40"
                  disabled={people.length === 0 || drafts.length >= MAX_PARTNERS || drafts.length >= people.length}
                  onClick={() =>
                    setDrafts((current) =>
                      current.length >= MAX_PARTNERS || current.length >= people.length
                        ? current
                        : [...current, { key: crypto.randomUUID(), userId: "", name: "", percent: "" }],
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
              <form action={closeAction} className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
                <input type="hidden" name="month" value={month} />
                {dirty ? <p className="text-sm text-muted">Simpan persentase dulu.</p> : null}
                {closeState?.message ? <p className="text-sm text-danger">{closeState.message}</p> : null}
                {confirmingClose ? (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm">
                      Tutup buku {month}? Angka bulan ini dikunci dan tidak bisa diubah lagi.
                    </p>
                    <div className="flex flex-col gap-3">
                      <button
                        type="button"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-line-strong px-4 text-sm font-semibold"
                        onClick={() => setConfirmingClose(false)}
                      >
                        Batal
                      </button>
                      <SaveButton pending={closePending} disabled={dirty} className="w-full">
                        Ya, tutup buku
                      </SaveButton>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`${buttonClass} w-full`}
                    disabled={dirty}
                    onClick={() => setConfirmingClose(true)}
                  >
                    Tutup buku bulan ini
                  </button>
                )}
              </form>
            </>
          )}
        </GlassCard>
      ) : null}
    </div>
  );
}
