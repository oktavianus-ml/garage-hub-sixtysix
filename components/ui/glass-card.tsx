import { cn } from "@/lib/cn";

export function GlassCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn("glass rounded-2xl", className)}>{children}</div>;
}
