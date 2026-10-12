import { cn } from "@/lib/cn";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "w-full justify-center")}>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber text-sm font-bold tracking-tight text-[#1c1915]">
        66
      </span>
      <span className={cn("min-w-0", compact && "sr-only")}>
        <span className="block truncate text-sm font-semibold leading-tight">
          GarageHub
        </span>
        <span className="block truncate text-xs text-muted">Pit Amber</span>
      </span>
    </div>
  );
}
