import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Bagi hasil" };

export default function BagiHasilPage() {
  return <ModulePage href="/bagi-hasil" />;
}
