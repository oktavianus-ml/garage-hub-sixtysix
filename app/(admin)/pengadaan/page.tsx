import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Pengadaan" };

export default function PengadaanPage() {
  return <ModulePage href="/pengadaan" />;
}
