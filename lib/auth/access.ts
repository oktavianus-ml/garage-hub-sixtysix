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
    "/pembelian": "read",
    "/pengadaan": "read",
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
    "/pengadaan": "write",
  },
  gudang: {
    "/": "read",
    "/produk": "write",
    "/inventori": "write",
    "/distributor": "write",
    "/pembelian": "write",
    "/pengadaan": "write",
  },
  mekanik: {
    "/": "read",
    "/service": "write",
    "/pelanggan": "read",
    "/produk": "read",
    "/inventori": "read",
  },
};

function accessKey(href: string) {
  if (href === "/pembelian" || href.startsWith("/pembelian/")) return "/pembelian";
  if (href === "/pelanggan" || href.startsWith("/pelanggan/")) return "/pelanggan";
  return href;
}

export function accessFor(role: Role, href: string): Access {
  const key = accessKey(href);
  if (role === "pemilik") return "write";
  return byRole[role][key] ?? shared[key] ?? "none";
}

export function allowedHrefs(role: Role) {
  const hrefs = [
    "/",
    "/service",
    "/kasir",
    "/pelanggan",
    "/pelanggan/daftar",
    "/pelanggan/data",
    "/pelanggan/motor",
    "/produk",
    "/inventori",
    "/distributor",
    "/pembelian",
    "/pembelian/permintaan",
    "/pembelian/persetujuan",
    "/pembelian/penerimaan",
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

export function canPlacePurchase(role: Role) {
  return role === "pemilik";
}
