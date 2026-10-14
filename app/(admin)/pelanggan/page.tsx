import Link from "next/link";
import { Plus } from "lucide-react";
import { CustomersPanel } from "@/components/workshop/customers-panel";
import { goldGlass } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { cn } from "@/lib/cn";
import { listCustomers, listVehicles } from "@/lib/data/records";

export const metadata = { title: "Pelanggan" };

export default async function PelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ pelanggan?: string; motor?: string; baru?: string }>;
}) {
  const { canWrite } = await guard("/pelanggan");
  const { pelanggan, motor, baru } = await searchParams;
  const [customers, vehicles] = await Promise.all([listCustomers(), listVehicles()]);
  const vehicle = motor ? vehicles.find((item) => item.id === motor) : undefined;
  const customerId = vehicle
    ? vehicle.customerId
    : pelanggan && customers.some((customer) => customer.id === pelanggan)
      ? pelanggan
      : "";
  const mode = baru === "pelanggan" || baru === "motor" ? baru : "";

  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description="Cari pelanggan dan catat motornya."
        href="/pelanggan"
        action={
          canWrite ? (
            <Link
              href="/pelanggan?baru=pelanggan"
              className={cn(
                goldGlass,
                "inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold",
              )}
            >
              <Plus className="size-5" aria-hidden />
              Tambah pelanggan
            </Link>
          ) : null
        }
      />
      <CustomersPanel
        customers={customers}
        vehicles={vehicles}
        canWrite={canWrite}
        customerId={customerId}
        vehicleId={vehicle?.id ?? ""}
        mode={mode}
      />
    </div>
  );
}
