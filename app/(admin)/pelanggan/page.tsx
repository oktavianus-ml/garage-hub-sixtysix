import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Pelanggan" };

export default function PelangganPage() {
  return <ModulePage href="/pelanggan" />;
}
