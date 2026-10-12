import { PurchaseView } from "@/components/workshop/purchase-view";

export const metadata = { title: "Permintaan" };

export default function PermintaanPage() {
  return (
    <PurchaseView
      stage="permintaan"
      title="Permintaan"
      description="Usulan barang yang akan dibeli dari distributor."
    />
  );
}
