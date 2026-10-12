import { InventoryPanel } from "@/components/workshop/inventory-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listProducts } from "@/lib/data/records";

export const metadata = { title: "Inventori" };

export default async function InventoriPage() {
  await guard("/inventori");
  const products = await listProducts();
  return (
    <div>
      <PageHeader title="Inventori" description="Stok yang ada dan batas aman sebelum harus order lagi." href="/inventori" />
      <InventoryPanel products={products} />
    </div>
  );
}
