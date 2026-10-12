import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Audit budget" };

export default function AuditPage() {
  return <ModulePage href="/audit" />;
}
