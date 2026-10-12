import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";
import { findNavItem } from "@/lib/nav";

export function ModulePage({ href }: { href: string }) {
  const item = findNavItem(href);
  if (!item) notFound();
  return <ModulePlaceholder title={item.label} description={item.description} />;
}
