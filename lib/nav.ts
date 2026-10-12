import {
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  HardHat,
  History,
  LayoutDashboard,
  Package,
  PieChart,
  Scale,
  ScrollText,
  Settings,
  ShoppingBag,
  Truck,
  Wallet,
  Users,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const navGroups: NavGroup[] = [
  {
    label: "Ringkasan",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        description: "Ringkasan barang laku dan stok hari ini.",
      },
    ],
  },
  {
    label: "Bengkel",
    items: [
      {
        label: "Service (SPK)",
        href: "/service",
        icon: Wrench,
        description:
          "Order servis motor: keluhan, mekanik, part terpakai, dan ongkos jasa.",
      },
      {
        label: "Kasir",
        href: "/kasir",
        icon: ShoppingBag,
        description: "Penjualan sparepart tanpa bongkar mesin.",
      },
      {
        label: "Pelanggan",
        href: "/pelanggan",
        icon: Users,
        description: "Data pelanggan dan motor yang dipakai tiap servis.",
      },
    ],
  },
  {
    label: "Barang",
    items: [
      {
        label: "Produk",
        href: "/produk",
        icon: Package,
        description: "Master barang, harga jual, dan harga pokok.",
      },
      {
        label: "Inventori",
        href: "/inventori",
        icon: Warehouse,
        description: "Stok yang ada dan batas aman sebelum harus order lagi.",
      },
      {
        label: "Distributor",
        href: "/distributor",
        icon: Truck,
        description: "Pemasok tempat bengkel membeli barang.",
      },
      {
        label: "Pembelian",
        href: "/pembelian",
        icon: ClipboardList,
        description:
          "Permintaan, pesanan, dan penerimaan barang dagang (PR, PO, GRN).",
      },
      {
        label: "Pengadaan",
        href: "/pengadaan",
        icon: ScrollText,
        description:
          "Perlengkapan di luar stok jual, seperti kertas struk dan lakban.",
      },
    ],
  },
  {
    label: "Keuangan",
    items: [
      {
        label: "Kas harian",
        href: "/kas",
        icon: Wallet,
        description: "Uang masuk hari ini, pengeluaran kas, dan tutup kas.",
      },
      {
        label: "Laporan",
        href: "/laporan",
        icon: FileSpreadsheet,
        description:
          "Unduh penjualan ke Excel dan PDF, difilter tanggal atau bulan.",
      },
      {
        label: "Bagi hasil",
        href: "/bagi-hasil",
        icon: PieChart,
        description:
          "Pembagian laba akhir bulan dan persentase pemilik serta investor.",
      },
      {
        label: "Audit budget",
        href: "/audit",
        icon: Scale,
        description:
          "Cek anggaran bulanan terhadap pengeluaran yang benar-benar keluar.",
      },
      {
        label: "Akun (COA)",
        href: "/akun",
        icon: BookOpen,
        description: "Daftar akun sederhana untuk pendapatan, beban, dan modal.",
      },
    ],
  },
  {
    label: "Tim",
    items: [
      {
        label: "Pegawai",
        href: "/pegawai",
        icon: HardHat,
        description: "Pegawai bengkel beserta posisinya.",
      },
    ],
  },
  {
    label: "Pengaturan",
    items: [
      {
        label: "Riwayat",
        href: "/riwayat",
        icon: History,
        description: "Jejak siapa yang mengubah data bengkel, dan apa yang berubah.",
      },
      {
        label: "Pengaturan",
        href: "/pengaturan",
        icon: Settings,
        description: "Profil bengkel, mode tampilan, dan tempat pengaturan struk.",
      },
    ],
  },
];

export function findNavItem(href: string) {
  for (const group of navGroups) {
    const item = group.items.find((entry) => entry.href === href);
    if (item) return item;
  }
  return undefined;
}

function requireNavItem(href: string) {
  const item = findNavItem(href);
  if (!item) {
    throw new Error(`Menu tidak ditemukan: ${href}`);
  }
  return item;
}

export const bottomNavItems: NavItem[] = [
  requireNavItem("/"),
  requireNavItem("/service"),
  { ...requireNavItem("/inventori"), label: "Stok" },
  requireNavItem("/kasir"),
];

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href;
}
