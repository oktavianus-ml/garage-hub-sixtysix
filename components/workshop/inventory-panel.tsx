import { Warehouse } from "lucide-react";
import { rupiah } from "@/lib/data/format";
import type { Product } from "@/lib/data/records";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionTitle } from "@/components/ui/section-title";

export function InventoryPanel({ products }: { products: Product[] }) {
  const low = products.filter((product) => product.stock <= product.safetyStock);

  return (
    <div className="mt-5 grid gap-4">
      {low.length > 0 ? (
        <div className="rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
          {low.length} barang sudah di batas aman atau di bawahnya.
        </div>
      ) : null}
      <GlassCard className="p-4">
        <SectionTitle icon={Warehouse} tone="teal">
          Stok
        </SectionTitle>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada stok.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {products.map((product) => {
              const warn = product.stock <= product.safetyStock;
              return (
                <li key={product.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    {product.code ? <p className="text-xs font-semibold tracking-wide text-muted">{product.code}</p> : null}
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted">
                      Batas aman {product.safetyStock} {product.unit} · jual {rupiah(product.price)}
                    </p>
                  </div>
                  <p className={`font-semibold tabular-nums ${warn ? "text-danger" : "text-teal"}`}>
                    {product.stock}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
