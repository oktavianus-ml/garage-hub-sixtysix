"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Battery,
  ChevronDown,
  CircleDot,
  Disc,
  Droplet,
  Filter,
  Lightbulb,
  Link2,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  ShoppingBag,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveSaleAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { FormState } from "@/lib/data/form-state";
import { PAY_METHODS, payMethodLabel, type PayMethod } from "@/lib/data/payment";
import type { Product, WalkInSale } from "@/lib/data/records";
import type { WorkshopSettings } from "@/lib/data/settings";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";
import {
  printReceiptSlip,
  printsOnAndroid,
  ReceiptSlip,
  receiptDateLabel,
  receiptSlipFromSale,
  receiptSlipFromSaved,
  type ReceiptSlipData,
} from "@/components/workshop/receipt-slip";

function productIcon(name: string): LucideIcon {
  const text = name.toLowerCase();
  if (text.includes("oli")) return Droplet;
  if (text.includes("kampas") || text.includes("rem")) return Disc;
  if (text.includes("filter")) return Filter;
  if (text.includes("busi")) return Zap;
  if (text.includes("ban")) return CircleDot;
  if (text.includes("rantai")) return Link2;
  if (text.includes("aki")) return Battery;
  if (text.includes("lampu")) return Lightbulb;
  if (text.includes("servis") || text.includes("jasa")) return Wrench;
  return Package;
}

const QUICK_TONES = [
  "border-amber/25 bg-amber-soft text-amber",
  "border-teal/25 bg-teal-soft text-teal",
  "border-[#5b7fbe]/25 bg-[#5b7fbe]/15 text-[#4a6eab]",
  "border-[#b06a8a]/25 bg-[#b06a8a]/15 text-[#9a5674]",
  "border-[#6a8f55]/25 bg-[#6a8f55]/15 text-[#567844]",
  "border-[#c47a4a]/25 bg-[#c47a4a]/15 text-[#a86438]",
] as const;

function quickTone(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return QUICK_TONES[hash % QUICK_TONES.length];
}

