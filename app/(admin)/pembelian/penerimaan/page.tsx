import { PurchaseView } from "@/components/workshop/purchase-view";

export const metadata = { title: "Penerimaan" };

export default function PenerimaanPage() {
  return (
    <PurchaseView
      stage="penerimaan"
      title="Penerimaan"
      description="Catat barang yang datang supaya stok bertambah."
    />
  );
}