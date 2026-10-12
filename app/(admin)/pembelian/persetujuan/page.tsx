import { PurchaseView } from "@/components/workshop/purchase-view";

export const metadata = { title: "Persetujuan" };

export default function PersetujuanPage() {
  return (
    <PurchaseView
      stage="persetujuan"
      title="Persetujuan"
      description="Pemilik menyetujui permintaan sebelum barang dipesan."
    />
  );
}