export function CashierPanel({
  products,
  sales,
  settings,
  canWrite,
}: {
  products: Product[];
  sales: WalkInSale[];
  settings: WorkshopSettings;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [state, action, pending] = useQueuedAction(saveSaleAction, "saveSale");
  const [lines, setLines] = useState<{ productId: string; qty: number }[]>([]);
  const [payMethod, setPayMethod] = useState<PayMethod | "">("");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [job, setJob] = useState<{ nonce: number; data: ReceiptSlipData } | null>(null);
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const seen = useRef<FormState>(null);
  const printed = useRef(0);
  const nonce = useRef(0);
  const total = useMemo(
    () =>
      lines.reduce((sum, line) => {
        const product = products.find((item) => item.id === line.productId);
        return sum + (product ? product.price * line.qty : 0);
      }, 0),
    [lines, products],
  );
  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = needle
      ? products.filter(
          (product) =>
            product.name.toLowerCase().includes(needle) || product.code.toLowerCase().includes(needle),
        )
      : products;
    return pool.slice(0, 40);
  }, [products, query]);
  const quickItems = useMemo(() => products.filter((product) => product.cashierQuick), [products]);

  useEffect(() => {
    if (lines.length === 0 || !payMethod) setConfirming(false);
  }, [lines.length, payMethod]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  useEffect(() => {
    if (!state?.ok || seen.current === state) return;
    seen.current = state;
    setLines([]);
    setPayMethod("");
    setQuery("");
    setOpen(false);
    setHint("");
    setConfirming(false);
    if (state.receipt) {
      const slip = receiptSlipFromSaved(settings, state.receipt);
      if (printsOnAndroid()) printReceiptSlip(slip);
      else queuePrint(slip);
    }
    router.refresh();
  }, [state, settings, router]);

  useEffect(() => {
    if (!job || printed.current === job.nonce) return;
    if (!(document.getElementById("receipt-print") instanceof HTMLElement)) return;
    printed.current = job.nonce;
    printReceiptSlip(job.data);
  }, [job]);

  function qtyOf(productId: string) {
    return lines.find((line) => line.productId === productId)?.qty ?? 0;
  }

  function addProduct(product: Product) {
    const next = qtyOf(product.id) + 1;
    if (product.stock < next) {
      setHint(product.stock <= 0 ? `Stok ${product.name} habis.` : `Stok ${product.name} tinggal ${product.stock}.`);
      setQuery("");
      setOpen(false);
      return;
    }
    setHint("");
    setLines((current) => {
      const found = current.find((line) => line.productId === product.id);
      if (found) {
        return current.map((line) =>
          line.productId === product.id ? { ...line, qty: line.qty + 1 } : line,
        );
      }
      return [...current, { productId: product.id, qty: 1 }];
    });
    setQuery("");
    setOpen(false);
  }

  function setQty(productId: string, qty: number) {
    const product = products.find((item) => item.id === productId);
    if (product && qty > product.stock) {
      setHint(`Stok ${product.name} tinggal ${product.stock}.`);
      return;
    }
    setHint("");
    setLines((current) =>
      current
        .map((line) => (line.productId === productId ? { ...line, qty } : line))
        .filter((line) => line.qty > 0),
    );
  }

  function reprint(sale: WalkInSale) {
    const slip = receiptSlipFromSale(settings, sale);
    if (printsOnAndroid()) {
      printReceiptSlip(slip);
      return;
    }
    queuePrint(slip);
  }

  function queuePrint(data: ReceiptSlipData) {
    nonce.current += 1;
    setJob({ nonce: nonce.current, data });
  }

  const cart = lines.map((line) => {
    const product = products.find((item) => item.id === line.productId);
    return {
      id: line.productId,
      qty: line.qty,
      name: product?.name ?? "Barang",
      price: product?.price ?? 0,
      stock: product?.stock ?? line.qty,
    };
  });

  return (
    <div className="relative mt-5">
      {canWrite ? (
        <form action={action} className="grid items-start gap-4 xl:grid-cols-2">
          <input type="hidden" name="lines" value={JSON.stringify(lines)} />
          <GlassCard accent className="p-4">
            <SectionTitle icon={ShoppingBag}>Jual sparepart</SectionTitle>
            {products.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Belum ada barang. Tambah dulu di menu{" "}
                <Link href="/produk" className="font-semibold text-teal">
                  Produk
                </Link>
                .
              </p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">
                {quickItems.length > 0 ? (
                  <div className="py-2">
                    <p className="text-xs font-semibold text-muted">Cepat</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {quickItems.map((product) => {
                        const Icon = productIcon(product.name);
                        const qty = qtyOf(product.id);
                        const out = product.stock <= 0 || qty >= product.stock;
                        return (
                          <button
                            key={product.id}
                            type="button"
                            disabled={out}
                            onClick={() => addProduct(product)}
                            className={`relative inline-flex max-w-40 items-center gap-1.5 rounded-xl border px-2.5 py-2 text-left disabled:opacity-45 ${quickTone(product.id)}`}
                          >
                            {qty > 0 ? (
                              <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-current text-[9px] font-bold text-[#1c1915]">
                                {qty}
                              </span>
                            ) : null}
                            <Icon className="size-3.5 shrink-0" aria-hidden />
                            <span className="line-clamp-2 text-xs leading-4 font-medium text-ink">{product.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted">
                    Belum ada kartu cepat. Nyalakan di menu{" "}
                    <Link href="/produk" className="font-semibold text-teal">
                      Produk
                    </Link>
                    .
                  </p>
                )}
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  Jenis barang
                  <select
                    aria-label="Jenis barang"
                    className={inputClass}
                    value=""
                    onChange={(event) => {
                      const product = products.find((item) => item.id === event.target.value);
                      if (product) addProduct(product);
                    }}
                  >
                    <option value="">Pilih jenis barang</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id} disabled={product.stock <= 0}>
                        {product.code ? `${product.code} · ` : ""}
                        {product.name} · {rupiah(product.price)}
                        {product.stock <= 0 ? " · habis" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div ref={boxRef} className="relative">
                  <label className="flex h-11 items-center gap-2 rounded-xl border border-line-strong bg-field px-3">
                    <Search className="size-4 shrink-0 text-muted" aria-hidden />
                    <input
                      value={query}
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                      }}
                      onFocus={() => setOpen(true)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") {
                          setOpen(false);
                          return;
                        }
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        const first = matches[0];
                        if (first) addProduct(first);
                      }}
                      placeholder="atau ketik kode / nama"
                      className="min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-muted"
                      style={{ outline: "none", boxShadow: "none" }}
                      role="combobox"
                      aria-expanded={open}
                      aria-controls={listId}
                      aria-autocomplete="list"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      aria-label="Buka daftar barang"
                      className="grid size-8 place-items-center rounded-lg text-muted"
                      onClick={() => setOpen((current) => !current)}
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </label>
                  {open ? (
                    <div
                      id={listId}
                      role="listbox"
                      className="absolute top-[calc(100%+0.35rem)] right-0 left-0 z-20 max-h-72 overflow-y-auto rounded-xl border border-line bg-white/95 p-1 shadow-[0_16px_40px_rgba(28,25,21,0.12)] dark:bg-[#16191d]/95"
                    >
                      {matches.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted">Tidak ketemu</p>
                      ) : (
                        matches.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            role="option"
                            disabled={product.stock <= 0}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover-wash disabled:opacity-50"
                            onClick={() => addProduct(product)}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium text-ink">
                                {product.code ? `${product.code} · ` : ""}
                                {product.name}
                              </span>
                              <span className="block text-xs text-muted">Stok {product.stock}</span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums">
                              {rupiah(product.price)}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
                {hint ? <p className="text-sm text-danger">{hint}</p> : null}
              </div>
            )}
          </GlassCard>
          <GlassCard className="p-4">
            <SectionTitle icon={ShoppingBag} tone="teal">
              Daftar belanja
            </SectionTitle>
            {cart.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Belum ada barang.</p>
            ) : (
              <ul className="mt-2 divide-y divide-line">
                {cart.map((line) => (
                  <li key={line.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium">{line.name}</p>
                      <p className="text-sm font-semibold tabular-nums">{rupiah(line.price * line.qty)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <p className="text-sm text-muted tabular-nums">{rupiah(line.price)}</p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          aria-label={`Kurangi ${line.name}`}
                          className="grid size-11 place-items-center rounded-xl border border-line"
                          onClick={() => setQty(line.id, line.qty - 1)}
                        >
                          <Minus className="size-4" aria-hidden />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.qty}</span>
                        <button
                          type="button"
                          aria-label={`Tambah ${line.name}`}
                          disabled={line.qty >= line.stock}
                          className="grid size-11 place-items-center rounded-xl border border-line disabled:opacity-40"
                          onClick={() => setQty(line.id, line.qty + 1)}
                        >
                          <Plus className="size-4" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="ml-1 h-11 rounded-xl px-2 text-xs font-semibold text-danger"
                          onClick={() => setQty(line.id, 0)}
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex flex-col gap-3">
              <select
                name="payMethod"
                required
                className={inputClass}
                value={payMethod}
                onChange={(event) => setPayMethod(event.target.value as PayMethod | "")}
              >
                <option value="">Tempat uang</option>
                {PAY_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {payMethodLabel[method]}
                  </option>
                ))}
              </select>
              <p className="text-lg font-semibold tabular-nums">{rupiah(total)}</p>
              <FormMessage state={state} />
              {confirming ? (
                <div className="flex flex-col gap-3">
                  <p className="text-sm">
                    Simpan {cart.reduce((sum, line) => sum + line.qty, 0)} barang, total {rupiah(total)}
                    {payMethod ? `, ${payMethodLabel[payMethod]}` : ""}? Struk ikut tercetak.
                  </p>
                  <button
                    type="button"
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-line-strong px-4 text-sm font-semibold"
                    onClick={() => setConfirming(false)}
                  >
                    Batal
                  </button>
                  <SaveButton pending={pending} disabled={lines.length === 0 || !payMethod} className="w-full">
                    Ya, simpan dan cetak
                  </SaveButton>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${buttonClass} w-full`}
                  disabled={lines.length === 0 || !payMethod || pending}
                  onClick={() => setConfirming(true)}
                >
                  Simpan dan cetak
                </button>
              )}
            </div>
            {sales.length > 0 ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-xs font-semibold text-muted">Cetak ulang</p>
                <ul className="mt-1 max-h-40 divide-y divide-line overflow-y-auto">
                  {sales.slice(0, 8).map((sale) => (
                    <li key={sale.id} className="flex items-center justify-between gap-3 py-2">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {sale.no} · {receiptDateLabel(sale.businessDate)}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {sale.lines.map((line) => `${line.name} × ${line.qty}`).join(", ")}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line px-2.5 text-xs font-semibold"
                        onClick={() => reprint(sale)}
                      >
                        <Printer className="size-3.5" aria-hidden />
                        Cetak
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </GlassCard>
        </form>
      ) : (
        <GlassCard className="p-4">
          <SectionTitle icon={Printer} tone="teal">
            Cetak ulang
          </SectionTitle>
          {sales.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Belum ada penjualan.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {sales.map((sale) => (
                <li key={sale.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    <span className="block font-medium">
                      {sale.no} · {receiptDateLabel(sale.businessDate)}
                    </span>
                    <span className="block text-sm text-muted">
                      {sale.lines.map((line) => `${line.name} × ${line.qty}`).join(", ")}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-line px-2.5 text-xs font-semibold"
                    onClick={() => reprint(sale)}
                  >
                    <Printer className="size-3.5" aria-hidden />
                    Cetak
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      )}
      {job ? (
        <div className="pointer-events-none absolute top-0 left-0 -z-10 h-0 overflow-hidden" aria-hidden>
          <ReceiptSlip data={job.data} />
        </div>
      ) : null}
    </div>
  );
}
