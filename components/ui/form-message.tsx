import type { FormState } from "@/lib/data/form-state";
import { cn } from "@/lib/cn";

export function FormMessage({ state, className }: { state: FormState; className?: string }) {
  if (!state?.message) return null;
  return <p className={cn("text-sm", state.ok ? "text-teal" : "text-danger", className)}>{state.message}</p>;
}
