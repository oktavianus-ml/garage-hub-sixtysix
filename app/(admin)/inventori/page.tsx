import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Inventori" };

export default function InventoriPage() {
  return <ModulePage href="/inventori" />;
}
