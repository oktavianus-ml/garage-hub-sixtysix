import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Service (SPK)" };

export default function ServicePage() {
  return <ModulePage href="/service" />;
}
