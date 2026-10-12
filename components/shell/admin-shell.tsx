"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/shell/brand-mark";
import { BottomNav } from "@/components/shell/bottom-nav";
import { MenuSheet } from "@/components/shell/menu-sheet";
import { NavList } from "@/components/shell/nav-list";
import { Topbar } from "@/components/shell/topbar";
import { type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/cn";

export function AdminShell({
  children,
  user,
  allowedHrefs,
  counts = {},
}: {
  children: React.ReactNode;
  user: { name: string; role: Role };
  allowedHrefs: string[];
  counts?: Record<string, number>;
}) {
  const [railOpen, setRailOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRailOpen(false);
        setMenuOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-rail xl:flex">
        <div className="flex h-16 items-center px-4">
          <BrandMark />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <NavList showLabels allowedHrefs={allowedHrefs} counts={counts} />
        </div>
      </aside>

      {railOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 hidden bg-black/40 md:block xl:hidden"
          aria-label="Tutup menu"
          onClick={() => setRailOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-line bg-rail transition-[width] duration-200 ease-out md:flex xl:hidden",
          railOpen ? "w-[248px]" : "w-[72px]",
        )}
      >
        <div className="flex h-16 shrink-0 items-center px-3">
          <BrandMark compact={!railOpen} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          <NavList
            showLabels={railOpen}
            onNavigate={() => setRailOpen(false)}
            allowedHrefs={allowedHrefs}
            counts={counts}
          />
        </div>
        <button
          type="button"
          className="m-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-medium"
          aria-expanded={railOpen}
          onClick={() => setRailOpen((open) => !open)}
        >
          {railOpen ? (
            <ChevronLeft className="size-5" aria-hidden />
          ) : (
            <ChevronRight className="size-5" aria-hidden />
          )}
          <span className={railOpen ? "" : "sr-only"}>
            {railOpen ? "Ciutkan" : "Perluas menu"}
          </span>
        </button>
      </aside>

      <div className="md:pl-[72px] xl:pl-[248px]">
        <Topbar user={user} allowedHrefs={allowedHrefs} />
        <main className="px-4 pt-4 pb-24 md:px-6 md:pt-6 md:pb-8">{children}</main>
      </div>

      <BottomNav
        menuOpen={menuOpen}
        onOpenMenu={() => setMenuOpen(true)}
        allowedHrefs={allowedHrefs}
      />
      <MenuSheet
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        allowedHrefs={allowedHrefs}
        counts={counts}
      />
    </div>
  );
}
