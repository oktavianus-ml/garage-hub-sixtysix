"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import Link from "next/link";
import { ArrowDownRight, Scale, Wallet } from "lucide-react";
import { saveBudgetAction } from "@/lib/data/actions";
import type { BudgetAudit } from "@/lib/data/budget-types";
import { rupiah } from "@/lib/data/format";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const areaClass = "min-h-20 w-full rounded-xl border border-line-strong bg-field px-3 py-2 text-base";

function meterWidth(plan: number, actual: number) {
  if (actual <= 0) return 0;
  if (plan <= 0) return 100;
  return Math.min(100, Math.round((actual / plan) * 100));
}

function MoneyRow({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("font-semibold tabular-nums", warn && "text-danger")}>{value}</dd>
    </div>
  );
}

export function AuditPanel({ audit, canWrite }: { audit: BudgetAudit; canWrite: boolean }) {
  const [state, action, pending] = useQueuedAction(saveBudgetAction, "saveBudget");
  const leftTotal = audit.planTotal - audit.actualTotal;
  const overTotal = audit.saved && leftTotal < 0;
  const cards = [
    {
      label: "Anggaran",
      value: audit.saved ? rupiah(audit.planTotal) : "Belum diisi",
      hint: audit.monthLabel,
      warn: false,
    },
    {
      label: "Sudah keluar",
      value: rupiah(audit.actualTotal),
      hint:
        audit.outflows.length === 0
          ? "Belum ada catatan"
          : audit.outflows.length === 1
            ? "1 catatan"
            : `${audit.outflows.length} catatan`,
      warn: false,
    },
    {
      label: overTotal ? "Melebihi" : "Sisa",
      value: audit.saved ? rupiah(Math.abs(leftTotal)) : "—",
      hint: !audit.saved ? "Isi anggaran dulu" : overTotal ? "Di atas anggaran" : "Masih di dalam anggaran",
      warn: overTotal,
    },
  ];

  return (
    <>
      {audit.closed ? (
        <p className="mt-4 text-sm text-muted">Bulan ini sudah ditutup. Angka keluar tidak berubah lagi.</p>
      ) : null}
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <GlassCard key={card.label} className="p-4">
            <p className="text-sm text-muted">{card.label}</p>
            <p className={cn("mt-2 text-2xl font-semibold tabular-nums", card.warn && "text-danger")}>{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </GlassCard>
        ))}
      </section>
      <p className="mt-3 text-xs text-muted">
        Keluar dihitung dari barang yang sudah diterima dan uang yang sudah dicatat keluar dari laci.
      </p>

      <div className={cn("mt-4 grid items-start gap-4", canWrite && "lg:grid-cols-2")}>
        <GlassCard className="p-4">
          <SectionTitle icon={Scale} tone="teal">
            {audit.saved ? "Cek anggaran" : "Belum ada anggaran"}
          </SectionTitle>
          {audit.note ? <p className="mt-3 text-sm text-muted">{audit.note}</p> : null}
          <div className="mt-2 divide-y divide-line">
            {audit.lines.map((line) => {
              const left = line.plan - line.actual;
              const over = audit.saved && left < 0;
              return (
                <div key={line.key} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{line.label}</p>
                    {audit.saved ? (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                          over ? "bg-danger-soft text-danger" : "bg-teal-soft text-teal",
                        )}
                      >
                        {over ? "Melebihi" : "Aman"}
                      </span>
                    ) : null}
                  </div>
                  <dl className="mt-2 grid gap-1 text-sm">
                    <MoneyRow label="Anggaran" value={audit.saved ? rupiah(line.plan) : "Belum diisi"} />
                    <MoneyRow label="Keluar" value={rupiah(line.actual)} />
                    {audit.saved ? (
                      <MoneyRow
                        label={over ? "Lebih" : "Sisa"}
                        value={rupiah(Math.abs(left))}
                        warn={over}
                      />
                    ) : null}
                  </dl>
                  {audit.saved ? (
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-chip"
                      role="meter"
                      aria-label={line.label}
                      aria-valuemin={0}
                      aria-valuemax={Math.max(line.plan, line.actual, 1)}
                      aria-valuenow={line.actual}
                    >
                      <div
                        className={cn("h-full rounded-full", over ? "bg-danger" : "bg-teal")}
                        style={{ width: `${meterWidth(line.plan, line.actual)}%` }}
                      />
                    </div>
                  ) : null}
                  <p className="mt-2 text-xs text-muted">{line.hint}</p>
                </div>
              );
            })}
          </div>
        </GlassCard>

        {canWrite ? (
          <GlassCard accent className="p-4">
            <SectionTitle icon={Wallet}>Anggaran bulan ini</SectionTitle>
            <form action={action} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="month" value={audit.month} />
              {audit.lines.map((line) => (
                <label key={line.key} className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  {line.label}
                  <input
                    name={line.key}
                    required
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={audit.saved ? line.plan : ""}
                    className={inputClass}
                  />
                  <span className="font-normal">
                    Sudah keluar {rupiah(line.actual)}
                    {line.previous > 0 ? ` · Bulan lalu ${rupiah(line.previous)}` : ""}
                  </span>
                </label>
              ))}
              <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                Catatan
                <textarea
                  name="note"
                  maxLength={200}
                  placeholder="Catatan anggaran, kalau ada"
                  defaultValue={audit.note}
                  className={areaClass}
                />
              </label>
              <FormMessage state={state} />
              <p className="text-sm leading-6 text-muted">
                Isi rencana bulan ini. Nanti dibandingkan dengan barang yang diterima dan uang yang keluar dari laci.
              </p>
              <SaveButton pending={pending} className="w-full">{audit.saved ? "Simpan perubahan" : "Simpan anggaran"}</SaveButton>
            </form>
          </GlassCard>
        ) : null}
      </div>

      <GlassCard className="mt-4 p-4">
        <SectionTitle icon={ArrowDownRight} tone="teal">
          Yang benar-benar keluar
        </SectionTitle>
        {audit.outflows.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Belum ada barang diterima atau uang keluar dari laci pada bulan ini.
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {audit.outflows.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={row.href} className="font-medium text-teal">
                    {row.title}
                  </Link>
                  <p className="text-muted">
                    {row.when} · {row.label}
                    {row.detail ? ` · ${row.detail}` : ""}
                  </p>
                </div>
                <p className="shrink-0 font-semibold tabular-nums">{rupiah(row.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </>
  );
}
