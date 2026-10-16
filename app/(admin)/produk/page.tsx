import { ProductsPanel } from "@/components/workshop/products-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listDistributors, listProducts } from "@/lib/data/records";

export const metadata = { title: "Produk" };

export default async function ProdukPage() {
  const { canWrite } = await guard("/produk");
  const [products, distributors] = await Promise.all([listProducts(), listDistributors()]);
  return (
    <div>
      <PageHeader title="Produk" description="Master barang, harga, dan distributor pemasoknya." href="/produk" />
      <ProductsPanel products={products} distributors={distributors} canWrite={canWrite} />
    </div>
  );
}
