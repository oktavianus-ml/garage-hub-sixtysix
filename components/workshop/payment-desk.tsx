"use client";

import { useActionState } from "react";
import { ClipboardPen, Receipt } from "lucide-react";
import { saveCustomerPaymentAction } from "@/lib/data/actions";
import { rupiah } from "@/lib/data/format";
import { PAY_METHODS, payMethodLabel } from "@/lib/data/payment";
import type { Customer, CustomerPayment } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

export function PaymentDesk({
  day,
  customers,
  payments,
  canWrite,
  monthClosed,
}: {
  day: string;
  customers: Customer[];
  payments: CustomerPayment[];
  canWrite: boolean;
  monthClosed: boolean;
}) {
  const [state, action, pending] = useActionState(saveCustomerPaymentAction, null);

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-2">
      {canWrite ? (
        <GlassCard accent className="p-4">
          <SectionTitle icon={ClipboardPen}>Pembayaran pelanggan</SectionTitle>
          {monthClosed ? (
            <p className="mt-3 text-sm text-muted">Bulan ini sudah ditutup.</p>
          ) : customers.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tambah pelanggan dulu.</p>
          ) : (
            <form action={action} className="mt-3 flex flex-col gap-3">
              <input type="hidden" name="day" value={day} />
              <select name="customerId" required className={inputClass} defaultValue="">
                <option value="">Pelanggan</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.phone ? ` · ${customer.phone}` : ""}
                  </option>
                ))}
              </select>
              <select name="payMethod" required className={inputClass} defaultValue="">
                <option value="">Tempat uang</option>
                {PAY_METHODS.map((method) => (
                  <option key={method} value={method}>
                    {payMethodLabel[method]}
                  </option>
                ))}
              </select>
              <input
                name="amount"
                required
                inputMode="numeric"
                placeholder="Jumlah yang dibayar"
                className={inputClass}
              />
              <input name="note" placeholder="Catatan, misalnya plat atau nomor SPK" className={inputClass} />
              {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
              <SaveButton pending={pending}>Simpan pembayaran</SaveButton>
            </form>
          )}
        </GlassCard>
      ) : null}
      <GlassCard className="p-4">
        <SectionTitle icon={Receipt} tone="teal">
          Per orang · {day}
        </SectionTitle>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada pembayaran pada tanggal ini.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {payments.map((payment) => (
              <li key={payment.id} className="flex items-start justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{payment.customerName}</p>
                  <p className="text-sm text-muted">
                    {payMethodLabel[payment.payMethod]}
                    {payment.note ? ` · ${payment.note}` : ""}
                  </p>
                </div>
                <p className="text-sm font-semibold text-amber tabular-nums">{rupiah(payment.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
