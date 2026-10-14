export const ACCOUNT_KINDS = ["pendapatan", "beban", "modal"] as const;

export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export const accountKindLabel: Record<AccountKind, string> = {
  pendapatan: "Pendapatan",
  beban: "Beban",
  modal: "Modal",
};

export const LEDGER_CODES = {
  partsIncome: "4200",
  cogs: "5100",
  operations: "5500",
} as const;

export type ChartAccount = {
  id: string;
  code: string;
  name: string;
  kind: AccountKind;
  note: string;
  active: boolean;
};

const CODE = /^\d{3,6}$/;

export function isAccountKind(value: string): value is AccountKind {
  return ACCOUNT_KINDS.includes(value as AccountKind);
}

export function accountCodeError(code: string) {
  return CODE.test(code) ? "" : "Kode akun 3 sampai 6 angka, misalnya 4200.";
}
