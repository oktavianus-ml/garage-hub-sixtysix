import { cn } from "@/lib/cn";

export function GlassCard({
  className,
  accent = false,
  children,
}: {
  className?: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("glass rounded-2xl", accent && "border-t-2 border-t-amber", className)}>
      {children}
    </div>
  );
}
