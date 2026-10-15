"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { PackagePlus, Tags } from "lucide-react";
import { saveProductAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { Product } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const UNITS = ["pcs", "box", "set", "liter", "botol", "kaleng", "tube", "pasang", "roll", "meter"] as const;

export function ProductsPanel({
  products,
  canWrite,
}: {
  products: Product[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useQueuedAction(saveProductAction, "saveProduct");

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="p-4">
          <SectionTitle icon={PackagePlus}>Produk</SectionTitle>
          <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="name" required placeholder="Nama barang" className={`${inputClass} sm:col-span-2`} />
            <input name="code" required placeholder="Kode produk" className={`${inputClass} sm:col-span-2`} />
            <select name="unit" aria-label="Satuan" className={`${inputClass} sm:col-span-2`} defaultValue="pcs">
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
            <input name="cost" required inputMode="numeric" placeholder="Harga pokok" className={inputClass} />
            <input name="price" required inputMode="numeric" placeholder="Harga jual" className={inputClass} />
            <FormMessage state={state} className="sm:col-span-2" />
            <SaveButton pending={pending} className="sm:col-span-2">
              Simpan produk
            </SaveButton>
          </form>
        </GlassCard>
      ) : null}
      <GlassCard className="p-4">
        <SectionTitle icon={Tags} tone="teal">
          Daftar harga
        </SectionTitle>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada produk.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {products.map((product) => (
              <li key={product.id} className="py-3">
                <p className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">{product.name}</span>
                  {product.code ? (
                    <span className="text-xs font-semibold tracking-wide text-muted">{product.code}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted">
                  Pokok {rupiah(product.cost)} · jual {rupiah(product.price)} · {product.unit}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
