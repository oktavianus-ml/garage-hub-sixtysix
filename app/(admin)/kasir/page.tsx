import { CashierPanel } from "@/components/workshop/cashier-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listProducts, listSales } from "@/lib/data/records";
import { getWorkshopSettings } from "@/lib/data/settings";

export const metadata = { title: "Kasir" };

export default async function KasirPage() {
  const { canWrite } = await guard("/kasir");
  const [products, sales, settings] = await Promise.all([
    listProducts(),
    listSales(),
    getWorkshopSettings(),
  ]);
  return (
    <div>
      <PageHeader title="Kasir" description="Penjualan sparepart tanpa bongkar mesin." href="/kasir" />
      <CashierPanel products={products} sales={sales} settings={settings} canWrite={canWrite} />
    </div>
  );
}
