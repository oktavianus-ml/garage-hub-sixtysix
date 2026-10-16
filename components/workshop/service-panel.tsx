"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useMemo, useState } from "react";
import { ClipboardList, Wrench } from "lucide-react";
import { saveServiceAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { PAY_METHODS, payMethodLabel } from "@/lib/data/payment";
import type { Customer, Product, ServiceOrder, SpkStatus, StaffUser, Vehicle } from "@/lib/data/records";
import { composeComplaint, parseComplaint, SERVICE_JOBS } from "@/lib/data/service-jobs";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { MoneyInput } from "@/components/ui/money-input";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
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
  const [state, action, pending] = useQueuedAction(saveServiceAction, "saveService");
  const [customerId, setCustomerId] = useState(editing?.customerId ?? "");
  const [status, setStatus] = useState<SpkStatus>(editing?.status ?? "antri");
  const [parts, setParts] = useState(editing?.parts.map((part) => ({ productId: part.productId, qty: part.qty })) ?? []);
  const initialJobs = useMemo(() => parseComplaint(editing?.complaint ?? ""), [editing?.complaint]);
  const [jobIds, setJobIds] = useState(initialJobs.ids);
  const [otherJob, setOtherJob] = useState(initialJobs.other);
  const [otherOpen, setOtherOpen] = useState(initialJobs.other.length > 0);
  const [jobError, setJobError] = useState("");
  const complaint = useMemo(
    () => composeComplaint(jobIds, otherOpen ? otherJob : ""),
    [jobIds, otherJob, otherOpen],
  );
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
          <SectionTitle icon={Wrench}>{editing ? editing.no : "SPK baru"}</SectionTitle>
          {locked ? (
            <p className="mt-3 text-sm text-muted">SPK ini tidak bisa diubah dari peran ini.</p>
          ) : (
            <form
              action={action}
              className="mt-3 flex flex-col gap-3"
              onSubmit={(event) => {
                if (complaint.trim()) {
                  setJobError("");
                  return;
                }
                event.preventDefault();
                setJobError("Pilih pekerjaan atau isi lain-lain.");
              }}
            >
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <input type="hidden" name="parts" value={JSON.stringify(parts)} />
              <input type="hidden" name="complaint" value={complaint} />
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
              <div className="rounded-xl border border-teal/25 bg-teal-soft p-2">
                <div className="grid grid-cols-4 gap-1.5">
                  {SERVICE_JOBS.map((job) => {
                    const active = jobIds.includes(job.id);
                    return (
                      <button
                        key={job.id}
                        type="button"
                        aria-pressed={active}
                        className={cn(
                          "rounded-lg border px-1.5 py-1.5 text-center text-xs font-semibold leading-tight",
                          active ? "border-amber bg-field text-ink" : "border-transparent bg-field/70 text-ink",
                        )}
                        onClick={() => {
                          setJobError("");
                          setJobIds((current) =>
                            current.includes(job.id)
                              ? current.filter((id) => id !== job.id)
                              : [...current, job.id],
                          );
                        }}
                      >
                        {job.title}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    aria-pressed={otherOpen}
                    className={cn(
                      "rounded-lg border px-1.5 py-1.5 text-center text-xs font-semibold leading-tight",
                      otherOpen ? "border-amber bg-field text-ink" : "border-transparent bg-field/70 text-ink",
                    )}
                    onClick={() => {
                      setJobError("");
                      setOtherOpen((open) => !open);
                    }}
                  >
                    Lain-lain
                  </button>
                </div>
                {jobIds.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {SERVICE_JOBS.filter((job) => jobIds.includes(job.id)).map((job) => (
                      <li key={job.id} className="rounded-lg bg-field/80 px-2 py-1.5 text-xs leading-5 text-muted">
                        <span className="font-semibold text-ink">{job.title}. </span>
                        {job.tasks.map((task) => task.charAt(0).toUpperCase() + task.slice(1)).join(", ")}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {otherOpen ? (
                  <input
                    value={otherJob}
                    placeholder="Misalnya bunyi mesin"
                    className={`${inputClass} mt-2 h-9 text-sm`}
                    onChange={(event) => {
                      setJobError("");
                      setOtherJob(event.target.value);
                    }}
                  />
                ) : null}
              </div>
              {jobError ? <p className="text-sm text-danger">{jobError}</p> : null}
              <select name="mechanicId" required className={inputClass} defaultValue={editing?.mechanicId ?? ""}>
                <option value="">Mekanik</option>
                {mechanics.map((mechanic) => (
                  <option key={mechanic.id} value={mechanic.id}>
                    {mechanic.name}
                  </option>
                ))}
              </select>
              <MoneyInput
                key={editing?.id ?? "baru"}
                name="laborCost"
                required
                placeholder="Ongkos jasa"
                defaultValue={editing?.laborCost ?? 0}
              />
              <select name="status" className={inputClass} value={status} onChange={(event) => setStatus(event.target.value as SpkStatus)}>
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {labels[item]}
                  </option>
                ))}
              </select>
              <select name="payMethod" className={inputClass} defaultValue={editing?.payMethod ?? ""} required={status === "lunas"}>
                <option value="">Tempat uang{status === "lunas" ? "" : ", wajib saat lunas"}</option>
                {PAY_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {payMethodLabel[method]}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                <select id="part-pick" className={inputClass} defaultValue="">
                  <option value="">Tambah part</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.code ? `${product.code} · ` : ""}
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
              <FormMessage state={state} />
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
        <SectionTitle icon={ClipboardList} tone="teal">
          Order
        </SectionTitle>
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
                <p className="text-sm font-semibold text-amber tabular-nums">
                  {rupiah(order.grand)}
                  {order.status === "lunas" ? ` · ${order.payMethod ? payMethodLabel[order.payMethod] : "Belum dicatat"}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
