"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MenuButton } from "@/components/shell/menu-sheet";
import { cn } from "@/lib/cn";
import { findNavItem, isActivePath } from "@/lib/nav";

const preferred = ["/", "/service", "/kasir", "/inventori", "/produk", "/pembayaran/catat", "/bagi-hasil"];

export function BottomNav({
  menuOpen,
  onOpenMenu,
  allowedHrefs,
}: {
  menuOpen: boolean;
  onOpenMenu: () => void;
  allowedHrefs: string[];
}) {
  const pathname = usePathname();
  const allowed = new Set(allowedHrefs);
  const items = preferred
    .filter((href) => allowed.has(href))
    .slice(0, 4)
    .map((href) => {
      const item = findNavItem(href);
      if (!item) return null;
      if (href === "/inventori") return { ...item, label: "Stok" };
      if (href === "/service") return { ...item, label: "Service" };
      return item;
    })
    .filter((item) => item !== null);

  return (
    <nav
      aria-label="Menu singkat"
      className="glass glass-chrome fixed inset-x-0 bottom-0 z-30 rounded-none border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex w-full">
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="min-w-0 flex-1 basis-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] font-medium",
                  active ? "text-amber" : "text-muted",
                )}
              >
                <Icon className="size-5 shrink-0" aria-hidden />
                <span className="w-full truncate leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
        <li className="min-w-0 flex-1 basis-0">
          <MenuButton open={menuOpen} onClick={onOpenMenu} />
        </li>
      </ul>
    </nav>
  );
}
