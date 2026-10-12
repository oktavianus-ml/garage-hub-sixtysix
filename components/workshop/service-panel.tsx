"use client";

import { useMemo, useState, useActionState } from "react";
import { saveServiceAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import type { Customer, Product, ServiceOrder, SpkStatus, StaffUser, Vehicle } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { GlassCard } from "@/components/ui/glass-card";

const labels: Record<SpkStatus, string> = {
  antri: "Antri",
  dikerjakan: "Dikerjakan",
  selesai: "Selesai",
  lunas: "Lunas",
  batal: "Batal",
};

const statusClass: Record<SpkStatus, string> = {
  antri: "bg-amber-soft text-amber",
  dikerjakan: "bg-teal-soft text-teal",
  selesai: "bg-chip text-ink",
  lunas: "bg-teal-soft text-teal",
  batal: "bg-danger-soft text-danger",
};

export function ServicePanel({
  orders,
  customers,
  vehicles,
  products,
  mechanics,
  canWrite,
  canPay,
  editing,
}: {
  orders: ServiceOrder[];
  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
  mechanics: StaffUser[];
  canWrite: boolean;
  canPay: boolean;
  editing: ServiceOrder | null;
}) {
  const [state, action, pending] = useActionState(saveServiceAction, null);
  const [customerId, setCustomerId] = useState(editing?.customerId ?? "");
  const [parts, setParts] = useState(editing?.parts.map((part) => ({ productId: part.productId, qty: part.qty })) ?? []);
  const bikes = vehicles.filter((vehicle) => vehicle.customerId === customerId);
  const locked = !canWrite || (!canPay && (editing?.status === "lunas" || editing?.status === "batal"));
  const statuses: SpkStatus[] = canPay
    ? ["antri", "dikerjakan", "selesai", "lunas", "batal"]
    : ["antri", "dikerjakan", "selesai"];
  const total = useMemo(() => {
    const partsTotal = parts.reduce((sum, part) => {
      const product = products.find((item) => item.id === part.productId);
      return sum + (product ? product.price * part.qty : 0);
    }, 0);
    return partsTotal;
  }, [parts, products]);

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="p-4">
          <h2 className="text-base font-semibold">{editing ? editing.no : "SPK baru"}</h2>
          {locked ? (
            <p className="mt-3 text-sm text-muted">SPK ini tidak bisa diubah dari peran ini.</p>
          ) : (
            <form action={action} className="mt-3 flex flex-col gap-3">
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <input type="hidden" name="parts" value={JSON.stringify(parts)} />
              <select
                name="customerId"
                required
                className={inputClass}
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                <option value="">Pelanggan</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
              <select name="vehicleId" required className={inputClass} defaultValue={editing?.vehicleId ?? ""}>
                <option value="">Motor</option>
                {bikes.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {bike.plate} · {bike.brand} {bike.bikeType}
                  </option>
                ))}
              </select>
              <textarea
                name="complaint"
                required
                placeholder="Keluhan"
                defaultValue={editing?.complaint ?? ""}
                className={`${inputClass} h-24 py-2`}
              />
              <select name="mechanicId" required className={inputClass} defaultValue={editing?.mechanicId ?? ""}>
                <option value="">Mekanik</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </option>
                ))}
              </select>
              <input
                name="laborCost"
                required
                inputMode="numeric"
                placeholder="Ongkos jasa"
                defaultValue={editing?.laborCost ?? 0}
                className={inputClass}
              />
              <select name="status" className={inputClass} defaultValue={editing?.status ?? "antri"}>
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {labels[status]}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select id="part-pick" className={inputClass} defaultValue="">
                  <option value="">Tambah part</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · stok {product.stock}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="h-11 shrink-0 rounded-xl border border-line px-3 text-sm font-semibold"
                  onClick={() => {
                    const select = document.getElementById("part-pick") as HTMLSelectElement | null;
                    const productId = select?.value ?? "";
                    if (!productId) return;
                    setParts((current) => {
                      const found = current.find((part) => part.productId === productId);
                      if (found) {
                        return current.map((part) =>
                          part.productId === productId ? { ...part, qty: part.qty + 1 } : part,
                        );
                      }
                      return [...current, { productId, qty: 1 }];
                    });
                  }}
                >
                  Tambah
                </button>
              </div>
              <ul className="divide-y divide-line">
                {parts.map((part) => {
                  const product = products.find((item) => item.id === part.productId);
                  return (
                    <li key={part.productId} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span>{product?.name ?? "Part"}</span>
                      <input
                        inputMode="numeric"
                        value={part.qty}
                        className="h-11 w-20 rounded-xl border border-line bg-chip px-2 text-center"
                        onChange={(event) => {
                          const qty = Number(event.target.value);
                          setParts((current) =>
                            current
                              .map((item) => (item.productId === part.productId ? { ...item, qty } : item))
                              .filter((item) => item.qty > 0),
                          );
                        }}
                      />
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-muted">Perkiraan part {rupiah(total)} ditambah ongkos jasa.</p>
              {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
              <SaveButton pending={pending} disabled={mechanics.length === 0}>
                Simpan SPK
              </SaveButton>
              {mechanics.length === 0 ? (
                <p className="text-sm text-muted">Tambah pegawai mekanik dulu.</p>
              ) : null}
            </form>
          )}
        </GlassCard>
      ) : null}
      <GlassCard className="p-4">
        <h2 className="text-base font-semibold">Order</h2>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada SPK.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id} className="py-3">
                <a href={`/service?id=${order.id}`} className="inline-flex flex-wrap items-center gap-2 font-medium">
                  {order.no}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass[order.status]}`}>
                    {labels[order.status]}
                  </span>
                </a>
                <p className="text-sm text-muted">
                  {order.customerName} · {order.plate} · {order.mechanicName}
                </p>
                <p className="text-sm font-semibold text-amber tabular-nums">{rupiah(order.grand)}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
