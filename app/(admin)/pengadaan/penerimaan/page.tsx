import { ProcurementView } from "@/components/workshop/procurement-view";

export const metadata = { title: "Penerimaan pengadaan" };

export default function PengadaanPenerimaanPage() {
  return (
    <ProcurementView
      stage="penerimaan"
      title="Penerimaan"
      description="Catat barang yang datang. Stok jual tidak bertambah."
    />
  );
}