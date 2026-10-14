import { AlertTriangle, Banknote, PackageCheck, PieChart, Store, Wallet } from "lucide-react";
import { rupiah } from "@/lib/data/format";
import type { Product } from "@/lib/data/records";
import type { ProfitShare } from "@/lib/data/profit-split";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";
import { LiveRefresh } from "@/components/dashboard/live-refresh";

type Movement = { title: string; note: string; amount: number };

const SHARE_COLORS = ["bg-amber", "bg-teal", "bg-ink", "bg-danger", "bg-muted"] as const;

function percentText(part: number, whole: number) {
  if (whole <= 0) return "—";
  const value = (part / whole) * 100;
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)}%`;
}

function clockLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DashboardHome({
  day,
  revenue,
  labor,
  partQty,
  jobs,
  cogs,
  gross,
  cashOut,
  net,
  shares,
  updatedAt,
  lowStock,
  movements,
  hasActivity,
  canSeeSplit,
}: {
  day: string;
  revenue: number;
  labor: number;
  partQty: number;
  jobs: number;
  cogs: number;
  gross: number;
  cashOut: number;
  net: number;
  shares: ProfitShare[];
  updatedAt: string;
  lowStock: Product[];
  movements: Movement[];
  hasActivity: boolean;
  canSeeSplit: boolean;
}) {
  if (!hasActivity) {
    return (
      <div>
        <LiveRefresh />
        <PageHeader title="Dashboard" description={`Belum ada transaksi pada ${day}.`} href="/" />
        <GlassCard className="mt-5 px-6 py-14 text-center">
          <span className="mx-auto inline-flex size-11 items-center justify-center rounded-xl bg-amber-soft text-amber">
            <Store className="size-5" aria-hidden />
          </span>
          <p className="mt-3 text-base font-semibold">Bengkel masih kosong</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
            Tambah pelanggan, motor, dan produk. Penjualan hari ini akan muncul di sini.
          </p>
        </GlassCard>
      </div>
    );
  }

  const partsRevenue = revenue - labor;
  const grossMargin = percentText(gross, revenue);
  const netMargin = percentText(net, revenue);
  const kept = Math.max(net, 0);
  const barTotal = cogs + cashOut + kept;
  const barParts = [
    { key: "cogs", label: "Harga pokok", amount: cogs, color: "color-mix(in srgb, var(--ink) 42%, transparent)" },
    { key: "cash", label: "Pengeluaran kas", amount: cashOut, color: "var(--danger)" },
    { key: "net", label: "Laba bersih", amount: kept, color: "var(--teal)" },
  ].filter((part) => part.amount > 0);
  const shareTotal = shares.reduce((sum, share) => sum + share.percent, 0);
  const clock = clockLabel(updatedAt);

  const cards = [
    {
      label: "Omzet",
      value: rupiah(revenue),
      hint: "Jasa dan sparepart",
      chip: "bg-amber-soft text-amber",
      icon: Banknote,
      warn: false,
    },
    {
      label: "Barang laku",
      value: String(partQty),
      hint: `${jobs} jasa tercatat`,
      chip: "bg-teal-soft text-teal",
      icon: PackageCheck,
      warn: false,
    },
    {
      label: "Laba kotor",
      value: rupiah(gross),
      hint: `Margin ${grossMargin} · sebelum pengeluaran kas`,
      chip: "bg-amber-soft text-amber",
      icon: PieChart,
      warn: gross < 0,
    },
    {
      label: "Laba bersih",
      value: rupiah(net),
      hint: `Margin ${netMargin} · setelah pengeluaran kas`,
      chip: "bg-teal-soft text-teal",
      icon: Wallet,
      warn: net < 0,
    },
  ];

  return (
    <div>
      <LiveRefresh />
      <PageHeader
        title="Dashboard"
        description={`Omzet, laba, dan bagi hasil untuk ${day}.`}
        href="/"
      />
      <p className="mt-3 flex items-center gap-2 text-xs text-muted">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-teal opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-teal" />
        </span>
        Angka mengikuti transaksi hari ini{clock ? ` · diperbarui ${clock}` : ""}. Dimuat ulang otomatis.
      </p>
      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => {
          const Icon = item.icon;
          return (
            <GlassCard key={item.label} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted">{item.label}</p>
                <span className={`inline-flex size-9 items-center justify-center rounded-xl ${item.chip}`}>
                  <Icon className="size-4" aria-hidden />
                </span>
              </div>
              <p className={`mt-3 text-2xl font-semibold tabular-nums ${item.warn ? "text-danger" : ""}`}>
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            </GlassCard>
          );
        })}
      </section>

      <GlassCard className="mt-4 p-4 md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle icon={PieChart} tone="teal">
            Komposisi keuntungan
          </SectionTitle>
          <div className="flex gap-4 text-right">
            <div>
              <p className="text-xs text-muted">Margin kotor</p>
              <p className="text-lg font-semibold tabular-nums">{grossMargin}</p>
            </div>
            <div>
              <p className="text-xs text-muted">Margin bersih</p>
              <p className={`text-lg font-semibold tabular-nums ${net < 0 ? "text-danger" : ""}`}>{netMargin}</p>
            </div>
          </div>
        </div>
        <p className="mt-3 text-sm text-muted">
          Jasa {rupiah(labor)} · sparepart {rupiah(partsRevenue)}
        </p>
        {revenue <= 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada penjualan hari ini, jadi persentase keuntungan belum bisa dihitung.</p>
        ) : (
          <>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label="Komposisi omzet">
              {barParts.map((part) => (
                <div
                  key={part.key}
                  style={{ width: `${(part.amount / barTotal) * 100}%`, background: part.color }}
                />
              ))}
            </div>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
              {barParts.map((part) => (
                <li key={part.key} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: part.color }} aria-hidden />
                  {part.label} {rupiah(part.amount)} · {percentText(part.amount, barTotal)}
                </li>
              ))}
            </ul>
            {net < 0 ? (
              <p className="mt-2 text-sm text-danger">
                Laba bersih minus {rupiah(Math.abs(net))}. Pengeluaran dan harga pokok melebihi omzet.
              </p>
            ) : null}
          </>
        )}

        {canSeeSplit ? (
          <div className="mt-5 border-t border-line pt-5">
            <h3 className="text-sm font-semibold">Pembagian hasil hari ini</h3>
            <p className="mt-1 text-xs leading-5 text-muted">
              Dihitung dari laba bersih memakai persentase yang tersimpan. Angka resmi tetap dikunci di akhir bulan.
            </p>
            {shares.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Persentase bagi hasil belum diatur.</p>
            ) : (
              <>
                <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-line" role="img" aria-label="Pembagian hasil">
                  {shares.map((share, index) => (
                    <div
                      key={`${share.id}-${index}`}
                      className={SHARE_COLORS[index % SHARE_COLORS.length]}
                      style={{ width: shareTotal > 0 ? `${(share.percent / shareTotal) * 100}%` : "0%" }}
                    />
                  ))}
                </div>
                <ul className="mt-3 divide-y divide-line">
                  {shares.map((share, index) => (
                    <li key={`${share.id}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                      <p className="flex min-w-0 items-center gap-2 text-sm">
                        <span
                          className={`size-2.5 shrink-0 rounded-full ${SHARE_COLORS[index % SHARE_COLORS.length]}`}
                          aria-hidden
                        />
                        <span className="truncate font-medium">{share.name}</span>
                        <span className="text-muted tabular-nums">{share.percent}%</span>
                      </p>
                      <p className={`text-sm font-semibold tabular-nums ${share.amount < 0 ? "text-danger" : ""}`}>
                        {rupiah(share.amount)}
                      </p>
                    </li>
                  ))}
                </ul>
                {shareTotal !== 100 ? (
                  <p className="mt-2 text-xs text-danger">Total persentase sekarang {shareTotal}. Atur sampai 100 di halaman Bagi hasil.</p>
                ) : null}
              </>
            )}
          </div>
        ) : null}
      </GlassCard>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-4 md:p-5">
          <SectionTitle icon={AlertTriangle} tone="danger">
            Di bawah stok aman{lowStock.length > 0 ? ` · ${lowStock.length}` : ""}
          </SectionTitle>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Semua barang masih di atas batas aman.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{item.name}</span>
                      {item.code ? (
                        <span className="text-xs font-semibold tracking-wide text-muted">{item.code}</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted">Batas aman {item.safetyStock}</p>
                  </div>
                  <p className="text-sm font-semibold text-danger tabular-nums">sisa {item.stock}</p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
        <GlassCard className="p-4 md:p-5">
          <SectionTitle icon={PackageCheck} tone="teal">
            Barang laku
          </SectionTitle>
          {movements.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada pembayaran hari ini.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {movements.map((item) => (
                <li key={item.title} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="truncate text-xs text-muted">{item.note}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber tabular-nums">{rupiah(item.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
