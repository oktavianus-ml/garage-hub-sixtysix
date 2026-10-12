"use client";

import { useActionState, useState } from "react";
import { Bike, List, UserPlus } from "lucide-react";
import { saveCustomerAction, saveVehicleAction } from "@/lib/data/actions";
import { OTHER_BIKE, bikeBrands, bikeTypes, yearsForBike } from "@/lib/data/bikes";
import type { Customer, Vehicle } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

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
      <GlassCard className="p-4 lg:col-span-2">
        <SectionTitle icon={List} tone="teal">
          Daftar
        </SectionTitle>
        {customers.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada pelanggan.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {customers.map((customer) => {
              const bikes = vehicles.filter((vehicle) => vehicle.customerId === customer.id);
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
      </GlassCard>
    </div>
  );
}
