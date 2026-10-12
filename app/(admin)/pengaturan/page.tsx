import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Pengaturan" };

export default function PengaturanPage() {
  return <ModulePage href="/pengaturan" />;
}
