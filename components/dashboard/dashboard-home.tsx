import { AlertTriangle, Banknote, PackageCheck, PieChart, Store } from "lucide-react";
import { rupiah } from "@/lib/data/format";
import type { Product } from "@/lib/data/records";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";
import { SectionTitle } from "@/components/ui/section-title";

type Movement = { title: string; note: string; amount: number };

export function DashboardHome({
  day,
  revenue,
  partQty,
  jobs,
  gross,
  lowStock,
  movements,
  hasActivity,
}: {
  day: string;
  revenue: number;
  partQty: number;
  jobs: number;
  gross: number;
  lowStock: Product[];
  movements: Movement[];
  hasActivity: boolean;
}) {
  if (!hasActivity) {
    return (
      <div>
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

  const cards = [
    {
      label: "Penjualan hari ini",
      value: rupiah(revenue),
      hint: "Jasa dan sparepart",
      chip: "bg-amber-soft text-amber",
      icon: Banknote,
    },
    {
      label: "Barang laku",
      value: String(partQty),
      hint: `${jobs} jasa tercatat`,
      chip: "bg-teal-soft text-teal",
      icon: PackageCheck,
    },
    {
      label: "Di bawah stok aman",
      value: String(lowStock.length),
      hint: "Perlu diorder ulang",
      chip: "bg-danger-soft text-danger",
      icon: AlertTriangle,
      warn: true,
    },
    {
      label: "Laba kotor",
      value: rupiah(gross),
      hint: "Sebelum pengeluaran kas",
      chip: "bg-amber-soft text-amber",
      icon: PieChart,
    },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description={`Angka sungguhan untuk ${day}.`} href="/" />
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
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-4 md:p-5">
          <SectionTitle icon={AlertTriangle} tone="danger">
            Di bawah stok aman
          </SectionTitle>
          {lowStock.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Semua barang masih di atas batas aman.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {lowStock.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    {item.code ? <p className="text-xs font-semibold tracking-wide text-muted">{item.code}</p> : null}
                    <p className="text-sm font-medium">{item.name}</p>
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
