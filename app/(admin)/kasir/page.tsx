import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Kasir" };

export default function KasirPage() {
  return <ModulePage href="/kasir" />;
}
