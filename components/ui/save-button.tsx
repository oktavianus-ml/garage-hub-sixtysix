import { LoaderCircle } from "lucide-react";
import { buttonClass } from "@/components/ui/controls";
import { cn } from "@/lib/cn";

export function SaveButton({
  pending,
  disabled,
  children,
  pendingLabel = "Menyimpan...",
  className,
  name,
  value,
}: {
  pending: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
}) {
  return (
    <button
      type="submit"
      name={name}
      value={value}
      className={cn(buttonClass, "inline-flex items-center justify-center gap-2", className)}
      disabled={disabled || pending}
      aria-busy={pending}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
