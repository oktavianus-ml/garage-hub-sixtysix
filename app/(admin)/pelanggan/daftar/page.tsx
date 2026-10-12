import { CustomersPanel } from "@/components/workshop/customers-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listCustomers, listVehicles } from "@/lib/data/records";

export const metadata = { title: "Daftar pelanggan" };

export default async function DaftarPelangganPage() {
  const { canWrite } = await guard("/pelanggan/daftar");
  const [customers, vehicles] = await Promise.all([listCustomers(), listVehicles()]);
  return (
    <div>
      <PageHeader
        title="Daftar"
        description="Nama, telepon, dan motor yang sudah tercatat."
        href="/pelanggan/daftar"
      />
      <CustomersPanel view="daftar" customers={customers} vehicles={vehicles} canWrite={canWrite} />
    </div>
  );
}
