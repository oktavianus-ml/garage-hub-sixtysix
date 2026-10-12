export const ROLES = [
  "pemilik",
  "investor",
  "kasir",
  "gudang",
  "mekanik",
] as const;

export type Role = (typeof ROLES)[number];

export const roleLabel: Record<Role, string> = {
  pemilik: "Pemilik",
  investor: "Investor",
  kasir: "Kasir",
  gudang: "Gudang",
  mekanik: "Mekanik",
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && ROLES.includes(value as Role);
}
