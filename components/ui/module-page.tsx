import { notFound } from "next/navigation";
import { ModulePlaceholder } from "@/components/ui/module-placeholder";
import { guard } from "@/lib/auth/guard";
import { findNavItem } from "@/lib/nav";

export async function ModulePage({ href }: { href: string }) {
  await guard(href);
  const item = findNavItem(href);
  if (!item) notFound();
  return <ModulePlaceholder title={item.label} description={item.description} href={href} />;
}
