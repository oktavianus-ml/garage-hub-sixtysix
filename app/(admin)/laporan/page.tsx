import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Laporan" };

export default function LaporanPage() {
  return <ModulePage href="/laporan" />;
}
