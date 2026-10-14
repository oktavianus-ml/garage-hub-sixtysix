"use client";

import { useActionState, useMemo, useState } from "react";
import { Search, Warehouse } from "lucide-react";
import { saveSafetyStockAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { Product } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionTitle } from "@/components/ui/section-title";

type StockStatus = "habis" | "perlu" | "aman";
type StockFilter = "semua" | StockStatus;

const STATUS_ORDER: StockStatus[] = ["habis", "perlu", "aman"];

const STATUS_LABEL: Record<StockStatus, string> = {
  habis: "Habis",
  perlu: "Perlu order",
  aman: "Aman",
};

const FILTERS: { id: StockFilter; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "habis", label: "Habis" },
  { id: "perlu", label: "Perlu order" },
  { id: "aman", label: "Aman" },
];

const COLUMNS =
  "md:grid-cols-[minmax(9rem,1.5fr)_minmax(5.5rem,1fr)_minmax(6.5rem,0.9fr)_minmax(9rem,1.2fr)_minmax(6.5rem,1fr)_minmax(5rem,0.8fr)]";

function stockStatus(product: Product): StockStatus {
  if (product.stock <= 0) return "habis";
  if (product.safetyStock > 0 && product.stock <= product.safetyStock) return "perlu";
  return "aman";
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesQuery(product: Product, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  return [product.name, product.code].some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

function SafetyStockField({ product }: { product: Product }) {
  const [state, action, pending] = useActionState(saveSafetyStockAction, null);
  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="id" value={product.id} />
      <input
        key={product.safetyStock}
        name="safetyStock"
        defaultValue={product.safetyStock}
        inputMode="numeric"
        aria-label={`Batas aman ${product.name}`}
        className="h-9 w-16 rounded-xl border border-line bg-field px-2 text-center text-sm tabular-nums"
      />
      <span className="text-xs text-muted">{product.unit}</span>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-xl px-2.5 text-xs font-semibold text-amber disabled:opacity-60"
      >
        {pending ? "Menyimpan" : "Simpan"}
      </button>
      {state?.message ? (
        <span className={cn("basis-full text-[11px]", state.ok ? "text-teal" : "text-danger")}>{state.message}</span>
      ) : null}
    </form>
  );
}

function StatusPill({ status }: { status: StockStatus }) {
  const warn = status !== "aman";
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        warn ? "bg-danger-soft text-danger" : "bg-teal-soft text-teal",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function InventoryPanel({ products, canWrite }: { products: Product[]; canWrite: boolean }) {
  const [filter, setFilter] = useState<StockFilter>("semua");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const next = { semua: products.length, habis: 0, perlu: 0, aman: 0 };
    for (const product of products) next[stockStatus(product)] += 1;
    return next;
  }, [products]);

  const groups = useMemo(() => {
    const visible = products.filter(
      (product) => (filter === "semua" || stockStatus(product) === filter) && matchesQuery(product, query),
    );
    return STATUS_ORDER.map((status) => ({
      status,
      rows: visible
        .filter((product) => stockStatus(product) === status)
        .sort((a, b) => a.stock - b.stock || a.name.localeCompare(b.name)),
    })).filter((group) => group.rows.length > 0);
  }, [products, filter, query]);

  const visibleCount = groups.reduce((total, group) => total + group.rows.length, 0);

  return (
    <div className="mt-5 grid gap-4">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {FILTERS.map((item) => {
          const selected = filter === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(selected && item.id !== "semua" ? "semua" : item.id)}
              className={cn("glass rounded-2xl p-4 text-left", selected && "border-t-2 border-t-amber")}
              aria-pressed={selected}
            >
              <p className="text-sm text-muted">{item.label}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{counts[item.id]}</p>
              <p className="mt-1 text-xs text-muted">
                {item.id === "semua"
                  ? selected
                    ? "Menampilkan semua"
                    : "Klik untuk menampilkan semua"
                  : selected
                    ? "Menyaring daftar"
                    : "Klik untuk menyaring"}
              </p>
            </button>
          );
        })}
      </section>

      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle icon={Warehouse} tone="teal">
            Stok
          </SectionTitle>
          {products.length > 0 ? (
            <p className="text-xs font-medium text-muted">
              {visibleCount === products.length ? `${products.length} barang` : `${visibleCount} dari ${products.length}`}
            </p>
          ) : null}
        </div>

        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada stok.</p>
        ) : (
          <>
            <label className="relative mt-3 block">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau kode"
                className={cn(inputClass, "pl-10")}
              />
            </label>

            {visibleCount === 0 ? (
              <p className="mt-3 text-sm text-muted">Tidak ada barang yang cocok.</p>
            ) : (
              <div className="mt-2">
                <div className={cn("hidden px-1 pt-2 text-xs font-semibold text-muted md:grid", COLUMNS)}>
                  <span>Barang</span>
                  <span>Kode</span>
                  <span>Status</span>
                  <span>Batas aman</span>
                  <span>Harga jual</span>
                  <span className="text-right">Stok</span>
                </div>
                {groups.map((group) => (
                  <section key={group.status}>
                    <p className="pt-3 text-xs font-semibold text-muted">
                      {STATUS_LABEL[group.status]} · {group.rows.length}
                    </p>
                    <ul className="divide-y divide-line">
                      {group.rows.map((product) => {
                        const status = stockStatus(product);
                        const warn = status !== "aman";
                        return (
                          <li key={product.id} className="py-3">
                            <div className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5", COLUMNS)}>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{product.name}</p>
                              </div>
                              <p className="hidden truncate text-sm font-semibold tracking-wide text-muted md:block">
                                {product.code || "—"}
                              </p>
                              <div className="hidden md:block">
                                <StatusPill status={status} />
                              </div>
                              <div className="hidden md:block">
                                {canWrite ? (
                                  <SafetyStockField product={product} />
                                ) : (
                                  <p className="text-sm tabular-nums">
                                    {product.safetyStock} {product.unit}
                                  </p>
                                )}
                              </div>
                              <p className="hidden text-sm tabular-nums md:block">{rupiah(product.price)}</p>
                              <p
                                className={cn(
                                  "text-right text-lg font-semibold tabular-nums",
                                  warn ? "text-danger" : "text-teal",
                                )}
                              >
                                {product.stock}
                                <span className="ml-1 text-xs font-medium">{product.unit}</span>
                              </p>
                              <div className="col-span-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted md:hidden">
                                {product.code ? <span className="font-semibold tracking-wide">{product.code}</span> : null}
                                <StatusPill status={status} />
                                {canWrite ? (
                                  <SafetyStockField product={product} />
                                ) : (
                                  <span>
                                    Batas aman {product.safetyStock} {product.unit}
                                  </span>
                                )}
                                <span>{rupiah(product.price)}</span>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}
