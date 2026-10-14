import Link from "next/link";
import { BookOpen, ChevronDown } from "lucide-react";
import { ACCOUNT_KINDS, accountKindLabel, type AccountKind } from "@/lib/data/account-types";
import type { AccountLedger, AccountLedgerRow } from "@/lib/data/account-ledger";
import { rupiah } from "@/lib/data/format";
import { cn } from "@/lib/cn";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionTitle } from "@/components/ui/section-title";

const kindCode: Record<AccountKind, string> = {
  pendapatan: "bg-amber-soft text-amber",
  beban: "bg-teal-soft text-teal",
  modal: "bg-chip text-muted",
};

function AccountBlock({ row }: { row: AccountLedgerRow }) {
  return (
    <details className="group border-b border-line py-3 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <span className="font-medium">{row.name}</span>
          <span
            className={cn(
              "ml-2 inline-flex rounded-md px-1.5 py-0.5 text-xs font-semibold tracking-wide tabular-nums",
              kindCode[row.kind],
            )}
          >
            {row.code}
          </span>
          {!row.active ? (
            <span className="ml-2 rounded-full bg-chip px-2.5 py-1 text-[11px] font-semibold text-muted">
              Nonaktif
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <span className="font-semibold tabular-nums">{rupiah(row.total)}</span>
          <ChevronDown className="size-4 text-muted transition group-open:rotate-180" aria-hidden />
        </span>
      </summary>
      {row.lines.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          {row.posted ? "Belum ada catatan pada bulan ini." : "Belum disambungkan ke proses."}
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {row.lines.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 py-3 text-sm">
              <div className="min-w-0">
                <Link href={line.href} className="font-medium text-teal">
                  {line.title}
                </Link>
                <p className="text-muted">
                  {line.when}
                  {line.detail ? ` · ${line.detail}` : ""}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums">{rupiah(line.amount)}</p>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export function AccountLedgerPanel({ ledger }: { ledger: AccountLedger }) {
  const cards = [
    { label: "Penjualan produk", value: rupiah(ledger.income), hint: ledger.monthLabel },
    { label: "Beban", value: rupiah(ledger.expense), hint: "Harga pokok dan uang dari laci" },
    { label: "Keuntungan", value: rupiah(ledger.gap), hint: "Yang dibagi" },
  ];

  return (
    <>
      <section className="mt-4 grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <GlassCard key={card.label} className="p-4">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </GlassCard>
        ))}
      </section>
      <GlassCard className="mt-4 p-4">
        <SectionTitle icon={BookOpen} tone="teal">
          Pembagian keuntungan
        </SectionTitle>
        <p className="mt-3 text-sm leading-6 text-muted">
          Dihitung dari penjualan produk, dikurangi harga pokok dan uang yang diambil dari laci. Persentase mengikuti bagi hasil.
        </p>
        {ledger.shares.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Persentase belum diatur.{" "}
            <Link href="/bagi-hasil" className="font-semibold text-teal">
              Atur bagi hasil
            </Link>
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {ledger.shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <p>
                  <span className="font-medium">{share.name}</span>
                  <span className="ml-2 text-muted tabular-nums">{share.percent}%</span>
                </p>
                <p className="font-semibold tabular-nums">{rupiah(share.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
      <div className="mt-4 grid items-start gap-4 lg:grid-cols-3">
        {ACCOUNT_KINDS.map((kind) => {
          const rows = ledger.rows.filter((row) => row.kind === kind);
          return (
            <GlassCard key={kind} className="p-4">
              <SectionTitle icon={BookOpen} tone={kind === "pendapatan" ? "amber" : "teal"}>
                {accountKindLabel[kind]}
              </SectionTitle>
              {rows.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Belum ada akun {accountKindLabel[kind].toLowerCase()}.</p>
              ) : (
                <div className="mt-2">
                  {rows.map((row) => (
                    <AccountBlock key={row.id} row={row} />
                  ))}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>
    </>
  );
}
