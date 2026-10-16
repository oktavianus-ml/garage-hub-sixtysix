export const ACTIVITY_ENTITIES = [
  "pelanggan",
  "motor",
  "produk",
  "distributor",
  "pembelian",
  "pengadaan",
  "pegawai",
  "spk",
  "kasir",
  "kas",
  "pembayaran",
  "bagi-hasil",
  "audit",
  "akun",
  "tutup-bulan",
  "pengaturan",
  "akses",
] as const;

export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];
export type ActivityAction = "buat" | "ubah";

export const activityEntityLabel: Record<ActivityEntity, string> = {
  pelanggan: "Pelanggan",
  motor: "Motor",
  produk: "Produk",
  distributor: "Distributor",
  pembelian: "Pembelian",
  pengadaan: "Pengadaan barang",
  pegawai: "Pegawai",
  spk: "Service (SPK)",
  kasir: "Kasir",
  kas: "Cek uang",
  pembayaran: "Pembayaran",
  "bagi-hasil": "Bagi hasil",
  audit: "Audit budget",
  akun: "Akun (COA)",
  "tutup-bulan": "Tutup bulan",
  pengaturan: "Pengaturan",
  akses: "Akses menu",
};

export const activityActionLabel: Record<ActivityAction, string> = {
  buat: "Buat",
  ubah: "Ubah",
};

export function isActivityEntity(value: string): value is ActivityEntity {
  return ACTIVITY_ENTITIES.some((entity) => entity === value);
}
