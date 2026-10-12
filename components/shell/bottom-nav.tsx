"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuButton } from "@/components/shell/menu-sheet";
import { cn } from "@/lib/cn";
import { bottomNavItems, isActivePath } from "@/lib/nav";

export function BottomNav({
  menuOpen,
  onOpenMenu,
}: {
  menuOpen: boolean;
  onOpenMenu: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Menu singkat"
      className="glass glass-chrome fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {bottomNavItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium",
                  active ? "text-amber" : "text-muted",
                )}
              >
                <Icon className="size-5" aria-hidden />
                <span className="max-w-full truncate leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <MenuButton open={menuOpen} onClick={onOpenMenu} />
        </li>
      </ul>
    </nav>
  );
}
