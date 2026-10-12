import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const tones = {
  amber: "bg-amber-soft text-amber",
  teal: "bg-teal-soft text-teal",
  danger: "bg-danger-soft text-danger",
};

export function SectionTitle({
  icon: Icon,
  children,
  tone = "amber",
}: {
  icon: LucideIcon;
  children: React.ReactNode;
  tone?: keyof typeof tones;
}) {
  return (
    <h2 className="flex items-center gap-2.5 text-base font-semibold">
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
          tones[tone],
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      {children}
    </h2>
  );
}
