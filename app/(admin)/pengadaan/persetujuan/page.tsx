import { ProcurementView } from "@/components/workshop/procurement-view";

export const metadata = { title: "Persetujuan pengadaan" };

export default function PengadaanPersetujuanPage() {
  return (
    <ProcurementView
      stage="persetujuan"
      title="Persetujuan"
      description="Pemilik menyetujui permintaan sebelum barang dipesan."
    />
  );
}
