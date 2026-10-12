import { ServicePanel } from "@/components/workshop/service-panel";
import { PageHeader } from "@/components/ui/page-header";
import { canMarkPaid } from "@/lib/auth/access";
import { guard } from "@/lib/auth/guard";
import { getOrder, listCustomers, listOrders, listProducts, listStaff, listVehicles } from "@/lib/data/records";

export const metadata = { title: "Service (SPK)" };

export default async function ServicePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { user, canWrite } = await guard("/service");
  const { id } = await searchParams;
  const [orders, customers, vehicles, products, staff] = await Promise.all([
    listOrders(),
    listCustomers(),
    listVehicles(),
    listProducts(),
    listStaff(),
  ]);
  const editing = id ? await getOrder(id) : null;
  const mechanics = staff.filter((person) => person.role === "mekanik" || person.role === "pemilik");

  return (
    <div>
      <PageHeader
        title="Service (SPK)"
        description="Order servis motor: keluhan, mekanik, part terpakai, dan ongkos jasa."
      />
      <ServicePanel
        orders={orders}
        customers={customers}
        vehicles={vehicles}
        products={products}
        mechanics={mechanics}
        canWrite={canWrite}
        canPay={canMarkPaid(user.role)}
        editing={editing}
      />
    </div>
  );
}
