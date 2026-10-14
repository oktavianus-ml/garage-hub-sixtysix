import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { findNavItem } from "@/lib/nav";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  example = false,
  href,
  icon,
  action,
}: {
  title: string;
  description: string;
  example?: boolean;
  href?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) {
  const Icon = icon ?? (href ? findNavItem(href)?.icon : undefined);
  return (
    <header className={cn("flex gap-3", action ? "items-center" : "items-start")}>
      {Icon ? (
        <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-amber">
          <Icon className="size-5" aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className={cn("flex flex-wrap gap-y-2", action ? "items-center gap-x-4" : "items-baseline gap-x-3")}>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {example ? (
            <span className="rounded-full bg-amber-soft px-2.5 py-1 text-xs font-semibold text-amber">
              Contoh
            </span>
          ) : null}
          <p className="text-sm text-muted">{description}</p>
          {action}
        </div>
        <span className="mt-2 block h-0.5 w-10 rounded-full bg-amber" aria-hidden />
      </div>
    </header>
  );
}
