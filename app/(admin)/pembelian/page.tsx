import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Pembelian" };

export default function PembelianPage() {
  return <ModulePage href="/pembelian" />;
}
