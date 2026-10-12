import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Produk" };

export default function ProdukPage() {
  return <ModulePage href="/produk" />;
}
