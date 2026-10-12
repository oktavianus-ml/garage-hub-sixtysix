import { CustomersPanel } from "@/components/workshop/customers-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listCustomers, listVehicles } from "@/lib/data/records";

export const metadata = { title: "Pelanggan" };

export default async function PelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ pelanggan?: string }>;
}) {
  const { canWrite } = await guard("/pelanggan");
  const { pelanggan } = await searchParams;
  const [customers, vehicles] = await Promise.all([listCustomers(), listVehicles()]);
  const selectedCustomerId =
    pelanggan && customers.some((customer) => customer.id === pelanggan) ? pelanggan : "";
  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description="Data pelanggan dan motor yang dipakai tiap servis."
        href="/pelanggan"
      />
      <CustomersPanel
        customers={customers}
        vehicles={vehicles}
        canWrite={canWrite}
        selectedCustomerId={selectedCustomerId}
      />
    </div>
  );
}
