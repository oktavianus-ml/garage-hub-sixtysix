import { ProductsPanel } from "@/components/workshop/products-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listProducts } from "@/lib/data/records";

export const metadata = { title: "Produk" };

export default async function ProdukPage() {
  const { canWrite } = await guard("/produk");
  const products = await listProducts();
  return (
    <div>
      <PageHeader title="Produk" description="Master barang, harga pokok, dan harga jual." href="/produk" />
      <ProductsPanel products={products} canWrite={canWrite} />
    </div>
  );
}
