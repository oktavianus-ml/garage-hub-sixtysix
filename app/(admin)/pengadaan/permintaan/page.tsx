import { ProcurementView } from "@/components/workshop/procurement-view";

export const metadata = { title: "Permintaan pengadaan" };

export default function PengadaanPermintaanPage() {
  return (
    <ProcurementView
      stage="permintaan"
      title="Permintaan"
      description="Usulan perlengkapan yang akan dibeli."
    />
  );
}
