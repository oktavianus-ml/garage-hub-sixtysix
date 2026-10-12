import { ProcurementPanel } from "@/components/workshop/procurement-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listProcurements } from "@/lib/data/records";

export const metadata = { title: "Pengadaan barang" };

export default async function PengadaanPage() {
  const { canWrite } = await guard("/pengadaan");
  const records = await listProcurements();
  return (
    <div>
      <PageHeader
        title="Pengadaan barang"
        description="Perlengkapan di luar stok jual, seperti kertas struk dan lakban."
        href="/pengadaan"
      />
      <ProcurementPanel records={records} canWrite={canWrite} />
    </div>
  );
}
