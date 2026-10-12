"use client";

import { useActionState, useMemo, useState } from "react";
import { Bike, List, Search, UserPlus } from "lucide-react";
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

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
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
  const [customerId, setCustomerId] = useState(selectedCustomerId);
  const [brandChoice, setBrandChoice] = useState("");
  const [typeChoice, setTypeChoice] = useState("");
  const [yearChoice, setYearChoice] = useState("");
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

  return (
    <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="flex h-full flex-col p-4">
          <SectionTitle icon={UserPlus}>Pelanggan baru</SectionTitle>
          <form action={customerAction} className="mt-3 flex flex-1 flex-col gap-3">
            <input name="name" required placeholder="Nama" className={inputClass} />
            <input name="phone" placeholder="Telepon" className={inputClass} />
            {customerState?.message ? <p className="text-sm text-danger">{customerState.message}</p> : null}
            <p className="mt-auto text-sm leading-6 text-muted">
              Simpan dulu. Nama ini langsung terpilih di kartu motor.
            </p>
            <SaveButton pending={customerPending}>Simpan pelanggan</SaveButton>
          </form>
        </GlassCard>
      ) : null}
      {canWrite ? (
        <GlassCard accent className="flex h-full flex-col p-4">
          <SectionTitle icon={Bike}>Motor pelanggan</SectionTitle>
          <form action={vehicleAction} className="mt-3 flex flex-1 flex-col gap-3">
            <select
              name="customerId"
              required
              className={inputClass}
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
            <input name="plate" required placeholder="Plat" className={inputClass} />
            <select
              required
              className={inputClass}
              name={brandIsOther ? undefined : "brand"}
              value={brandChoice}
              onChange={(event) => {
                setBrandChoice(event.target.value);
                setTypeChoice("");
                setYearChoice("");
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
              <input name="brand" required placeholder="Merk" className={inputClass} />
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
              <input name="bikeType" required placeholder="Tipe" className={inputClass} />
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
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            {vehicleState?.message ? <p className="text-sm text-danger">{vehicleState.message}</p> : null}
            <SaveButton pending={vehiclePending} disabled={customers.length === 0} className="mt-auto">
              Simpan motor
            </SaveButton>
          </form>
        </GlassCard>
      ) : null}
      <CustomerDirectory customers={customers} vehicles={vehicles} />
    </div>
  );
}

function CustomerDirectory({
  customers,
  vehicles,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
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
                return (
                  <li key={customer.id} className="py-3">
                    <p className="font-medium">{customer.name}</p>
                    <p className="text-xs text-muted">{customer.phone || "Tanpa telepon"}</p>
                    {bikes.length === 0 ? (
                      <p className="mt-1 text-sm text-muted">Belum ada motor.</p>
                    ) : (
                      <ul className="mt-2 flex flex-col gap-1">
                        {bikes.map((bike) => (
                          <li key={bike.id} className="text-sm">
                            {bike.plate} · {bike.brand} {bike.bikeType} · {bike.year}
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
