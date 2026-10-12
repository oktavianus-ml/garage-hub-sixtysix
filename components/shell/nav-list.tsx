"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isActivePath, navGroups } from "@/lib/nav";

export function NavList({
  showLabels,
  onNavigate,
}: {
  showLabels: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-5">
      {navGroups.map((group) => (
        <div key={group.label}>
          <p
            className={cn(
              "mb-1 px-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase",
              !showLabels && "sr-only",
            )}
          >
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl text-sm font-medium transition-colors",
                      showLabels ? "px-3" : "justify-center px-0",
                      active ? "bg-amber-soft text-amber" : "text-ink hover-wash",
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    <span className={cn("truncate", !showLabels && "sr-only")}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
