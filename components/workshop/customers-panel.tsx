"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
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
type CustomerView = "daftar" | "data" | "motor";

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
  view,
  customers,
  vehicles,
  canWrite,
  customerId = "",
  vehicleId = "",
}: {
  view: CustomerView;
  customers: Customer[];
  vehicles: Vehicle[];
  canWrite: boolean;
  customerId?: string;
  vehicleId?: string;
}) {
  const customer = customers.find((item) => item.id === customerId) ?? null;
  const vehicle = vehicles.find((item) => item.id === vehicleId) ?? null;

  if (view === "data") {
    return <CustomerForm key={customer?.id ?? "baru"} customer={customer} canWrite={canWrite} />;
  }
  if (view === "motor") {
    return (
      <VehicleForm
        key={vehicle?.id ?? `baru-${customerId}`}
        customers={customers}
        vehicle={vehicle}
        selectedCustomerId={customerId}
        canWrite={canWrite}
      />
    );
  }
  return <CustomerDirectory customers={customers} vehicles={vehicles} canWrite={canWrite} />;
}

function CustomerForm({ customer, canWrite }: { customer: Customer | null; canWrite: boolean }) {
  const [state, action, pending] = useActionState(saveCustomerAction, null);
  const [name, setName] = useState(customer?.name ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");

  return (
    <div className="mt-5 max-w-xl">
      <GlassCard accent={!customer} className={cn("p-4", customer && "border-t-2 border-t-teal")}>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle icon={customer ? Pencil : UserPlus} tone={customer ? "teal" : "amber"}>
            {customer ? "Ubah pelanggan" : "Pelanggan baru"}
          </SectionTitle>
          <RecordMark kind={customer ? "revisi" : "baru"} />
        </div>
        {canWrite ? (
          <form action={action} className="mt-3 flex flex-col gap-3">
            {customer ? <input type="hidden" name="id" value={customer.id} /> : null}
            <input
              name="name"
              required
              placeholder="Nama"
              className={inputClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <input
              name="phone"
              placeholder="Telepon"
              className={inputClass}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
            <p className="text-sm leading-6 text-muted">
              {customer
                ? "Perubahan menimpa nama dan telepon pelanggan ini."
                : "Setelah disimpan, lanjut isi motor pelanggan ini."}
            </p>
            <div className="flex gap-2">
              {customer ? (
                <Link
                  href="/pelanggan/data"
                  className="inline-flex h-11 items-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                >
                  Batal
                </Link>
              ) : null}
              <SaveButton pending={pending} className="flex-1">
                {customer ? "Simpan perubahan" : "Simpan pelanggan"}
              </SaveButton>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">
            {customer
              ? `${customer.name}. ${customer.phone || "Tanpa telepon"}. Akun ini hanya bisa melihat.`
              : "Akun ini hanya bisa melihat. Daftar nama ada di menu Daftar."}
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function VehicleForm({
  customers,
  vehicle,
  selectedCustomerId,
  canWrite,
}: {
  customers: Customer[];
  vehicle: Vehicle | null;
  selectedCustomerId: string;
  canWrite: boolean;
}) {
  const choices = vehicle ? vehicleChoices(vehicle) : null;
  const [state, action, pending] = useActionState(saveVehicleAction, null);
  const [customerId, setCustomerId] = useState(vehicle?.customerId || selectedCustomerId);
  const [plate, setPlate] = useState(vehicle?.plate ?? "");
  const [brandChoice, setBrandChoice] = useState(choices?.brandChoice ?? "");
  const [typeChoice, setTypeChoice] = useState(choices?.typeChoice ?? "");
  const [yearChoice, setYearChoice] = useState(vehicle ? String(vehicle.year) : "");
  const [customBrand, setCustomBrand] = useState(choices?.customBrand ?? "");
  const [customType, setCustomType] = useState(choices?.customType ?? "");
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
  const owner = customers.find((customer) => customer.id === (vehicle?.customerId || customerId));

  return (
    <div className="mt-5 max-w-xl">
      <GlassCard accent={!vehicle} className={cn("p-4", vehicle && "border-t-2 border-t-teal")}>
        <div className="flex items-start justify-between gap-3">
          <SectionTitle icon={vehicle ? Pencil : Bike} tone={vehicle ? "teal" : "amber"}>
            {vehicle ? "Ubah motor" : "Motor pelanggan"}
          </SectionTitle>
          <RecordMark kind={vehicle ? "revisi" : "baru"} />
        </div>
        {canWrite ? (
          <form action={action} className="mt-3 flex flex-col gap-3">
            {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
            {vehicle ? <input type="hidden" name="customerId" value={vehicle.customerId} /> : null}
            <select
              name={vehicle ? undefined : "customerId"}
              required={!vehicle}
              disabled={Boolean(vehicle)}
              className={cn(inputClass, vehicle && "opacity-70")}
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
            {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
            <p className="text-sm leading-6 text-muted">
              {vehicle
                ? "Hanya motor ini yang berubah. Motor lain tetap seperti semula."
                : customers.length === 0
                  ? "Simpan data pelanggan dulu, baru motornya bisa dicatat."
                  : "Plat, merk, tipe, dan tahun menempel ke pelanggan yang dipilih."}
            </p>
            <div className="flex gap-2">
              {vehicle ? (
                <Link
                  href="/pelanggan/motor"
                  className="inline-flex h-11 items-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                >
                  Batal
                </Link>
              ) : null}
              <SaveButton pending={pending} disabled={customers.length === 0} className="flex-1">
                {vehicle ? "Simpan perubahan" : "Simpan motor"}
              </SaveButton>
            </div>
          </form>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted">
            {vehicle
              ? `${vehicle.plate} · ${vehicle.brand} ${vehicle.bikeType} · ${vehicle.year}. ${owner?.name ?? "Pelanggan"}. Akun ini hanya bisa melihat.`
              : "Akun ini hanya bisa melihat. Motor yang sudah tercatat ada di menu Daftar."}
          </p>
        )}
      </GlassCard>
    </div>
  );
}

function CustomerDirectory({
  customers,
  vehicles,
  canWrite,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  canWrite: boolean;
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
    <GlassCard className="mt-5 p-4">
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
                return (
                  <li key={customer.id} className="py-3">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{customer.name}</p>
                      {canWrite ? (
                        <Link href={`/pelanggan/data?id=${encodeURIComponent(customer.id)}`} className="text-xs font-semibold text-teal">
                          Ubah
                        </Link>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">{customer.phone || "Tanpa telepon"}</p>
                    {bikes.length === 0 ? (
                      <p className="mt-1 text-sm text-muted">Belum ada motor.</p>
                    ) : (
                      <ul className="mt-2 flex flex-col gap-1">
                        {bikes.map((bike) => (
                          <li key={bike.id} className="flex flex-wrap items-center gap-1.5 rounded-lg py-0.5 text-sm">
                            <span>
                              {bike.plate} · {bike.brand} {bike.bikeType} · {bike.year}
                            </span>
                            {canWrite ? (
                              <Link
                                href={`/pelanggan/motor?id=${encodeURIComponent(bike.id)}`}
                                aria-label={`Ubah motor ${bike.plate}`}
                                className="inline-flex size-7 items-center justify-center rounded-lg text-teal"
                              >
                                <Pencil className="size-3.5" aria-hidden />
                              </Link>
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
