import {
  AlertTriangle,
  Banknote,
  PackageCheck,
  PieChart,
  type LucideIcon,
} from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";

const kpis: Array<{
  label: string;
  value: string;
  hint: string;
  chip: string;
  icon: LucideIcon;
  warn?: boolean;
}> = [
  {
    label: "Penjualan hari ini",
    value: "Rp 4.850.000",
    hint: "Jasa dan sparepart",
    chip: "bg-amber-soft text-amber",
    icon: Banknote,
  },
  {
    label: "Barang laku",
    value: "37",
    hint: "12 jasa, 25 sparepart",
    chip: "bg-teal-soft text-teal",
    icon: PackageCheck,
  },
  {
    label: "Di bawah stok aman",
    value: "5",
    hint: "Perlu diorder ulang",
    chip: "bg-danger-soft text-danger",
    icon: AlertTriangle,
    warn: true,
  },
  {
    label: "Laba kotor",
    value: "Rp 1.620.000",
    hint: "Sebelum beban operasional",
    chip: "bg-amber-soft text-amber",
    icon: PieChart,
  },
];

const lowStock = [
  { name: "Kampas rem depan Beat", qty: 2, safe: 8 },
  { name: "Oli MPX 0.8L", qty: 3, safe: 12 },
  { name: "Busi NGK CPR6EA-9", qty: 4, safe: 10 },
  { name: "Rantai SSS 428", qty: 1, safe: 6 },
  { name: "Filter udara Vario", qty: 2, safe: 8 },
];

const sold = [
  { name: "Servis ringan Beat", note: "B 4021 KX", amount: "Rp 185.000" },
  { name: "Oli MPX 0.8L × 2", note: "Walk-in", amount: "Rp 126.000" },
  { name: "Kampas rem + ganti", note: "D 1184 FY", amount: "Rp 240.000" },
  { name: "Busi NGK × 4", note: "Walk-in", amount: "Rp 96.000" },
];

export function DashboardHome() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan barang laku dan stok hari ini. Angka di halaman ini contoh, bukan data bengkel."
        example
      />

      <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => {
          const Icon = item.icon;
          return (
            <GlassCard key={item.label} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm text-muted">{item.label}</p>
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${item.chip}`}
                >
                  <Icon className="size-4" aria-hidden />
                </span>
              </div>
              <p
                className={`mt-3 text-2xl font-semibold tracking-tight tabular-nums ${
                  item.warn ? "text-danger" : "text-ink"
                }`}
              >
                {item.value}
              </p>
              <p className="mt-1 text-xs text-muted">{item.hint}</p>
            </GlassCard>
          );
        })}
      </section>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-danger" aria-hidden />
        <p className="text-sm leading-6">
          5 barang sudah di bawah stok aman. Daftar ini contoh; pengingat order
          menyusul di inventori.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-4 md:p-5">
          <h2 className="text-base font-semibold">Di bawah stok aman</h2>
          <p className="mt-1 text-xs text-muted">Contoh batas aman per barang</p>
          <ul className="mt-2 divide-y divide-line">
            {lowStock.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted">Batas aman {item.safe}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-danger tabular-nums">
                  sisa {item.qty}
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>

        <GlassCard className="p-4 md:p-5">
          <h2 className="text-base font-semibold">Barang laku</h2>
          <p className="mt-1 text-xs text-muted">Contoh gerak hari ini</p>
          <ul className="mt-2 divide-y divide-line">
            {sold.map((item) => (
              <li
                key={item.name}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted">{item.note}</p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-amber tabular-nums">
                  {item.amount}
                </p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>
    </div>
  );
}
