"use client";

import { useActionState } from "react";
import { saveProductAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { Product } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { GlassCard } from "@/components/ui/glass-card";

export function ProductsPanel({
  products,
  canWrite,
}: {
  products: Product[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(saveProductAction, null);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="p-4">
          <h2 className="text-base font-semibold">Produk</h2>
          <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Nama barang" className={`${inputClass} sm:col-span-2`} />
            <input name="unit" placeholder="Satuan" defaultValue="pcs" className={inputClass} />
            <input name="stock" required inputMode="numeric" placeholder="Stok" className={inputClass} />
            <input name="cost" required inputMode="numeric" placeholder="Harga pokok" className={inputClass} />
            <input name="price" required inputMode="numeric" placeholder="Harga jual" className={inputClass} />
            <input
              name="safetyStock"
              required
              inputMode="numeric"
              placeholder="Batas aman"
              className={`${inputClass} sm:col-span-2`}
            />
            {state?.message ? <p className="text-sm text-danger sm:col-span-2">{state.message}</p> : null}
            <SaveButton pending={pending} className="sm:col-span-2">
              Simpan produk
            </SaveButton>
          </form>
        </GlassCard>
      ) : null}
      <GlassCard className="p-4">
        <h2 className="text-base font-semibold">Daftar harga</h2>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada produk.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {products.map((product) => (
              <li key={product.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-xs text-muted">
                    Pokok {rupiah(product.cost)} · jual {rupiah(product.price)}
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">stok {product.stock}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
