"use client";

import { Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { findNavItem } from "@/lib/nav";

export function Topbar() {
  const pathname = usePathname();
  const current = findNavItem(pathname);

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
          <div
            className="hidden h-11 min-w-0 max-w-md flex-1 items-center gap-2 rounded-xl border border-line bg-chip px-3 text-sm text-muted xl:flex"
            aria-hidden="true"
          >
            <Search className="size-4 shrink-0" />
            <span>Cari menyusul</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <div className="hidden items-center gap-2 rounded-full border border-line bg-chip py-1 pr-3 pl-1 sm:flex">
              <span className="flex size-8 items-center justify-center rounded-full bg-amber-soft text-xs font-bold text-amber">
                P
              </span>
              <span className="text-left text-sm leading-tight">
                <span className="block text-[11px] text-muted">Contoh</span>
                <span className="font-medium">Pemilik</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
