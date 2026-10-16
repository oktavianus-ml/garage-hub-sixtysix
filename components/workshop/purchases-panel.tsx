"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
import { MoneyInput } from "@/components/ui/money-input";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 6;

const receiveButton =
  "inline-flex h-12 shrink-0 items-center justify-center rounded-xl px-6 text-sm font-semibold disabled:opacity-60";
const cancelButton =
  "inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-[#c2413b]/55 bg-gradient-to-b from-[#fff1ef] via-[#f7c7c3] to-[#e58b84] px-6 text-sm font-semibold text-[#3f1614] shadow-[0_1px_2px_rgba(194,65,59,0.22),inset_0_1px_0_rgba(255,255,255,0.7)] disabled:opacity-60";
const closeShortButton =
  "inline-flex h-12 shrink-0 items-center justify-center rounded-xl border border-amber/45 bg-amber-soft px-5 text-sm font-semibold text-amber disabled:opacity-60";

type DraftLine = { productId: string; qty: number; cost: number };

function QtyMark({ qty }: { qty: number }) {
  return (
    <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-lg bg-amber-soft px-2.5 py-1 text-base font-bold text-amber tabular-nums">
      {qty}
    </span>
  );
}

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
  const [state, action, pending] = useQueuedAction(savePurchaseAction, "savePurchase");
  const [editing, setEditing] = useState<Purchase | null>(null);
  const [distributorId, setDistributorId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>([]);
  const formRef = useRef<HTMLDivElement>(null);
  const pickBoxRef = useRef<HTMLDivElement>(null);
  const [pickQuery, setPickQuery] = useState("");
  const [pickOpen, setPickOpen] = useState(false);
  const [pickedId, setPickedId] = useState("");
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
  const catalog = useMemo(
    () => (distributorId ? products.filter((product) => product.distributorId === distributorId) : []),
    [products, distributorId],
  );
  const pickMatches = useMemo(() => {
    const needle = pickQuery.trim().toLowerCase();
    const pool = needle
      ? catalog.filter(
          (product) =>
            product.name.toLowerCase().includes(needle) || product.code.toLowerCase().includes(needle),
        )
      : catalog;
    return pool.slice(0, 12);
  }, [catalog, pickQuery]);
  const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
  const ready = Boolean(distributorId) && lines.length > 0 && distributors.length > 0 && products.length > 0;

  function beginEdit(purchase: Purchase) {
    setEditing(purchase);
    setDistributorId(purchase.distributorId);
    setNote(purchase.note);
    setLines(purchase.lines.map((line) => ({ productId: line.productId, qty: line.qty, cost: line.cost })));
    setPickQuery("");
    setPickedId("");
    setPickOpen(false);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setDistributorId("");
    setNote("");
    setLines([]);
    setPickQuery("");
    setPickedId("");
    setPickOpen(false);
  }

  useEffect(() => {
    setEditing(null);
    setDistributorId("");
    setNote("");
    setLines([]);
    setPickQuery("");
    setPickedId("");
    setPickOpen(false);
  }, [snapshot]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!pickBoxRef.current?.contains(event.target as Node)) setPickOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  function chooseDistributor(next: string) {
    setDistributorId(next);
    setLines((current) =>
      current.filter((line) => products.find((item) => item.id === line.productId)?.distributorId === next),
    );
    setPickQuery("");
    setPickedId("");
    setPickOpen(false);
  }

  function addPicked(productId = pickedId) {
    const id = productId || (pickQuery.trim() ? pickMatches[0]?.id : "") || "";
    if (!id) return;
    const product = catalog.find((item) => item.id === id);
    if (!product) return;
    setLines((current) => {
      const found = current.find((line) => line.productId === id);
      if (found) {
        return current.map((line) => (line.productId === id ? { ...line, qty: line.qty + 1 } : line));
      }
      return [...current, { productId: id, qty: 1, cost: product?.cost ?? 0 }];
    });
    setPickQuery("");
    setPickedId("");
    setPickOpen(false);
  }

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
                  onChange={(event) => chooseDistributor(event.target.value)}
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
                  <div ref={pickBoxRef} className="relative min-w-0 flex-1">
                    <label className="flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-field px-3">
                      <Search className="size-4 shrink-0 text-muted" aria-hidden />
                      <input
                        value={pickQuery}
                        disabled={!distributorId}
                        onChange={(event) => {
                          setPickQuery(event.target.value);
                          setPickedId("");
                          setPickOpen(true);
                        }}
                        onFocus={() => {
                          if (distributorId) setPickOpen(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") {
                            setPickOpen(false);
                            return;
                          }
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          addPicked();
                        }}
                        placeholder={distributorId ? "Cari kode atau nama barang" : "Pilih distributor dulu"}
                        className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted"
                        style={{ outline: "none", boxShadow: "none" }}
                        role="combobox"
                        aria-expanded={pickOpen}
                        aria-autocomplete="list"
                        autoComplete="off"
                      />
                    </label>
                    {pickOpen ? (
                      <div
                        role="listbox"
                        className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-20 max-h-72 overflow-y-auto rounded-xl border border-line bg-white/95 p-1 shadow-[0_16px_40px_rgba(28,25,21,0.12)] dark:bg-[#16191d]/95"
                      >
                        {pickMatches.length === 0 ? (
                          <p className="px-3 py-2 text-sm text-muted">
                            {catalog.length === 0
                              ? "Distributor ini belum punya barang."
                              : "Tidak ketemu"}
                          </p>
                        ) : (
                          pickMatches.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              role="option"
                              aria-selected={product.id === pickedId}
                              className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover-wash"
                              onClick={() => addPicked(product.id)}
                            >
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-ink">
                                  {product.code ? `${product.code} · ` : ""}
                                  {product.name}
                                </span>
                                <span className="block text-xs text-muted">Stok {product.stock}</span>
                              </span>
                              <span className="shrink-0 text-sm font-semibold tabular-nums">
                                {rupiah(product.cost)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={!distributorId}
                    className={cn(goldGlass, "h-11 shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-60")}
                    onClick={() => addPicked()}
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
                            <MoneyInput
                              ariaLabel={`Harga beli ${name}`}
                              value={line.cost}
                              className="h-11 w-36 rounded-xl border border-line bg-chip px-2 text-right"
                              onValueChange={(digits) => {
                                const cost = Number(digits || "0");
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
  const [placeState, placeAction, placePending] = useQueuedAction(placePurchaseAction, "placePurchase");
  const [receiveState, receiveAction, receivePending] = useQueuedAction(receivePurchaseAction, "receivePurchase");
  const [cancelState, cancelAction, cancelPending] = useQueuedAction(cancelPurchaseAction, "cancelPurchase");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [receivingId, setReceivingId] = useState("");
  const [receiveQty, setReceiveQty] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<{ id: string; kind: "save" | "close" | "remainder" } | null>(null);
  const purchaseSnapshot = purchases
    .map((item) => item.lines.map((line) => `${item.id}:${line.received}:${item.status}`).join(","))
    .join("|");

  useEffect(() => {
    setReceivingId("");
    setReceiveQty({});
    setConfirm(null);
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
  const notice = [receiveState, placeState, cancelState].find((item) => item?.message) ?? null;

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
          {notice?.message ? (
            <p className={cn("mt-3 text-sm", notice.ok ? "text-teal" : "text-danger")}>{notice.message}</p>
          ) : null}
          {stage === "persetujuan" && !canOrder && visible.length > 0 ? (
            <p className="mt-3 text-sm text-muted">Menunggu pemilik menyetujui.</p>
          ) : null}
          {visible.length === 0 && finished.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada yang cocok.</p>
          ) : visible.length === 0 ? null : stage === "penerimaan" ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-amber-soft text-xs font-semibold text-muted">
                    <th scope="col" className="px-3 py-3 font-semibold">Nomor</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Distributor</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Barang</th>
                    <th scope="col" className="px-3 py-3 text-center font-semibold">Jumlah</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Catatan</th>
                    <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
                    <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                    {canWrite ? (
                      <th scope="col" className="px-3 py-3 font-semibold">Aksi</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((purchase) => {
                    const receivingThis = receivingId === purchase.id;
                    const open = purchase.status === "dipesan" || purchase.status === "sebagian";
                    const payload = purchase.lines
                      .map((line) => ({ productId: line.productId, qty: receiveQty[line.productId] ?? 0 }))
                      .filter((line) => line.qty > 0);
                    const canCancel =
                      purchase.status === "dipesan" &&
                      canOrder &&
                      purchase.lines.every((line) => line.received === 0);
                    const short = purchase.lines.some((line) => {
                      const remaining = line.qty - line.received;
                      return remaining > 0 && (receiveQty[line.productId] ?? 0) < remaining;
                    });
                    const alreadyInStock = purchase.lines.some((line) => line.received > 0);
                    return (
                      <Fragment key={purchase.id}>
                        <tr className={cn("border-b border-line align-middle last:border-b-0", receivingThis && "border-b-0 bg-teal-soft")}>
                          <td className="px-3 py-3.5 font-semibold whitespace-nowrap">{purchase.no}</td>
                          <td className="px-3 py-3.5 font-medium">{purchase.distributorName}</td>
                          <td className="px-3 py-3.5">
                            <ul className="flex flex-col gap-2">
                              {purchase.lines.map((line) => (
                                <li key={line.productId} className="flex min-h-8 items-center">
                                  {line.name}
                                </li>
                              ))}
                            </ul>
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
                          </td>
                          <td className="px-3 py-3.5">
                            <ul className="flex flex-col items-center gap-2">
                              {purchase.lines.map((line) => (
                                <li key={line.productId} className="flex min-h-8 items-center gap-2">
                                  <QtyMark qty={line.qty} />
                                  {line.received > 0 ? (
                                    <span className="text-xs font-semibold text-teal">datang {line.received}</span>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="max-w-[200px] px-3 py-3.5 text-muted">{purchase.note || "—"}</td>
                          <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap text-amber tabular-nums">
                            {rupiah(purchase.total)}
                          </td>
                          <td className="px-3 py-3.5">
                            <StatusMark status={purchase.status} />
                          </td>
                          {canWrite ? (
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap gap-2">
                                {open ? (
                                  <button
                                    type="button"
                                    className={cn(
                                      receiveButton,
                                      receivingThis ? "border border-line bg-chip text-ink" : goldGlass,
                                    )}
                                    onClick={() => {
                                      setConfirm(null);
                                      if (receivingThis) setReceivingId("");
                                      else beginReceive(purchase);
                                    }}
                                  >
                                    {receivingThis ? "Tutup penerimaan" : "Terima barang"}
                                  </button>
                                ) : null}
                                {canCancel ? (
                                  <form action={cancelAction}>
                                    <input type="hidden" name="id" value={purchase.id} />
                                    <input type="hidden" name="stage" value={stage} />
                                    <button type="submit" disabled={cancelPending} className={cancelButton}>
                                      Batalkan
                                    </button>
                                  </form>
                                ) : null}
                                {purchase.status === "sebagian" && !receivingThis ? (
                                  confirm?.id === purchase.id && confirm.kind === "remainder" ? (
                                    <form action={receiveAction} className="rounded-xl border border-amber/40 bg-amber-soft px-3 py-2">
                                      <input type="hidden" name="id" value={purchase.id} />
                                      <input type="hidden" name="lines" value="[]" />
                                      <p className="text-sm font-semibold">Yakin tutup sisa? Cek lagi, yang belum datang tidak masuk stok.</p>
                                      <ul className="mt-1 text-sm">
                                        {purchase.lines.map((line) => {
                                          const remaining = line.qty - line.received;
                                          if (remaining <= 0) return null;
                                          return (
                                            <li key={line.productId}>
                                              {line.name} · sudah masuk {line.received} · sisa {remaining} ditutup
                                            </li>
                                          );
                                        })}
                                      </ul>
                                      <div className="mt-2 flex flex-wrap gap-2">
                                      <button
                                        type="submit"
                                        name="closeShort"
                                        value="1"
                                        disabled={receivePending}
                                        className={closeShortButton}
                                      >
                                        Ya, tutup
                                      </button>
                                      <button
                                        type="button"
                                        disabled={receivePending}
                                        className="inline-flex h-12 items-center justify-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                                        onClick={() => setConfirm(null)}
                                      >
                                        Batal
                                      </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <button
                                      type="button"
                                      className={closeShortButton}
                                      onClick={() => setConfirm({ id: purchase.id, kind: "remainder" })}
                                    >
                                      Tutup sisa
                                    </button>
                                  )
                                ) : null}
                              </div>
                            </td>
                          ) : null}
                        </tr>
                        {open && receivingThis ? (
                          <tr className="border-b border-line bg-teal-soft last:border-b-0">
                            <td colSpan={canWrite ? 8 : 7} className="px-3 pb-4">
                              <form action={receiveAction} className="rounded-xl border border-line bg-field p-3">
                                <input type="hidden" name="id" value={purchase.id} />
                                <input type="hidden" name="lines" value={JSON.stringify(payload)} />
                                <p className="text-sm leading-6 text-muted">
                                  Isi jumlah barang baik yang masuk stok. Barang rusak atau tidak datang jangan dihitung.
                                  Harga pokok mengikuti harga beli.
                                </p>
                                <ul className="mt-3 flex max-w-xl flex-col gap-2">
                                  {purchase.lines.map((line) => {
                                    const remaining = line.qty - line.received;
                                    if (remaining <= 0) return null;
                                    return (
                                      <li
                                        key={line.productId}
                                        className="flex items-center justify-between gap-4 rounded-xl border border-amber/30 bg-amber-soft px-3 py-2.5"
                                      >
                                        <div>
                                          <p className="font-medium">{line.name}</p>
                                          <p className="text-sm text-muted">Sisa {remaining}</p>
                                        </div>
                                        <label className="flex shrink-0 flex-col items-center gap-1">
                                          <span className="text-xs font-semibold text-amber">Jumlah baik</span>
                                          <input
                                            inputMode="numeric"
                                            aria-label={`Jumlah baik ${line.name}`}
                                            value={receiveQty[line.productId] ?? 0}
                                            className="h-14 w-28 rounded-xl border border-amber/40 bg-field text-center text-2xl font-bold text-amber tabular-nums"
                                            onChange={(event) => {
                                              const qty = Number(event.target.value.replace(/[^\d]/g, "") || "0");
                                              setConfirm(null);
                                              setReceiveQty((current) => ({
                                                ...current,
                                                [line.productId]: Math.min(remaining, qty),
                                              }));
                                            }}
                                          />
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                                {confirm?.id === purchase.id && (confirm.kind === "save" || confirm.kind === "close") ? (
                                  <div className="mt-3 rounded-xl border border-amber/40 bg-amber-soft p-3">
                                    <p className="text-sm font-semibold">
                                      {confirm.kind === "close"
                                        ? "Yakin terima sesuai yang datang? Cek lagi jumlah di bawah."
                                        : "Yakin simpan penerimaan ini? Cek lagi jumlah di bawah."}
                                    </p>
                                    <ul className="mt-2 flex flex-col gap-1 text-sm">
                                      {purchase.lines.map((line) => {
                                        const remaining = line.qty - line.received;
                                        if (remaining <= 0) return null;
                                        const qty = receiveQty[line.productId] ?? 0;
                                        const left = remaining - qty;
                                        return (
                                          <li key={line.productId}>
                                            <span className="font-semibold">{line.name}</span>
                                            {" · masuk stok "}
                                            <span className="font-bold tabular-nums">{qty}</span>
                                            {left > 0
                                              ? confirm.kind === "close"
                                                ? ` · sisa ${left} ditutup, tidak masuk stok`
                                                : ` · sisa ${left} masih menunggu`
                                              : " · sesuai pesanan"}
                                          </li>
                                        );
                                      })}
                                    </ul>
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {confirm.kind === "close" ? (
                                        <button
                                          type="submit"
                                          name="closeShort"
                                          value="1"
                                          disabled={receivePending}
                                          className="inline-flex h-11 items-center justify-center rounded-xl border border-amber/45 bg-field px-5 text-sm font-semibold text-amber disabled:opacity-60"
                                        >
                                          Ya, tutup sisa
                                        </button>
                                      ) : (
                                        <SaveButton pending={receivePending}>Ya, simpan</SaveButton>
                                      )}
                                      <button
                                        type="button"
                                        disabled={receivePending}
                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                                        onClick={() => setConfirm(null)}
                                      >
                                        Batal
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={payload.length === 0}
                                      className={cn(goldGlass, "inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60")}
                                      onClick={() => setConfirm({ id: purchase.id, kind: "save" })}
                                    >
                                      {short ? "Sisa masih menyusul" : "Simpan penerimaan"}
                                    </button>
                                    {short ? (
                                      <button
                                        type="button"
                                        disabled={payload.length === 0 && !alreadyInStock}
                                        className="inline-flex h-11 items-center justify-center rounded-xl border border-amber/45 bg-amber-soft px-5 text-sm font-semibold text-amber disabled:opacity-60"
                                        onClick={() => setConfirm({ id: purchase.id, kind: "close" })}
                                      >
                                        Terima sesuai yang datang
                                      </button>
                                    ) : null}
                                  </div>
                                )}
                                {short ? (
                                  <p className="mt-2 text-sm leading-6 text-muted">
                                    {payload.length === 0 && !alreadyInStock
                                      ? "Kalau tidak ada yang masuk stok, batalkan pesanan."
                                      : "Sisa masih menyusul membuat pesanan tetap menunggu. Terima sesuai yang datang menutup sisa, dan yang kurang tidak masuk stok."}
                                  </p>
                                ) : null}
                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((purchase) => {
                const editingThis = editingId === purchase.id;
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
                        {((stage === "permintaan" && purchase.status === "diminta") ||
                          (stage === "persetujuan" && purchase.status === "diminta" && canOrder)) &&
                        purchase.lines.every((line) => line.received === 0) ? (
                          <form action={cancelAction}>
                            <input type="hidden" name="id" value={purchase.id} />
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
              <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                <table className="w-full min-w-[820px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-line bg-chip text-xs font-semibold text-muted">
                      <th scope="col" className="px-3 py-3 font-semibold">Nomor</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Distributor</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Barang</th>
                      <th scope="col" className="px-3 py-3 text-center font-semibold">Jumlah</th>
                      <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
                      <th scope="col" className="px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {finished.map((purchase) => (
                      <tr key={purchase.id} className="border-b border-line align-middle last:border-b-0">
                        <td className="px-3 py-3.5 font-semibold whitespace-nowrap">{purchase.no}</td>
                        <td className="px-3 py-3.5 font-medium">{purchase.distributorName}</td>
                        <td className="px-3 py-3.5">
                          <ul className="flex flex-col gap-2">
                            {purchase.lines.map((line) => (
                              <li key={line.productId} className="flex min-h-8 items-center">
                                {line.name}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-3 py-3.5">
                          <ul className="flex flex-col items-center gap-2">
                            {purchase.lines.map((line) => (
                              <li key={line.productId} className="flex min-h-8 items-center gap-2">
                                <QtyMark qty={line.received < line.qty ? line.received : line.qty} />
                                {line.received < line.qty ? (
                                  <span className="text-xs font-semibold text-muted">dari {line.qty}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        </td>
                        <td className="px-3 py-3.5 text-right font-semibold whitespace-nowrap tabular-nums">
                          {rupiah(purchase.total)}
                        </td>
                        <td className="px-3 py-3.5">
                          <StatusMark status={purchase.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  );
}
