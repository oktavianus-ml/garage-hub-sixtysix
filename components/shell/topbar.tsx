"use client";

import { usePathname } from "next/navigation";
import { LogoutButton } from "@/components/shell/logout-button";
import { SearchBox } from "@/components/shell/search-box";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { roleLabel, type Role } from "@/lib/auth/roles";
import { findNavItem } from "@/lib/nav";

export function Topbar({
  user,
  allowedHrefs,
}: {
  user: { name: string; role: Role };
  allowedHrefs: string[];
}) {
  const pathname = usePathname();
  const current = findNavItem(pathname);
  const initial = user.name.trim().charAt(0).toUpperCase() || "G";
  const canSearch = allowedHrefs.includes("/pelanggan") || allowedHrefs.includes("/service");

  return (
    <header className="sticky top-0 z-20">
      <div className="glass glass-chrome rounded-none border-x-0 border-t-0">
        <div className="flex h-14 items-center gap-3 px-4 md:h-16 md:px-6">
          <p className="min-w-0 truncate text-sm font-semibold md:hidden">
            GarageHub
          </p>
          <p className="hidden min-w-0 truncate text-sm font-semibold md:block xl:hidden">
            {current?.label ?? "GarageHub"}
          </p>
          <SearchBox enabled={canSearch} />
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-line bg-chip py-1 pr-3 pl-1 sm:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-amber-soft text-xs font-bold text-amber">
                {initial}
              </span>
              <span className="text-left text-sm leading-tight">
                <span className="block max-w-32 truncate text-[11px] text-muted">
                  {user.name}
                </span>
                <span className="font-medium">{roleLabel[user.role]}</span>
              </span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </div>
    </header>
  );
}
