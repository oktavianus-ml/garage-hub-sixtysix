"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { List, Pencil, Plus, ScrollText, Search } from "lucide-react";
import { saveProcurementAction } from "@/lib/data/actions";
import { jakartaDate, monthKeyOf, rupiah } from "@/lib/data/format";
import type { Procurement } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 6;
const UNITS = ["pcs", "roll", "box", "rim", "pak", "liter"];

type DraftLine = { key: string; name: string; unit: string; qty: number; cost: number };

function blankLine(key = "draft"): DraftLine {
  return { key, name: "", unit: "pcs", qty: 1, cost: 0 };
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shortDay(day: string) {
  const date = new Date(`${day}T12:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return day;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function matchesQuery(record: Procurement, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  const fields = [record.no, record.vendor, record.note, ...record.lines.map((line) => line.name)];
  return fields.some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

export function ProcurementPanel({
  records,
  canWrite,
}: {
  records: Procurement[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(saveProcurementAction, null);
  const [editing, setEditing] = useState<Procurement | null>(null);
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [boughtOn, setBoughtOn] = useState(jakartaDate());
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const snapshot = records
    .map((item) =>
      [
        item.id,
        item.vendor,
        item.note,
        item.boughtOn,
        item.lines.map((line) => `${line.name}:${line.qty}:${line.unit}:${line.cost}`).join(","),
      ].join(":"),
    )
    .join("|");
  const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
  const ready =
    vendor.trim().length >= 2 &&
    lines.some((line) => line.name.trim().length >= 2 && line.qty > 0);

  function beginEdit(record: Procurement) {
    setEditing(record);
    setVendor(record.vendor);
    setNote(record.note);
    setBoughtOn(record.boughtOn);
    setLines(
      record.lines.map((line, index) => ({
        key: `${record.id}-${index}`,
        name: line.name,
        unit: line.unit,
        qty: line.qty,
        cost: line.cost,
      })),
    );
  }

  function cancelEdit() {
    setEditing(null);
    setVendor("");
    setNote("");
    setBoughtOn(jakartaDate());
    setLines([blankLine()]);
  }

  useEffect(() => {
    setEditing(null);
    setVendor("");
    setNote("");
    setBoughtOn(jakartaDate());
    setLines([blankLine()]);
  }, [snapshot]);

  function patchLine(key: string, patch: Partial<DraftLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  }

  return (
    <div className={cn("mt-5 grid items-start gap-4", canWrite && "xl:grid-cols-2")}>
      {canWrite ? (
        <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
          <SectionTitle icon={editing ? Pencil : ScrollText} tone={editing ? "teal" : "amber"}>
            {editing ? "Ubah pengadaan" : "Pengadaan baru"}
          </SectionTitle>
          <p className="mt-3 text-sm leading-6 text-muted">
            Catat perlengkapan yang tidak dijual, seperti kertas struk dan lakban. Stok produk tidak bertambah.
          </p>
          <form action={action} className="mt-3 flex flex-col gap-3">
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
            <input
              type="hidden"
              name="lines"
              value={JSON.stringify(
                lines
                  .filter((line) => line.name.trim())
                  .map((line) => ({ name: line.name.trim(), unit: line.unit, qty: line.qty, cost: line.cost })),
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                name="vendor"
                required
                maxLength={80}
                placeholder="Toko atau tempat beli"
                className={inputClass}
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
              />
              <input
                name="boughtOn"
                type="date"
                required
                max={jakartaDate()}
                className={inputClass}
                value={boughtOn}
                onChange={(event) => setBoughtOn(event.target.value)}
              />
            </div>
            <ul className="divide-y divide-line">
              {lines.map((line) => (
                <li key={line.key} className="flex flex-col gap-2 py-3">
                  <div className="flex items-start gap-2">
                    <input
                      aria-label="Nama barang"
                      maxLength={80}
                      placeholder="Nama barang"
                      className={inputClass}
                      value={line.name}
                      onChange={(event) => patchLine(line.key, { name: event.target.value })}
                    />
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        className="h-11 shrink-0 px-2 text-xs font-semibold text-danger"
                        onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                      >
                        Hapus
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      inputMode="numeric"
                      aria-label={`Jumlah ${line.name || "barang"}`}
                      value={line.qty}
                      className="h-11 w-20 rounded-xl border border-line bg-chip px-2 text-center tabular-nums"
                      onChange={(event) => {
                        const qty = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                        patchLine(line.key, { qty });
                      }}
                    />
                    <select
                      aria-label={`Satuan ${line.name || "barang"}`}
                      className="h-11 rounded-xl border border-line bg-chip px-2 text-sm"
                      value={line.unit}
                      onChange={(event) => patchLine(line.key, { unit: event.target.value })}
                    >
                      {(UNITS.includes(line.unit) ? UNITS : [line.unit, ...UNITS]).map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                    <input
                      inputMode="numeric"
                      aria-label={`Harga ${line.name || "barang"}`}
                      value={line.cost}
                      className="h-11 w-32 rounded-xl border border-line bg-chip px-2 text-right tabular-nums"
                      onChange={(event) => {
                        const cost = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                        patchLine(line.key, { cost });
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-line px-3 text-sm font-semibold"
              onClick={() =>
                setLines((current) => [...current, blankLine(`line-${current.length}-${Date.now()}`)])
              }
            >
              <Plus className="size-4" aria-hidden />
              Tambah barang
            </button>
            <input
              name="note"
              maxLength={200}
              placeholder="Catatan, misalnya untuk kasir"
              className={inputClass}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            <p className="text-lg font-semibold tabular-nums">{rupiah(total)}</p>
            {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
            <div className="flex flex-wrap gap-2">
              <SaveButton pending={pending} disabled={!ready} className="flex-1">
                {editing ? "Simpan perubahan" : "Simpan pengadaan"}
              </SaveButton>
              {editing ? (
                <button
                  type="button"
                  className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                  onClick={cancelEdit}
                >
                  Batal
                </button>
              ) : null}
            </div>
          </form>
        </GlassCard>
      ) : null}
      <ProcurementDirectory records={records} canWrite={canWrite} editingId={editing?.id ?? ""} onEdit={beginEdit} />
    </div>
  );
}

function ProcurementDirectory({
  records,
  canWrite,
  editingId,
  onEdit,
}: {
  records: Procurement[];
  canWrite: boolean;
  editingId: string;
  onEdit: (record: Procurement) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const month = monthKeyOf(jakartaDate());
  const monthTotal = records
    .filter((record) => record.boughtOn.startsWith(month))
    .reduce((sum, record) => sum + record.total, 0);
  const filtered = useMemo(() => records.filter((record) => matchesQuery(record, query)), [records, query]);
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
        {records.length > 0 ? (
          <p className="text-xs font-medium text-muted">Bulan ini {rupiah(monthTotal)}</p>
        ) : null}
      </div>
      {records.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada pengadaan.</p>
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
              placeholder="Cari nomor, toko, atau barang"
              className={cn(inputClass, "pl-10")}
            />
          </label>
          {visible.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada pengadaan yang cocok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((record) => {
                const editingThis = editingId === record.id;
                return (
                  <li key={record.id} className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="font-medium">{record.vendor}</p>
                        <span className="text-xs text-muted">{record.no}</span>
                        {canWrite ? (
                          <button type="button" className="text-xs font-semibold text-teal" onClick={() => onEdit(record)}>
                            Ubah
                          </button>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{rupiah(record.total)}</p>
                    </div>
                    <p className="mt-1 text-xs text-muted">{shortDay(record.boughtOn)}</p>
                    <p className="mt-1 text-sm">
                      {record.lines.map((line) => `${line.name} ×${line.qty} ${line.unit}`).join(", ")}
                    </p>
                    {record.note ? <p className="mt-1 text-sm text-muted">{record.note}</p> : null}
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
