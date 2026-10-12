"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Bike, List, Pencil, Search, UserPlus } from "lucide-react";
import { saveCustomerAction, saveVehicleAction } from "@/lib/data/actions";
import { OTHER_BIKE, bikeBrands, bikeTypes, yearsForBike } from "@/lib/data/bikes";
import type { Customer, Vehicle } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 8;

const bikeFilters = [
  { id: "semua", label: "Semua" },
  { id: "ada", label: "Punya motor" },
  { id: "kosong", label: "Belum ada motor" },
] as const;

type BikeFilter = (typeof bikeFilters)[number]["id"];

function RecordMark({ kind }: { kind: "baru" | "revisi" }) {
  const revisi = kind === "revisi";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        revisi ? "bg-teal-soft text-teal" : "bg-amber-soft text-amber",
      )}
    >
      {revisi ? "Sudah terdaftar" : "Baru"}
    </span>
  );
}

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function vehicleChoices(vehicle: Vehicle) {
  const knownBrand = bikeBrands().includes(vehicle.brand);
  if (!knownBrand) {
    return {
      brandChoice: OTHER_BIKE,
      typeChoice: "",
      customBrand: vehicle.brand,
      customType: vehicle.bikeType,
    };
  }
  const knownType = bikeTypes(vehicle.brand).includes(vehicle.bikeType);
  return {
    brandChoice: vehicle.brand,
    typeChoice: knownType ? vehicle.bikeType : OTHER_BIKE,
    customBrand: "",
    customType: knownType ? "" : vehicle.bikeType,
  };
}

