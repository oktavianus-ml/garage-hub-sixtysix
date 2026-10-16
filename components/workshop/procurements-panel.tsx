"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardList, List, Pencil, Search } from "lucide-react";
import {
  cancelProcurementAction,
  placeProcurementAction,
  receiveProcurementAction,
  saveProcurementAction,
} from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { purchaseStatusLabel, type PurchaseStage } from "@/lib/data/purchase";
import type { Procurement, PurchaseStatus, SupplyItem } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { goldGlass, inputClass } from "@/components/ui/controls";
import { MoneyInput } from "@/components/ui/money-input";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 6;

type DraftLine = { itemId: string; qty: number; cost: number };

function StatusMark({ status }: { status: PurchaseStatus }) {
  const tone =
    status === "batal"
      ? "bg-chip text-muted"
      : status === "diminta"
        ? "bg-amber-soft text-amber"
        : "bg-teal-soft text-teal";
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>
      {purchaseStatusLabel[status]}
    </span>
  );
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function shortWhen(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

function isWaiting(record: Procurement, stage: PurchaseStage) {
  if (stage === "penerimaan") return record.status === "dipesan" || record.status === "sebagian";
  return record.status === "diminta";
}

function isFinished(record: Procurement) {
  return record.status === "diterima" || record.status === "batal";
}

const stageTitle: Record<PurchaseStage, string> = {
  permintaan: "Menunggu persetujuan",
  persetujuan: "Perlu disetujui",
  penerimaan: "Perlu diterima",
};

const stageEmpty: Record<PurchaseStage, string> = {
  permintaan: "Belum ada permintaan.",
  persetujuan: "Tidak ada permintaan yang menunggu persetujuan.",
  penerimaan: "Tidak ada pesanan yang menunggu barang.",
};

export function ProcurementsPanel({
  stage,
  records,
  items,
  canWrite,
  canOrder,
}: {
  stage: PurchaseStage;
  records: Procurement[];
  items: SupplyItem[];
  canWrite: boolean;
  canOrder: boolean;
}) {
  const [state, action, pending] = useQueuedAction(saveProcurementAction, "saveProcurement");
  const [editing, setEditing] = useState<Procurement | null>(null);
  const [vendor, setVendor] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef<HTMLSelectElement>(null);
  const snapshot = records
    .map((item) =>
      [
        item.id,
        item.status,
        item.vendor,
        item.note,
        item.lines.map((line) => `${line.itemId}:${line.qty}:${line.cost}:${line.received}`).join(","),
      ].join(":"),
    )
    .join("|");
  const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
  const ready = vendor.trim().length >= 2 && lines.length > 0 && items.length > 0;

  function beginEdit(record: Procurement) {
    setEditing(record);
    setVendor(record.vendor);
    setNote(record.note);
    setLines(record.lines.map((line) => ({ itemId: line.itemId, qty: line.qty, cost: line.cost })));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setVendor("");
    setNote("");
    setLines([]);
  }

  useEffect(() => {
    setEditing(null);
    setVendor("");
    setNote("");
    setLines([]);
  }, [snapshot]);

  return (
    <div className={cn("mt-5 grid items-start gap-4", stage === "permintaan" && canWrite && "xl:grid-cols-2")}>
      {stage === "permintaan" && canWrite ? (
        <div ref={formRef}>
          <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
            <SectionTitle icon={editing ? Pencil : ClipboardList} tone={editing ? "teal" : "amber"}>
              {editing ? "Ubah permintaan" : "Permintaan barang"}
            </SectionTitle>
            <p className="mt-3 text-sm leading-6 text-muted">
              Simpan permintaan di sini. Pemilik menyetujuinya di menu Persetujuan, lalu barang yang datang dicatat di Penerimaan. Stok produk tidak bertambah.
            </p>
            {items.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-muted">
                Daftarkan perlengkapan dulu di menu{" "}
                <Link href="/pengadaan/barang" className="font-semibold text-teal">
                  Barang
                </Link>
                .
              </p>
            ) : (
              <form action={action} className="mt-3 flex flex-col gap-3">
                {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
                <input type="hidden" name="lines" value={JSON.stringify(lines)} />
                <input
                  name="vendor"
                  required
                  maxLength={80}
                  placeholder="Toko atau tempat beli"
                  className={inputClass}
                  value={vendor}
                  onChange={(event) => setVendor(event.target.value)}
                />
                <div className="flex gap-2">
                  <select ref={pickRef} className={inputClass} defaultValue="" aria-label="Pilih barang">
                    <option value="">Pilih barang</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.unit} · {rupiah(item.cost)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="h-11 shrink-0 rounded-xl border border-line px-3 text-sm font-semibold"
                    onClick={() => {
                      const itemId = pickRef.current?.value ?? "";
                      if (!itemId) return;
                      const item = items.find((entry) => entry.id === itemId);
                      setLines((current) => {
                        const found = current.find((line) => line.itemId === itemId);
                        if (found) {
                          return current.map((line) =>
                            line.itemId === itemId ? { ...line, qty: line.qty + 1 } : line,
                          );
                        }
                        return [...current, { itemId, qty: 1, cost: item?.cost ?? 0 }];
                      });
                      if (pickRef.current) pickRef.current.value = "";
                    }}
                  >
                    Tambah
                  </button>
                </div>
                {lines.length === 0 ? (
                  <p className="text-sm text-muted">Belum ada barang di permintaan ini.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {lines.map((line) => {
                      const item = items.find((entry) => entry.id === line.itemId);
                      const saved = editing?.lines.find((entry) => entry.itemId === line.itemId);
                      const name = item?.name ?? saved?.name ?? "Barang";
                      return (
                        <li key={line.itemId} className="flex flex-col gap-2 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium">{name}</p>
                            <button
                              type="button"
                              className="text-xs font-semibold text-danger"
                              onClick={() =>
                                setLines((current) => current.filter((entry) => entry.itemId !== line.itemId))
                              }
                            >
                              Hapus
                            </button>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              inputMode="numeric"
                              aria-label={`Jumlah ${name}`}
                              value={line.qty}
                              className="h-11 w-20 rounded-xl border border-line bg-chip px-2 text-center tabular-nums"
                              onChange={(event) => {
                                const qty = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                                setLines((current) =>
                                  current
                                    .map((entry) => (entry.itemId === line.itemId ? { ...entry, qty } : entry))
                                    .filter((entry) => entry.qty > 0),
                                );
                              }}
                            />
                            <span className="text-xs text-muted">{item?.unit ?? saved?.unit ?? "pcs"}</span>
                            <MoneyInput
                              ariaLabel={`Harga beli ${name}`}
                              value={line.cost}
                              className="h-11 w-36 rounded-xl border border-line bg-chip px-2 text-right"
                              onValueChange={(digits) => {
                                const cost = Number(digits || "0");
                                setLines((current) =>
                                  current.map((entry) =>
                                    entry.itemId === line.itemId ? { ...entry, cost } : entry,
                                  ),
                                );
                              }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <input
                  name="note"
                  maxLength={200}
                  placeholder="Catatan, misalnya untuk kasir"
                  className={inputClass}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p className="text-lg font-semibold tabular-nums">{rupiah(total)}</p>
                <FormMessage state={state} />
                <p className="text-sm leading-6 text-muted">
                  Permintaan ini belum dipesan. Angka di menu Persetujuan bertambah sampai pemilik menyetujuinya.
                </p>
                <div className="flex flex-wrap gap-2">
                  <SaveButton pending={pending} disabled={!ready} className="flex-1">
                    {editing ? "Simpan perubahan" : "Simpan permintaan"}
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
            )}
          </GlassCard>
        </div>
      ) : null}
      <ProcurementDirectory
        stage={stage}
        records={records}
        canWrite={canWrite}
        canOrder={canOrder}
        editingId={editing?.id ?? ""}
        onEdit={beginEdit}
      />
    </div>
  );
}

function ProcurementDirectory({
  stage,
  records,
  canWrite,
  canOrder,
  editingId,
  onEdit,
}: {
  stage: PurchaseStage;
  records: Procurement[];
  canWrite: boolean;
  canOrder: boolean;
  editingId: string;
  onEdit: (record: Procurement) => void;
}) {
  const [placeState, placeAction, placePending] = useQueuedAction(placeProcurementAction, "placeProcurement");
  const [receiveState, receiveAction, receivePending] = useQueuedAction(receiveProcurementAction, "receiveProcurement");
  const [cancelState, cancelAction, cancelPending] = useQueuedAction(cancelProcurementAction, "cancelProcurement");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [receivingId, setReceivingId] = useState("");
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const snapshot = records
    .map((item) => item.lines.map((line) => `${item.id}:${line.received}:${item.status}`).join(","))
    .join("|");

  useEffect(() => {
    setReceivingId("");
    setReceiveQty({});
  }, [snapshot]);

  const queued = useMemo(() => records.filter((record) => isWaiting(record, stage)), [records, stage]);
  const filtered = useMemo(() => queued.filter((record) => matchesQuery(record, query)), [queued, query]);
  const finished = useMemo(
    () => (stage === "penerimaan" ? records.filter((record) => isFinished(record) && matchesQuery(record, query)) : []),
    [records, query, stage],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visible.length;
  const notice = [receiveState, placeState, cancelState].find((item) => item?.message) ?? null;

  function beginReceive(record: Procurement) {
    const qty: Record<string, number> = {};
    for (const line of record.lines) {
      const remaining = line.qty - line.received;
      if (remaining > 0) qty[line.itemId] = remaining;
    }
    setReceivingId(record.id);
    setReceiveQty(qty);
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={List} tone="teal">
          {stageTitle[stage]}
        </SectionTitle>
        {queued.length > 0 ? (
          <p className="text-xs font-medium text-muted">
            {filtered.length === queued.length ? `${queued.length} menunggu` : `${filtered.length} dari ${queued.length}`}
          </p>
        ) : null}
      </div>
      {queued.length === 0 && finished.length === 0 && !query.trim() ? (
        <p className="mt-3 text-sm text-muted">{stageEmpty[stage]}</p>
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
          {notice?.message ? (
            <p className={cn("mt-3 text-sm", notice.ok ? "text-teal" : "text-danger")}>{notice.message}</p>
          ) : null}
          {stage === "persetujuan" && !canOrder && visible.length > 0 ? (
            <p className="mt-3 text-sm text-muted">Menunggu pemilik menyetujui.</p>
          ) : null}
          {visible.length === 0 && finished.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada yang cocok.</p>
          ) : visible.length === 0 ? null : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((record) => {
                const editingThis = editingId === record.id;
                const receivingThis = receivingId === record.id;
                const open = record.status === "dipesan" || record.status === "sebagian";
                const payload = record.lines
                  .map((line) => ({ itemId: line.itemId, qty: receiveQty[line.itemId] ?? 0 }))
                  .filter((line) => line.qty > 0);
                return (
                  <li key={record.id} className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">
                        {record.no} · {record.vendor}
                      </p>
                      <StatusMark status={record.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {record.lines
                        .map((line) =>
                          line.received > 0
                            ? `${line.name} ×${line.qty} (datang ${line.received})`
                            : `${line.name} ×${line.qty}`,
                        )
                        .join(", ")}
                    </p>
                    {record.note ? <p className="mt-1 text-sm">{record.note}</p> : null}
                    <p className="mt-1 text-sm font-semibold text-amber tabular-nums">{rupiah(record.total)}</p>
                    {record.receipts.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-1">
                        {record.receipts.map((receipt, index) => (
                          <li key={`${receipt.at}-${index}`} className="text-xs text-muted">
                            {shortWhen(receipt.at)} · {receipt.lines.map((line) => `${line.name} ×${line.qty}`).join(", ")}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {canWrite ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {stage === "permintaan" && record.status === "diminta" ? (
                          <button
                            type="button"
                            className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-semibold"
                            onClick={() => onEdit(record)}
                          >
                            Ubah
                          </button>
                        ) : null}
                        {stage === "persetujuan" && record.status === "diminta" && canOrder ? (
                          <form action={placeAction}>
                            <input type="hidden" name="id" value={record.id} />
                            <input type="hidden" name="stage" value={stage} />
                            <button
                              type="submit"
                              disabled={placePending}
                              className={cn(goldGlass, "h-9 rounded-xl px-3 text-sm font-semibold disabled:opacity-60")}
                            >
                              Setujui
                            </button>
                          </form>
                        ) : null}
                        {stage === "penerimaan" && open ? (
                          <button
                            type="button"
                            className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-semibold"
                            onClick={() => (receivingThis ? setReceivingId("") : beginReceive(record))}
                          >
                            {receivingThis ? "Tutup penerimaan" : "Terima barang"}
                          </button>
                        ) : null}
                        {((stage === "permintaan" && record.status === "diminta") ||
                          (stage === "persetujuan" && record.status === "diminta" && canOrder) ||
                          (stage === "penerimaan" && record.status === "dipesan" && canOrder)) &&
                        record.lines.every((line) => line.received === 0) ? (
                          <form action={cancelAction}>
                            <input type="hidden" name="id" value={record.id} />
                            <input type="hidden" name="stage" value={stage} />
                            <button
                              type="submit"
                              disabled={cancelPending}
                              className="h-9 rounded-xl px-3 text-sm font-semibold text-danger disabled:opacity-60"
                            >
                              Batalkan
                            </button>
                          </form>
                        ) : null}
                      </div>
                    ) : null}
                    {stage === "penerimaan" && open && receivingThis ? (
                      <form action={receiveAction} className="mt-3 rounded-xl border border-line bg-chip/60 p-3">
                        <input type="hidden" name="id" value={record.id} />
                        <input type="hidden" name="stage" value={stage} />
                        <input type="hidden" name="lines" value={JSON.stringify(payload)} />
                        <p className="text-sm leading-6 text-muted">
                          Isi jumlah yang datang. Barang ini tidak masuk stok jual.
                        </p>
                        <ul className="mt-2 divide-y divide-line">
                          {record.lines.map((line) => {
                            const remaining = line.qty - line.received;
                            if (remaining <= 0) return null;
                            return (
                              <li key={line.itemId} className="flex items-center justify-between gap-3 py-2">
                                <span className="text-sm">
                                  {line.name}
                                  <span className="text-muted"> · sisa {remaining}</span>
                                </span>
                                <input
                                  inputMode="numeric"
                                  aria-label={`Jumlah datang ${line.name}`}
                                  value={receiveQty[line.itemId] ?? 0}
                                  className="h-11 w-20 rounded-xl border border-line bg-field px-2 text-center tabular-nums"
                                  onChange={(event) => {
                                    const qty = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                                    setReceiveQty((current) => ({
                                      ...current,
                                      [line.itemId]: Math.min(remaining, qty),
                                    }));
                                  }}
                                />
                              </li>
                            );
                          })}
                        </ul>
                        <SaveButton pending={receivePending} disabled={payload.length === 0} className="mt-3 w-full">
                          Simpan penerimaan
                        </SaveButton>
                      </form>
                    ) : null}
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
          {finished.length > 0 ? (
            <div className="mt-4 border-t border-line pt-3">
              <p className="text-xs font-semibold tracking-wide text-muted uppercase">Selesai</p>
              <ul className="mt-2 divide-y divide-line">
                {finished.map((record) => (
                  <li key={record.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">
                        {record.no} · {record.vendor}
                      </p>
                      <StatusMark status={record.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {record.lines.map((line) => `${line.name} ×${line.qty}`).join(", ")}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{rupiah(record.total)}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  );
}
