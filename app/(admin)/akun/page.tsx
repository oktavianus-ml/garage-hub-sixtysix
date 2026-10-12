import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Akun (COA)" };

export default function AkunPage() {
  return <ModulePage href="/akun" />;
}
