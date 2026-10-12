import { CustomersPanel } from "@/components/workshop/customers-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listCustomers, listVehicles } from "@/lib/data/records";

export const metadata = { title: "Motor pelanggan" };

export default async function MotorPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; pelanggan?: string }>;
}) {
  const { canWrite } = await guard("/pelanggan/motor");
  const { id, pelanggan } = await searchParams;
  const [customers, vehicles] = await Promise.all([listCustomers(), listVehicles()]);
  const vehicle = id ? vehicles.find((item) => item.id === id) : undefined;
  const customerId = vehicle
    ? vehicle.customerId
    : pelanggan && customers.some((customer) => customer.id === pelanggan)
      ? pelanggan
      : "";
  return (
    <div>
      <PageHeader
        title="Motor"
        description="Catat plat, merk, tipe, dan tahun motor pelanggan."
        href="/pelanggan/motor"
      />
      <CustomersPanel
        view="motor"
        customers={customers}
        vehicles={vehicles}
        canWrite={canWrite}
        customerId={customerId}
        vehicleId={vehicle?.id ?? ""}
      />
    </div>
  );
}
