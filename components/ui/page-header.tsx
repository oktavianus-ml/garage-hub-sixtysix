import type { LucideIcon } from "lucide-react";
import { findNavItem } from "@/lib/nav";

export function PageHeader({
  title,
  description,
  example = false,
  href,
  icon,
}: {
  title: string;
  description: string;
  example?: boolean;
  href?: string;
  icon?: LucideIcon;
}) {
  const Icon = icon ?? (href ? findNavItem(href)?.icon : undefined);
  return (
    <header className="flex items-start gap-3">
      {Icon ? (
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {example ? (
            <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">
              Contoh
            </span>
          ) : null}
          <p className="text-sm text-muted">{description}</p>
        </div>
        <span className="mt-2 block h-0.5 w-10 rounded-full bg-amber" aria-hidden />
      </div>
    </header>
  );
}
