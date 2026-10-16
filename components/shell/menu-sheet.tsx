"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { NavList } from "@/components/shell/nav-list";
import { cn } from "@/lib/cn";

export function MenuSheet({
  open,
  onClose,
  allowedHrefs,
  counts = {},
}: {
  open: boolean;
  onClose: () => void;
  allowedHrefs: string[];
  counts?: Record<string, number>;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Tutup menu"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Semua menu"
        className="glass glass-chrome absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-b-0 px-4 pt-3 pb-[max(4.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-base font-semibold">Semua menu</p>
          <button
            ref={closeRef}
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line"
            aria-label="Tutup menu"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <NavList showLabels onNavigate={onClose} allowedHrefs={allowedHrefs} counts={counts} />
      </div>
    </div>
  );
}

export function MenuButton({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-center text-[11px] font-medium",
        open ? "text-amber" : "text-muted",
      )}
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={onClick}
    >
      <Menu className="size-5" aria-hidden />
      Menu
    </button>
  );
}
