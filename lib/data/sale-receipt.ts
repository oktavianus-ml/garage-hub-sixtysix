import type { PayMethod } from "@/lib/data/payment";

export type SaleReceipt = {
  no: string;
  businessDate: string;
  lines: { name: string; qty: number; price: number }[];
  total: number;
  payMethod: PayMethod;
};
