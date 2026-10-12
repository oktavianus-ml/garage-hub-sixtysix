import { CustomersPanel } from "@/components/workshop/customers-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listCustomers } from "@/lib/data/records";

export const metadata = { title: "Data pelanggan" };

export default async function DataPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { canWrite } = await guard("/pelanggan/data");
  const { id } = await searchParams;
  const customers = await listCustomers();
  const customerId = id && customers.some((customer) => customer.id === id) ? id : "";
  return (
    <div>
      <PageHeader
        title="Data"
        description="Tambah atau ubah nama dan telepon pelanggan."
        href="/pelanggan/data"
      />
      <CustomersPanel view="data" customers={customers} vehicles={[]} canWrite={canWrite} customerId={customerId} />
    </div>
  );
}
