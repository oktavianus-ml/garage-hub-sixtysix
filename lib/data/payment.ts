export type PayMethod = "tunai" | "qris" | "bank";

export const PAY_METHODS: PayMethod[] = ["tunai", "qris", "bank"];

export const payMethodLabel: Record<PayMethod, string> = {
  tunai: "Tunai",
  qris: "Rekening QRIS",
  bank: "Rekening bank",
};

export function parsePayMethod(value: unknown): PayMethod | null {
  return PAY_METHODS.includes(value as PayMethod) ? (value as PayMethod) : null;
}
