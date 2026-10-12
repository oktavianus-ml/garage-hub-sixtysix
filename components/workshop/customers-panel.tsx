"use client";

import { useActionState } from "react";
import { saveCustomerAction, saveVehicleAction } from "@/lib/data/actions";
import type { Customer, Vehicle } from "@/lib/data/records";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { GlassCard } from "@/components/ui/glass-card";

export function CustomersPanel({
  customers,
  vehicles,
  canWrite,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  canWrite: boolean;
}) {
  const [customerState, customerAction, customerPending] = useActionState(saveCustomerAction, null);
  const [vehicleState, vehicleAction, vehiclePending] = useActionState(saveVehicleAction, null);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="p-4">
          <h2 className="text-base font-semibold">Pelanggan baru</h2>
          <form action={customerAction} className="mt-3 flex flex-col gap-3">
            <input name="name" required placeholder="Nama" className={inputClass} />
            <input name="phone" placeholder="Telepon" className={inputClass} />
            {customerState?.message ? <p className="text-sm text-danger">{customerState.message}</p> : null}
            <button className={buttonClass} disabled={customerPending}>
              Simpan pelanggan
            </button>
          </form>
        </GlassCard>
      ) : null}
      {canWrite ? (
        <GlassCard accent className="p-4">
          <h2 className="text-base font-semibold">Motor pelanggan</h2>
          <form action={vehicleAction} className="mt-3 flex flex-col gap-3">
            <select name="customerId" required className={inputClass} defaultValue="">
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
            <input name="brand" required placeholder="Merk" className={inputClass} />
            <input name="bikeType" required placeholder="Tipe" className={inputClass} />
            <input name="year" required inputMode="numeric" placeholder="Tahun" className={inputClass} />
            {vehicleState?.message ? <p className="text-sm text-danger">{vehicleState.message}</p> : null}
            <button className={buttonClass} disabled={vehiclePending || customers.length === 0}>
              Simpan motor
            </button>
          </form>
        </GlassCard>
      ) : null}
      <GlassCard className="p-4 lg:col-span-2">
        <h2 className="text-base font-semibold">Daftar</h2>
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
