import { SupplyItemsPanel } from "@/components/workshop/supply-items-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listSupplyItems } from "@/lib/data/records";

export const metadata = { title: "Barang pengadaan" };

export default async function PengadaanBarangPage() {
  const { canWrite } = await guard("/pengadaan/barang");
  const items = await listSupplyItems();
  return (
    <div>
      <PageHeader
        title="Barang"
        description="Daftarkan perlengkapan sekali, lalu pilih lagi saat order."
        href="/pengadaan/barang"
      />
      <SupplyItemsPanel items={items} canWrite={canWrite} />
    </div>
  );
}
