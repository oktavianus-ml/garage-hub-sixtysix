"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PackagePlus, Pencil, Tags } from "lucide-react";
import { saveProductAction, setProductCashierQuickAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { Distributor, Product } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { MoneyInput } from "@/components/ui/money-input";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const UNITS = ["pcs", "box", "set", "liter", "botol", "kaleng", "tube", "pasang", "roll", "meter"] as const;

function QuickButton({ product, canWrite }: { product: Product; canWrite: boolean }) {
  const [state, action, pending] = useQueuedAction(setProductCashierQuickAction, "setProductCashierQuick");
  const on = product.cashierQuick;
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="id" value={product.id} />
      <input type="hidden" name="cashierQuick" value={on ? "0" : "1"} />
      <button
        type="submit"
        disabled={!canWrite || pending}
        className={cn(
          "inline-flex h-9 items-center justify-center rounded-xl border px-3 text-xs font-semibold whitespace-nowrap disabled:opacity-60",
          on ? "border-teal/25 bg-teal-soft text-teal" : "border-line bg-chip text-muted",
        )}
      >
        {pending ? "Menyimpan" : on ? "Di kasir" : "Tampil cepat"}
      </button>
      {state?.message && !state.ok ? <p className="mt-1 text-right text-[11px] text-danger">{state.message}</p> : null}
    </form>
  );
}

export function ProductsPanel({
  products,
  distributors,
  canWrite,
}: {
  products: Product[];
  distributors: Distributor[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useQueuedAction(saveProductAction, "saveProduct");
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [unit, setUnit] = useState<string>("pcs");
  const [cost, setCost] = useState("");
  const [price, setPrice] = useState("");
  const [distributorId, setDistributorId] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const snapshot = products
    .map(
      (item) =>
        `${item.id}:${item.code}:${item.name}:${item.unit}:${item.cost}:${item.price}:${item.distributorId}`,
    )
    .join("|");

  function beginEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setCode(product.code);
    setUnit(product.unit || "pcs");
    setCost(String(product.cost));
    setPrice(String(product.price));
    setDistributorId(product.distributorId);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setName("");
    setCode("");
    setUnit("pcs");
    setCost("");
    setPrice("");
    setDistributorId("");
  }

  useEffect(() => {
    setEditing(null);
    setName("");
    setCode("");
    setUnit("pcs");
    setCost("");
    setPrice("");
    setDistributorId("");
  }, [snapshot]);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {canWrite ? (
        <div ref={formRef}>
          <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
            <SectionTitle icon={editing ? Pencil : PackagePlus} tone={editing ? "teal" : "amber"}>
              {editing ? "Ubah produk" : "Produk"}
            </SectionTitle>
            {distributors.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-muted">
                Tambah pemasok dulu di menu{" "}
                <Link href="/distributor" className="font-semibold text-teal">
                  Distributor
                </Link>
                . Setiap barang melekat ke satu distributor.
              </p>
            ) : (
              <form action={action} className="mt-3 grid gap-3 sm:grid-cols-2">
                {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
                <input
                  name="name"
                  required
                  placeholder="Nama barang"
                  className={`${inputClass} sm:col-span-2`}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <input
                  name="code"
                  required
                  placeholder="Kode produk"
                  className={`${inputClass} sm:col-span-2`}
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
                <select
                  name="unit"
                  aria-label="Satuan"
                  className={`${inputClass} sm:col-span-2`}
                  value={unit || "pcs"}
                  onChange={(event) => setUnit(event.target.value)}
                >
                  {!UNITS.includes(unit as (typeof UNITS)[number]) && unit ? (
                    <option value={unit}>{unit}</option>
                  ) : null}
                  {UNITS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
                <select
                  name="distributorId"
                  required
                  aria-label="Distributor"
                  className={`${inputClass} sm:col-span-2`}
                  value={distributorId}
                  onChange={(event) => setDistributorId(event.target.value)}
                >
                  <option value="" disabled>
                    Pilih distributor
                  </option>
                  {editing && distributorId && !distributors.some((item) => item.id === distributorId) ? (
                    <option value={distributorId}>Distributor tidak ada</option>
                  ) : null}
                  {distributors.map((distributor) => (
                    <option key={distributor.id} value={distributor.id}>
                      {distributor.name}
                    </option>
                  ))}
                </select>
                <MoneyInput
                  name="cost"
                  required
                  placeholder="Harga pokok"
                  value={cost}
                  onValueChange={setCost}
                />
                <MoneyInput
                  name="price"
                  required
                  placeholder="Harga jual"
                  value={price}
                  onValueChange={setPrice}
                />
                <p className="text-sm leading-6 text-muted sm:col-span-2">
                  Barang ini hanya muncul saat minta barang ke distributor yang dipilih.
                </p>
                <FormMessage state={state} className="sm:col-span-2" />
                <div className="flex gap-2 sm:col-span-2">
                  {editing ? (
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                      onClick={cancelEdit}
                    >
                      Batal
                    </button>
                  ) : null}
                  <SaveButton pending={pending} className="flex-1">
                    {editing ? "Simpan perubahan" : "Simpan produk"}
                  </SaveButton>
                </div>
              </form>
            )}
          </GlassCard>
        </div>
      ) : null}
      <GlassCard className="p-4">
        <SectionTitle icon={Tags} tone="teal">
          Daftar harga
        </SectionTitle>
        <p className="mt-1 text-sm leading-6 text-muted">
          Tombol tampil cepat menaruh barang di kartu kecil kasir.
        </p>
        {products.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada produk.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {products.map((product) => {
              const distributor = distributors.find((item) => item.id === product.distributorId);
              const editingThis = editing?.id === product.id;
              return (
                <li
                  key={product.id}
                  className={cn(
                    "flex items-center justify-between gap-3 py-3",
                    editingThis && "-mx-2 rounded-xl bg-teal-soft px-2",
                  )}
                >
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-medium">{product.name}</span>
                      {product.code ? (
                        <span className="text-xs font-semibold tracking-wide text-muted">{product.code}</span>
                      ) : null}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                      <span className="rounded-md bg-amber-soft px-1.5 py-0.5 font-semibold text-amber">
                        Pokok {rupiah(product.cost)}
                      </span>
                      <span className="rounded-md bg-teal-soft px-1.5 py-0.5 font-semibold text-teal">
                        Jual {rupiah(product.price)}
                      </span>
                      <span>
                        {product.unit} · {distributor?.name ?? "Belum ada distributor"}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {canWrite ? (
                      <button
                        type="button"
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-amber/25 bg-amber-soft px-3 text-xs font-semibold whitespace-nowrap text-ink"
                        onClick={() => beginEdit(product)}
                      >
                        Ubah
                      </button>
                    ) : null}
                    <QuickButton product={product} canWrite={canWrite} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
