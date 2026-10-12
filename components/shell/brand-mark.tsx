import { cn } from "@/lib/cn";
import { goldGlass } from "@/components/ui/controls";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", compact && "w-full justify-center")}>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-tight",
          goldGlass,
        )}
      >
        66
      </span>
      <span className={cn("min-w-0 truncate text-xl font-semibold tracking-tight", compact && "sr-only")}>
        GarageHub
      </span>
    </div>
  );
}
