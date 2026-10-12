export type PurchaseStatus = "diminta" | "dipesan" | "sebagian" | "diterima" | "batal";
export type PurchaseStage = "permintaan" | "persetujuan" | "penerimaan";

export const PURCHASE_STATUSES: PurchaseStatus[] = ["diminta", "dipesan", "sebagian", "diterima", "batal"];

export const purchaseStatusLabel: Record<PurchaseStatus, string> = {
  diminta: "Permintaan",
  dipesan: "Dipesan",
  sebagian: "Sebagian datang",
  diterima: "Diterima",
  batal: "Batal",
};
