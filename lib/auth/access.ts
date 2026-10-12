import type { Role } from "@/lib/auth/roles";

export type Access = "none" | "read" | "write";

const shared: Record<string, Access> = {
  "/": "read",
  "/service": "none",
  "/kasir": "none",
  "/pelanggan": "none",
  "/produk": "none",
  "/inventori": "none",
  "/kas": "none",
  "/bagi-hasil": "none",
};

const byRole: Record<Role, Record<string, Access>> = {
  pemilik: {},
  investor: {
    "/": "read",
    "/service": "read",
    "/kasir": "read",
    "/pelanggan": "read",
    "/produk": "read",
    "/inventori": "read",
    "/distributor": "read",
    "/kas": "read",
    "/bagi-hasil": "read",
  },
  kasir: {
    "/": "read",
    "/service": "write",
    "/kasir": "write",
    "/pelanggan": "write",
    "/produk": "read",
    "/inventori": "read",
    "/kas": "write",
  },
  gudang: {
    "/": "read",
    "/produk": "write",
    "/inventori": "write",
    "/distributor": "write",
  },
  mekanik: {
    "/": "read",
    "/service": "write",
    "/pelanggan": "read",
    "/produk": "read",
    "/inventori": "read",
  },
};

export function accessFor(role: Role, href: string): Access {
  if (role === "pemilik") return "write";
  return byRole[role][href] ?? shared[href] ?? "none";
}

export function allowedHrefs(role: Role) {
  const hrefs = [
    "/",
    "/service",
    "/kasir",
    "/pelanggan",
    "/produk",
    "/inventori",
    "/distributor",
    "/pembelian",
    "/pengadaan",
    "/kas",
    "/laporan",
    "/bagi-hasil",
    "/audit",
    "/akun",
    "/pegawai",
    "/riwayat",
    "/pengaturan",
  ];
  return hrefs.filter((href) => accessFor(role, href) !== "none");
}

export function canMarkPaid(role: Role) {
  return role === "pemilik" || role === "kasir";
}
