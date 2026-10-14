import {
  BookOpen,
  BadgeCheck,
  ClipboardList,
  ClipboardPen,
  FileSpreadsheet,
  HardHat,
  History,
  Banknote,
  LayoutDashboard,
  Package,
  PackageCheck,
  PackagePlus,
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
  hidden?: boolean;
  children?: NavItem[];
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
        hidden: true,
        description:
          "Order servis motor: pekerjaan, mekanik, part terpakai, dan ongkos jasa.",
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
        description: "Cari pelanggan dan catat motornya.",
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
        description: "Permintaan, persetujuan, dan penerimaan barang dari distributor.",
        children: [
          {
            label: "Permintaan",
            href: "/pembelian/permintaan",
            icon: ClipboardPen,
            description: "Usulan barang yang akan dibeli dari distributor.",
          },
          {
            label: "Persetujuan",
            href: "/pembelian/persetujuan",
            icon: BadgeCheck,
            description: "Pemilik menyetujui permintaan sebelum barang dipesan.",
          },
          {
            label: "Penerimaan",
            href: "/pembelian/penerimaan",
            icon: PackageCheck,
            description: "Catat barang yang datang supaya stok bertambah.",
          },
        ],
      },
      {
        label: "Pengadaan barang",
        href: "/pengadaan",
        icon: ScrollText,
        description: "Perlengkapan di luar stok jual, dari daftar barang sampai diterima.",
        children: [
          {
            label: "Barang",
            href: "/pengadaan/barang",
            icon: PackagePlus,
            description: "Daftarkan perlengkapan sekali, lalu pilih lagi saat order.",
          },
          {
            label: "Permintaan",
            href: "/pengadaan/permintaan",
            icon: ClipboardPen,
            description: "Usulan perlengkapan yang akan dibeli.",
          },
          {
            label: "Persetujuan",
            href: "/pengadaan/persetujuan",
            icon: BadgeCheck,
            description: "Pemilik menyetujui permintaan sebelum barang dipesan.",
          },
          {
            label: "Penerimaan",
            href: "/pengadaan/penerimaan",
            icon: PackageCheck,
            description: "Catat barang yang datang. Stok jual tidak bertambah.",
          },
        ],
      },
    ],
  },
  {
    label: "Keuangan",
    items: [
      {
        label: "Pembayaran",
        href: "/pembayaran/catat",
        icon: Banknote,
        description: "Catat satu per satu: pelanggan, tunai, QRIS, atau transfer, dan jumlahnya.",
      },
      {
        label: "Cek uang",
        href: "/kas",
        icon: Wallet,
        description: "Total satu hari, bukan per pelanggan. Bandingkan dengan uang yang benar-benar ada.",
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
          "Pembagian laba akhir bulan ke beberapa orang. Total persentase harus 100.",
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

export function isNavHidden(href: string) {
  return findNavItem(href)?.hidden === true;
}

export function findNavItem(href: string) {
  for (const group of navGroups) {
    for (const item of group.items) {
      if (item.href === href) return item;
      const child = item.children?.find((entry) => entry.href === href);
      if (child) return child;
    }
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
].filter((item) => !item.hidden);

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href;
}
