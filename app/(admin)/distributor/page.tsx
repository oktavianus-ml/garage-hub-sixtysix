import type { Metadata } from "next";
import { ModulePage } from "@/components/ui/module-page";

export const metadata: Metadata = { title: "Distributor" };

export default function DistributorPage() {
  return <ModulePage href="/distributor" />;
}