function matchesQuery(customer: Customer, bikes: Vehicle[], query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  const fields = [
    customer.name,
    customer.phone,
    ...bikes.flatMap((bike) => [bike.plate, bike.brand, bike.bikeType, String(bike.year)]),
  ];
  return fields.some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

export function CustomersPanel({
  customers,
  vehicles,
  canWrite,
  selectedCustomerId = "",
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  canWrite: boolean;
  selectedCustomerId?: string;
}) {
  const [customerState, customerAction, customerPending] = useActionState(saveCustomerAction, null);
  const [vehicleState, vehicleAction, vehiclePending] = useActionState(saveVehicleAction, null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerId, setCustomerId] = useState(selectedCustomerId);
  const [plate, setPlate] = useState("");
  const [brandChoice, setBrandChoice] = useState("");
  const [typeChoice, setTypeChoice] = useState("");
  const [yearChoice, setYearChoice] = useState("");
  const [customBrand, setCustomBrand] = useState("");
  const [customType, setCustomType] = useState("");
  const customerCardRef = useRef<HTMLDivElement>(null);
  const vehicleCardRef = useRef<HTMLDivElement>(null);
  const customerSnapshot = customers.map((customer) => `${customer.id}:${customer.name}:${customer.phone}`).join("|");
  const vehicleSnapshot = vehicles
    .map((vehicle) => `${vehicle.id}:${vehicle.plate}:${vehicle.brand}:${vehicle.bikeType}:${vehicle.year}`)
    .join("|");
  const brandIsOther = brandChoice === OTHER_BIKE;
  const typeIsOther = typeChoice === OTHER_BIKE;
  const types = brandChoice && !brandIsOther ? bikeTypes(brandChoice) : [];
  const yearReady = brandIsOther || typeIsOther || Boolean(typeChoice);
  const years =
    brandIsOther || typeIsOther
      ? yearsForBike("", "")
      : typeChoice
        ? yearsForBike(brandChoice, typeChoice)
        : [];
  const yearList =
    yearChoice && !years.includes(Number(yearChoice)) ? [Number(yearChoice), ...years] : years;

  function beginCustomerEdit(customer: Customer) {
    setEditingCustomer(customer);
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    customerCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelCustomerEdit() {
    setEditingCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
  }

  function beginVehicleEdit(vehicle: Vehicle) {
    const choices = vehicleChoices(vehicle);
    setEditingVehicle(vehicle);
    setCustomerId(vehicle.customerId);
    setPlate(vehicle.plate);
    setBrandChoice(choices.brandChoice);
    setTypeChoice(choices.typeChoice);
    setYearChoice(String(vehicle.year));
    setCustomBrand(choices.customBrand);
    setCustomType(choices.customType);
    vehicleCardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  useEffect(() => {
    setEditingCustomer(null);
    setCustomerName("");
    setCustomerPhone("");
    setEditingVehicle(null);
    setCustomerId(selectedCustomerId);
    setPlate("");
    setBrandChoice("");
    setTypeChoice("");
    setYearChoice("");
    setCustomBrand("");
    setCustomType("");
  }, [customerSnapshot, selectedCustomerId, vehicleSnapshot]);

  function cancelVehicleEdit() {
    setEditingVehicle(null);
    setCustomerId(selectedCustomerId);
    setPlate("");
    setBrandChoice("");
    setTypeChoice("");
    setYearChoice("");
    setCustomBrand("");
    setCustomType("");
  }

  return (
    <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
      {canWrite ? (
        <div ref={customerCardRef} className="h-full">
          <GlassCard
            accent={!editingCustomer}
            className={cn("flex h-full flex-col p-4", editingCustomer && "border-t-2 border-t-teal")}
          >
          <div className="flex items-start justify-between gap-3">
            <SectionTitle icon={editingCustomer ? Pencil : UserPlus} tone={editingCustomer ? "teal" : "amber"}>
              {editingCustomer ? "Ubah pelanggan" : "Pelanggan baru"}
            </SectionTitle>
            <RecordMark kind={editingCustomer ? "revisi" : "baru"} />
          </div>
          <form action={customerAction} className="mt-3 flex flex-1 flex-col gap-3">
            {editingCustomer ? <input type="hidden" name="id" value={editingCustomer.id} /> : null}
            <input
              name="name"
              required
              placeholder="Nama"
              className={inputClass}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <input
              name="phone"
              placeholder="Telepon"
              className={inputClass}
              value={customerPhone}
              onChange={(event) => setCustomerPhone(event.target.value)}
            />
            {customerState?.message ? <p className="text-sm text-danger">{customerState.message}</p> : null}
            <p className="mt-auto text-sm leading-6 text-muted">
              {editingCustomer
                ? "Perubahan menimpa nama dan telepon pelanggan ini."
                : "Simpan dulu. Nama ini langsung terpilih di kartu motor."}
            </p>
            <div className="flex gap-2">
              {editingCustomer ? (
                <button
                  type="button"
                  className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                  onClick={cancelCustomerEdit}
                >
                  Batal
                </button>
              ) : null}
              <SaveButton pending={customerPending} className="flex-1">
                {editingCustomer ? "Simpan perubahan" : "Simpan pelanggan"}
              </SaveButton>
            </div>
          </form>
          </GlassCard>
        </div>
      ) : null}
      {canWrite ? (
        <div ref={vehicleCardRef} className="h-full">
          <GlassCard
            accent={!editingVehicle}
            className={cn("flex h-full flex-col p-4", editingVehicle && "border-t-2 border-t-teal")}
          >
          <div className="flex items-start justify-between gap-3">
            <SectionTitle icon={editingVehicle ? Pencil : Bike} tone={editingVehicle ? "teal" : "amber"}>
              {editingVehicle ? "Ubah motor" : "Motor pelanggan"}
            </SectionTitle>
            <RecordMark kind={editingVehicle ? "revisi" : "baru"} />
          </div>
          <form action={vehicleAction} className="mt-3 flex flex-1 flex-col gap-3">
            {editingVehicle ? <input type="hidden" name="id" value={editingVehicle.id} /> : null}
            {editingVehicle ? <input type="hidden" name="customerId" value={editingVehicle.customerId} /> : null}
            <select
              name={editingVehicle ? undefined : "customerId"}
              required={!editingVehicle}
              disabled={Boolean(editingVehicle)}
              className={cn(inputClass, editingVehicle && "opacity-70")}
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
            >
              <option value="" disabled>
                Pilih pelanggan
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
            <input
              name="plate"
              required
              placeholder="Plat"
              className={inputClass}
              value={plate}
              onChange={(event) => setPlate(event.target.value)}
            />
            <select
              required
              className={inputClass}
              name={brandIsOther ? undefined : "brand"}
              value={brandChoice}
              onChange={(event) => {
                setBrandChoice(event.target.value);
                setTypeChoice("");
                setYearChoice("");
                setCustomBrand("");
                setCustomType("");
              }}
            >
              <option value="" disabled>
                Pilih merk
              </option>
              {bikeBrands().map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
              <option value={OTHER_BIKE}>{OTHER_BIKE}</option>
            </select>
            {brandIsOther ? (
              <input
                name="brand"
                required
                placeholder="Merk"
                className={inputClass}
                value={customBrand}
                onChange={(event) => setCustomBrand(event.target.value)}
              />
            ) : (
              <select
                required
                className={inputClass}
                name={typeIsOther ? undefined : "bikeType"}
                value={typeChoice}
                disabled={!brandChoice}
                onChange={(event) => {
                  setTypeChoice(event.target.value);
                  setYearChoice("");
                  setCustomType("");
                }}
              >
                <option value="" disabled>
                  Pilih tipe
                </option>
                {types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
                <option value={OTHER_BIKE}>{OTHER_BIKE}</option>
              </select>
            )}
            {brandIsOther || typeIsOther ? (
              <input
                name="bikeType"
                required
                placeholder="Tipe"
                className={inputClass}
                value={customType}
                onChange={(event) => setCustomType(event.target.value)}
              />
            ) : null}
            <select
              name="year"
              required
              className={inputClass}
              value={yearChoice}
              disabled={!yearReady}
              onChange={(event) => setYearChoice(event.target.value)}
            >
              <option value="" disabled>
                Pilih tahun
              </option>
              {yearList.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {vehicleState?.message ? <p className="text-sm text-danger">{vehicleState.message}</p> : null}
            {editingVehicle ? (
              <p className="mt-auto text-sm leading-6 text-muted">
                Hanya motor ini yang berubah. Motor lain tetap seperti semula.
              </p>
            ) : null}
            <div className={cn("flex gap-2", !editingVehicle && "mt-auto")}>
              {editingVehicle ? (
                <button
                  type="button"
                  className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                  onClick={cancelVehicleEdit}
                >
                  Batal
                </button>
              ) : null}
              <SaveButton pending={vehiclePending} disabled={customers.length === 0} className="flex-1">
                {editingVehicle ? "Simpan perubahan" : "Simpan motor"}
              </SaveButton>
            </div>
          </form>
          </GlassCard>
        </div>
      ) : null}
      <CustomerDirectory
        customers={customers}
        vehicles={vehicles}
        canWrite={canWrite}
        editingCustomerId={editingCustomer?.id ?? ""}
        editingVehicleId={editingVehicle?.id ?? ""}
        onEditCustomer={beginCustomerEdit}
        onEditVehicle={beginVehicleEdit}
      />
    </div>
  );
}

function CustomerDirectory({
  customers,
  vehicles,
  canWrite,
  editingCustomerId,
  editingVehicleId,
  onEditCustomer,
  onEditVehicle,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  canWrite: boolean;
  editingCustomerId: string;
  editingVehicleId: string;
  onEditCustomer: (customer: Customer) => void;
  onEditVehicle: (vehicle: Vehicle) => void;
}) {
  const [query, setQuery] = useState("");
  const [bikeFilter, setBikeFilter] = useState<BikeFilter>("semua");
  const [page, setPage] = useState(0);
  const bikesByCustomer = useMemo(() => {
    const grouped = new Map<string, Vehicle[]>();
    for (const vehicle of vehicles) {
      const list = grouped.get(vehicle.customerId) ?? [];
      list.push(vehicle);
      grouped.set(vehicle.customerId, list);
    }
    return grouped;
  }, [vehicles]);
  const filtered = useMemo(
    () =>
      customers.filter((customer) => {
        const bikes = bikesByCustomer.get(customer.id) ?? [];
        if (bikeFilter === "ada" && bikes.length === 0) return false;
        if (bikeFilter === "kosong" && bikes.length > 0) return false;
        return matchesQuery(customer, bikes, query);
      }),
    [bikeFilter, bikesByCustomer, customers, query],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visible.length;

  return (
    <GlassCard className="p-4 lg:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={List} tone="teal">
          Daftar
        </SectionTitle>
        {customers.length > 0 ? (
          <p className="text-xs font-medium text-muted">
            {filtered.length === customers.length
              ? `${customers.length} pelanggan`
              : `${filtered.length} dari ${customers.length}`}
          </p>
        ) : null}
      </div>
      {customers.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada pelanggan.</p>
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
              placeholder="Cari nama, telepon, plat, atau motor"
              className={cn(inputClass, "pl-10")}
            />
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            {bikeFilters.map((filter) => {
              const active = bikeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={active}
                  className={cn(
                    "h-8 rounded-full border px-3 text-xs font-semibold",
                    active ? "border-teal/40 bg-teal-soft text-teal" : "border-line bg-chip text-muted",
                  )}
                  onClick={() => {
                    setBikeFilter(filter.id);
                    setPage(0);
                  }}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
          {visible.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada pelanggan yang cocok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((customer) => {
                const bikes = bikesByCustomer.get(customer.id) ?? [];
                const editingThis = editingCustomerId === customer.id;
                return (
                  <li
                    key={customer.id}
                    className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{customer.name}</p>
                      {canWrite ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-teal"
                          onClick={() => onEditCustomer(customer)}
                        >
                          Ubah
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">{customer.phone || "Tanpa telepon"}</p>
                    {bikes.length === 0 ? (
                      <p className="mt-1 text-sm text-muted">Belum ada motor.</p>
                    ) : (
                      <ul className="mt-2 flex flex-col gap-1">
                        {bikes.map((bike) => (
                          <li
                            key={bike.id}
                            className={cn(
                              "flex flex-wrap items-center gap-1.5 rounded-lg py-0.5 text-sm",
                              editingVehicleId === bike.id && "bg-teal-soft px-2 ring-1 ring-teal/30",
                            )}
                          >
                            <span>
                              {bike.plate} · {bike.brand} {bike.bikeType} · {bike.year}
                            </span>
                            {canWrite ? (
                              <button
                                type="button"
                                aria-label={`Ubah motor ${bike.plate}`}
                                className="inline-flex size-7 items-center justify-center rounded-lg text-teal"
                                onClick={() => onEditVehicle(bike)}
                              >
                                <Pencil className="size-3.5" aria-hidden />
                              </button>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
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
