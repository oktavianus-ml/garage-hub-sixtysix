"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { List, PackagePlus, Pencil, Search } from "lucide-react";
import { saveSupplyItemAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { SUPPLY_UNITS } from "@/lib/data/supply";
import type { SupplyItem } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 8;

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesQuery(item: SupplyItem, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  return [item.name, item.unit].some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

export function SupplyItemsPanel({ items, canWrite }: { items: SupplyItem[]; canWrite: boolean }) {
  const [state, action, pending] = useActionState(saveSupplyItemAction, null);
  const [editing, setEditing] = useState<SupplyItem | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<string>("pcs");
  const [cost, setCost] = useState("");
  const snapshot = items.map((item) => `${item.id}:${item.name}:${item.unit}:${item.cost}`).join("|");

  function beginEdit(item: SupplyItem) {
    setEditing(item);
    setName(item.name);
    setUnit(item.unit);
    setCost(String(item.cost));
  }

  function cancelEdit() {
    setEditing(null);
    setName("");
    setUnit("pcs");
    setCost("");
  }

  useEffect(() => {
    setEditing(null);
    setName("");
    setUnit("pcs");
    setCost("");
  }, [snapshot]);

  return (
    <div className={cn("mt-5 grid items-start gap-4", canWrite && "lg:grid-cols-2")}>
      {canWrite ? (
        <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
          <SectionTitle icon={editing ? Pencil : PackagePlus} tone={editing ? "teal" : "amber"}>
            {editing ? "Ubah barang" : "Barang baru"}
          </SectionTitle>
          <p className="mt-3 text-sm leading-6 text-muted">
            Daftarkan perlengkapan sekali. Saat order, barang yang sama tinggal dipilih lagi. Stok jual tidak bertambah.
          </p>
          <form action={action} className="mt-3 flex flex-col gap-3">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Nama barang, misalnya kertas struk"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                name="unit"
                aria-label="Satuan"
                className={inputClass}
                value={SUPPLY_UNITS.includes(unit as (typeof SUPPLY_UNITS)[number]) ? unit : "pcs"}
                onChange={(event) => setUnit(event.target.value)}
              >
                {SUPPLY_UNITS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                name="cost"
                required
                inputMode="numeric"
                placeholder="Harga beli"
                className={inputClass}
                value={cost}
                onChange={(event) => setCost(event.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
            <div className="flex gap-2">
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
                {editing ? "Simpan perubahan" : "Simpan barang"}
              </SaveButton>
            </div>
          </form>
        </GlassCard>
      ) : null}
      <SupplyDirectory items={items} canWrite={canWrite} editingId={editing?.id ?? ""} onEdit={beginEdit} />
    </div>
  );
}

function SupplyDirectory({
  items,
  canWrite,
  editingId,
  onEdit,
}: {
  items: SupplyItem[];
  canWrite: boolean;
  editingId: string;
  onEdit: (item: SupplyItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(() => items.filter((item) => matchesQuery(item, query)), [items, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visible.length;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={List} tone="teal">
          Daftar
        </SectionTitle>
        {items.length > 0 ? (
          <p className="text-xs font-medium text-muted">
            {filtered.length === items.length ? `${items.length} barang` : `${filtered.length} dari ${items.length}`}
          </p>
        ) : null}
      </div>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada barang pengadaan.</p>
      ) : (
        <>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Cari nama barang"
              className={cn(inputClass, "pl-10")}
            />
          </label>
          {visible.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada barang yang cocok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((item) => {
                const editingThis = editingId === item.id;
                return (
                  <li key={item.id} className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium">{item.name}</p>
                        {canWrite ? (
                          <button type="button" className="text-xs font-semibold text-teal" onClick={() => onEdit(item)}>
                            Ubah
                          </button>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{rupiah(item.cost)}</p>
                    </div>
                    <p className="text-xs text-muted">{item.unit}</p>
                  </li>
                );
              })}
            </ul>
          )}
          {filtered.length > PAGE_SIZE ? (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-muted">
                {rangeStart}–{rangeEnd} dari {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  );
}
