import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Pegawai" };

export default function PegawaiPage() {
  return <ModulePage href="/pegawai" />;
}
