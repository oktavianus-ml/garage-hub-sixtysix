import { CustomersPanel } from "@/components/workshop/customers-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listCustomers, listVehicles } from "@/lib/data/records";

export const metadata = { title: "Pelanggan" };

export default async function PelangganPage() {
  const { canWrite } = await guard("/pelanggan");
  const [customers, vehicles] = await Promise.all([listCustomers(), listVehicles()]);
  return (
    <div>
      <PageHeader
        title="Pelanggan"
        description="Data pelanggan dan motor yang dipakai tiap servis."
      />
      <CustomersPanel customers={customers} vehicles={vehicles} canWrite={canWrite} />
    </div>
  );
}
