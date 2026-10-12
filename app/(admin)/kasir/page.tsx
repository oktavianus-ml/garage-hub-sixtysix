import { CashierPanel } from "@/components/workshop/cashier-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listProducts, listSales } from "@/lib/data/records";

export const metadata = { title: "Kasir" };

export default async function KasirPage() {
  const { canWrite } = await guard("/kasir");
  const [products, sales] = await Promise.all([listProducts(), listSales()]);
  return (
    <div>
      <PageHeader title="Kasir" description="Penjualan sparepart tanpa bongkar mesin." href="/kasir" />
      <CashierPanel products={products} sales={sales} canWrite={canWrite} />
    </div>
  );
}
