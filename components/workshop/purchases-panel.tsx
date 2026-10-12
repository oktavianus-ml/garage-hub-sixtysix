"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClipboardList, List, Pencil, Search } from "lucide-react";
import {
  cancelPurchaseAction,
  placePurchaseAction,
  receivePurchaseAction,
  savePurchaseAction,
} from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { purchaseStatusLabel, type PurchaseStage } from "@/lib/data/purchase";
import type { Distributor, Product, Purchase, PurchaseStatus } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { goldGlass, inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 6;

type DraftLine = { productId: string; qty: number; cost: number };

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

function matchesQuery(purchase: Purchase, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  const fields = [
    purchase.no,
    purchase.distributorName,
    purchase.note,
    ...purchase.lines.map((line) => line.name),
  ];
  return fields.some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

function isWaiting(purchase: Purchase, stage: PurchaseStage) {
  if (stage === "penerimaan") return purchase.status === "dipesan" || purchase.status === "sebagian";
  return purchase.status === "diminta";
}

function isFinished(purchase: Purchase) {
  return purchase.status === "diterima" || purchase.status === "batal";
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

export function PurchasesPanel({
  stage,
  purchases,
  distributors,
  products,
  canWrite,
  canOrder,
}: {
  stage: PurchaseStage;
  purchases: Purchase[];
  distributors: Distributor[];
  products: Product[];
  canWrite: boolean;
  canOrder: boolean;
}) {
  const [state, action, pending] = useActionState(savePurchaseAction, null);
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [distributorId, setDistributorId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const pickRef = useRef<HTMLSelectElement>(null);
  const snapshot = purchases
    .map((item) =>
      [
        item.id,
        item.status,
        item.distributorId,
        item.note,
        item.lines.map((line) => `${line.productId}:${line.qty}:${line.cost}:${line.received}`).join(","),
      ].join(":"),
    )
    .join("|");
  const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
  const ready = Boolean(distributorId) && lines.length > 0 && distributors.length > 0 && products.length > 0;

  function beginEdit(purchase: Purchase) {
    setEditing(purchase);
    setDistributorId(purchase.distributorId);
    setNote(purchase.note);
    setLines(purchase.lines.map((line) => ({ productId: line.productId, qty: line.qty, cost: line.cost })));
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setDistributorId("");
    setNote("");
    setLines([]);
  }

  useEffect(() => {
    setEditing(null);
    setDistributorId("");
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
              Simpan permintaan di sini. Pemilik menyetujuinya di menu Persetujuan, lalu barang yang datang dicatat di Penerimaan.
            </p>
            {distributors.length === 0 || products.length === 0 ? (
              <p className="mt-3 text-sm leading-6 text-muted">
                {distributors.length === 0 ? (
                  <>
                    Tambah pemasok dulu di menu{" "}
                    <Link href="/distributor" className="font-semibold text-teal">
                      Distributor
                    </Link>
                    .
                  </>
                ) : null}{" "}
                {products.length === 0 ? (
                  <>
                    Tambah barang dulu di menu{" "}
                    <Link href="/produk" className="font-semibold text-teal">
                      Produk
                    </Link>
                    .
                  </>
                ) : null}
              </p>
            ) : (
              <form action={action} className="mt-3 flex flex-col gap-3">
                {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
                <input type="hidden" name="lines" value={JSON.stringify(lines)} />
                <select
                  name="distributorId"
                  required
                  className={inputClass}
                  value={distributorId}
                  onChange={(event) => setDistributorId(event.target.value)}
                >
                  <option value="" disabled>
                    Pilih distributor
                  </option>
                  {editing && distributorId && !distributors.some((item) => item.id === distributorId) ? (
                    <option value={distributorId}>{editing.distributorName}</option>
                  ) : null}
                  {distributors.map((distributor) => (
                    <option key={distributor.id} value={distributor.id}>
                      {distributor.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <select ref={pickRef} className={inputClass} defaultValue="" aria-label="Pilih barang">
                    <option value="">Pilih barang</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.code ? `${product.code} · ` : ""}
                        {product.name} · pokok {rupiah(product.cost)} · stok {product.stock}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="h-11 shrink-0 rounded-xl border border-line px-3 text-sm font-semibold"
                    onClick={() => {
                      const productId = pickRef.current?.value ?? "";
                      if (!productId) return;
                      const product = products.find((item) => item.id === productId);
                      setLines((current) => {
                        const found = current.find((line) => line.productId === productId);
                        if (found) {
                          return current.map((line) =>
                            line.productId === productId ? { ...line, qty: line.qty + 1 } : line,
                          );
                        }
                        return [...current, { productId, qty: 1, cost: product?.cost ?? 0 }];
                      });
                      if (pickRef.current) pickRef.current.value = "";
                    }}
                  >
                    Tambah
                  </button>
                </div>
                {lines.length === 0 ? (
                  <p className="text-sm text-muted">Belum ada barang di pesanan ini.</p>
                ) : (
                  <ul className="divide-y divide-line">
                    {lines.map((line) => {
                      const product = products.find((item) => item.id === line.productId);
                      const saved = editing?.lines.find((item) => item.productId === line.productId);
                      const name = product?.name ?? saved?.name ?? "Barang";
                      return (
                        <li key={line.productId} className="flex flex-col gap-2 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="font-medium">{name}</p>
                            <button
                              type="button"
                              className="text-xs font-semibold text-danger"
                              onClick={() =>
                                setLines((current) => current.filter((item) => item.productId !== line.productId))
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
                                    .map((item) => (item.productId === line.productId ? { ...item, qty } : item))
                                    .filter((item) => item.qty > 0),
                                );
                              }}
                            />
                            <span className="text-xs text-muted">{product?.unit ?? saved?.unit ?? "pcs"}</span>
                            <input
                              inputMode="numeric"
                              aria-label={`Harga beli ${name}`}
                              value={line.cost}
                              className="h-11 w-32 rounded-xl border border-line bg-chip px-2 text-right tabular-nums"
                              onChange={(event) => {
                                const cost = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                                setLines((current) =>
                                  current.map((item) =>
                                    item.productId === line.productId ? { ...item, cost } : item,
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
                  placeholder="Catatan untuk distributor"
                  className={inputClass}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <p className="text-lg font-semibold tabular-nums">{rupiah(total)}</p>
                {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
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
      <PurchaseDirectory
        stage={stage}
        purchases={purchases}
        canWrite={canWrite}
        canOrder={canOrder}
        editingId={editing?.id ?? ""}
        onEdit={beginEdit}
      />
    </div>
  );
}

function PurchaseDirectory({
  stage,
  purchases,
  canWrite,
  canOrder,
  editingId,
  onEdit,
}: {
  stage: PurchaseStage;
  purchases: Purchase[];
  canWrite: boolean;
  canOrder: boolean;
  editingId: string;
  onEdit: (purchase: Purchase) => void;
}) {
  const [placeState, placeAction, placePending] = useActionState(placePurchaseAction, null);
  const [receiveState, receiveAction, receivePending] = useActionState(receivePurchaseAction, null);
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelPurchaseAction, null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [receivingId, setReceivingId] = useState("");
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const purchaseSnapshot = purchases
    .map((item) => item.lines.map((line) => `${item.id}:${line.received}:${item.status}`).join(","))
    .join("|");

  useEffect(() => {
    setReceivingId("");
    setReceiveQty({});
  }, [purchaseSnapshot]);
  const queued = useMemo(
    () => purchases.filter((purchase) => isWaiting(purchase, stage)),
    [purchases, stage],
  );
  const filtered = useMemo(
    () => queued.filter((purchase) => matchesQuery(purchase, query)),
    [queued, query],
  );
  const finished = useMemo(
    () =>
      stage === "penerimaan"
        ? purchases.filter((purchase) => isFinished(purchase) && matchesQuery(purchase, query))
        : [],
    [purchases, query, stage],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visible.length;
  const notice = receiveState?.message ?? placeState?.message ?? cancelState?.message;

  function beginReceive(purchase: Purchase) {
    const qty: Record<string, number> = {};
    for (const line of purchase.lines) {
      const remaining = line.qty - line.received;
      if (remaining > 0) qty[line.productId] = remaining;
    }
    setReceivingId(purchase.id);
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
              placeholder="Cari nomor, distributor, atau barang"
              className={cn(inputClass, "pl-10")}
            />
          </label>
          {notice ? <p className="mt-3 text-sm text-danger">{notice}</p> : null}
          {stage === "persetujuan" && !canOrder && visible.length > 0 ? (
            <p className="mt-3 text-sm text-muted">Menunggu pemilik menyetujui.</p>
          ) : null}
          {visible.length === 0 && finished.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada yang cocok.</p>
          ) : visible.length === 0 ? null : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((purchase) => {
                const editingThis = editingId === purchase.id;
                const receivingThis = receivingId === purchase.id;
                const open = purchase.status === "dipesan" || purchase.status === "sebagian";
                const payload = purchase.lines
                  .map((line) => ({ productId: line.productId, qty: receiveQty[line.productId] ?? 0 }))
                  .filter((line) => line.qty > 0);
                return (
                  <li key={purchase.id} className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">
                        {purchase.no} · {purchase.distributorName}
                      </p>
                      <StatusMark status={purchase.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {purchase.lines
                        .map((line) =>
                          line.received > 0
                            ? `${line.name} ×${line.qty} (datang ${line.received})`
                            : `${line.name} ×${line.qty}`,
                        )
                        .join(", ")}
                    </p>
                    {purchase.note ? <p className="mt-1 text-sm">{purchase.note}</p> : null}
                    <p className="mt-1 text-sm font-semibold text-amber tabular-nums">{rupiah(purchase.total)}</p>
                    {purchase.receipts.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-1">
                        {purchase.receipts.map((receipt, index) => (
                          <li key={`${receipt.at}-${index}`} className="text-xs text-muted">
                            {shortWhen(receipt.at)} ·{" "}
                            {receipt.lines.map((line) => `${line.name} ×${line.qty}`).join(", ")}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {canWrite ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {stage === "permintaan" && purchase.status === "diminta" ? (
                          <button
                            type="button"
                            className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-semibold"
                            onClick={() => onEdit(purchase)}
                          >
                            Ubah
                          </button>
                        ) : null}
                        {stage === "persetujuan" && purchase.status === "diminta" && canOrder ? (
                          <form action={placeAction}>
                            <input type="hidden" name="id" value={purchase.id} />
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
                            onClick={() => (receivingThis ? setReceivingId("") : beginReceive(purchase))}
                          >
                            {receivingThis ? "Tutup penerimaan" : "Terima barang"}
                          </button>
                        ) : null}
                        {((stage === "permintaan" && purchase.status === "diminta") ||
                          (stage === "persetujuan" && purchase.status === "diminta" && canOrder) ||
                          (stage === "penerimaan" && purchase.status === "dipesan" && canOrder)) &&
                        purchase.lines.every((line) => line.received === 0) ? (
                          <form action={cancelAction}>
                            <input type="hidden" name="id" value={purchase.id} />
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
                        <input type="hidden" name="id" value={purchase.id} />
                        <input type="hidden" name="lines" value={JSON.stringify(payload)} />
                        <p className="text-sm leading-6 text-muted">
                          Isi jumlah yang datang. Stok bertambah dan harga pokok mengikuti harga beli.
                        </p>
                        <ul className="mt-2 divide-y divide-line">
                          {purchase.lines.map((line) => {
                            const remaining = line.qty - line.received;
                            if (remaining <= 0) return null;
                            return (
                              <li key={line.productId} className="flex items-center justify-between gap-3 py-2">
                                <span className="text-sm">
                                  {line.name}
                                  <span className="text-muted"> · sisa {remaining}</span>
                                </span>
                                <input
                                  inputMode="numeric"
                                  aria-label={`Jumlah datang ${line.name}`}
                                  value={receiveQty[line.productId] ?? 0}
                                  className="h-11 w-20 rounded-xl border border-line bg-field px-2 text-center tabular-nums"
                                  onChange={(event) => {
                                    const qty = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                                    setReceiveQty((current) => ({
                                      ...current,
                                      [line.productId]: Math.min(remaining, qty),
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
                {finished.map((purchase) => (
                  <li key={purchase.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">
                        {purchase.no} · {purchase.distributorName}
                      </p>
                      <StatusMark status={purchase.status} />
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {purchase.lines.map((line) => `${line.name} ×${line.qty}`).join(", ")}
                    </p>
                    <p className="mt-1 text-sm font-semibold tabular-nums">{rupiah(purchase.total)}</p>
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
