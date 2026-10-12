"use client";

import { useMemo, useState, useActionState } from "react";
import { Receipt, ShoppingBag } from "lucide-react";
import { saveSaleAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { Product, WalkInSale } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

export function CashierPanel({
  products,
  sales,
  canWrite,
}: {
  products: Product[];
  sales: WalkInSale[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(saveSaleAction, null);
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([]);
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = products.find((item) => item.id === line.productId);
        return sum + (product ? product.price * line.qty : 0);
      }, 0),
    [lines, products],
  );

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="p-4">
          <SectionTitle icon={ShoppingBag}>Jual sparepart</SectionTitle>
          <form action={action} className="mt-3 flex flex-col gap-3">
            <input type="hidden" name="lines" value={JSON.stringify(lines)} />
            <div className="flex gap-2">
              <select id="sale-pick" className={inputClass} defaultValue="">
                <option value="">Pilih barang</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.code ? `${product.code} · ` : ""}
                    {product.name} · {rupiah(product.price)} · stok {product.stock}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="h-11 shrink-0 rounded-xl border border-line px-3 text-sm font-semibold"
                onClick={() => {
                  const select = document.getElementById("sale-pick") as HTMLSelectElement | null;
                  const productId = select?.value ?? "";
                  if (!productId) return;
                  setLines((current) => {
                    const found = current.find((line) => line.productId === productId);
                    if (found) {
                      return current.map((line) =>
                        line.productId === productId ? { ...line, qty: line.qty + 1 } : line,
                      );
                    }
                    return [...current, { productId, qty: 1 }];
                  });
                }}
              >
                Tambah
              </button>
            </div>
            <ul className="divide-y divide-line">
              {lines.map((line) => {
                const product = products.find((item) => item.id === line.productId);
                return (
                  <li key={line.productId} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>{product?.name}</span>
                    <input
                      inputMode="numeric"
                      value={line.qty}
                      className="h-11 w-20 rounded-xl border border-line bg-chip px-2 text-center"
                      onChange={(event) => {
                        const qty = Number(event.target.value);
                        setLines((current) =>
                          current
                            .map((item) => (item.productId === line.productId ? { ...item, qty } : item))
                            .filter((item) => item.qty > 0),
                        );
                      }}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="text-lg font-semibold tabular-nums">{rupiah(total)}</p>
            {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
            <SaveButton pending={pending} disabled={lines.length === 0}>
              Simpan penjualan
            </SaveButton>
          </form>
        </GlassCard>
      ) : null}
      <GlassCard className="p-4">
        <SectionTitle icon={Receipt} tone="teal">
          Penjualan walk-in
        </SectionTitle>
        {sales.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada penjualan.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {sales.map((sale) => (
              <li key={sale.id} className="py-3">
                <p className="font-medium">
                  {sale.no} · {sale.businessDate}
                </p>
                <p className="text-sm text-muted">{sale.lines.map((line) => `${line.name} × ${line.qty}`).join(", ")}</p>
                <p className="text-sm font-semibold text-amber tabular-nums">{rupiah(sale.total)}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
