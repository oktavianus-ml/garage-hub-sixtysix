import type { SaleReceipt } from "@/lib/data/sale-receipt";

export type FormState = { message: string; ok?: boolean; receipt?: SaleReceipt } | null;
