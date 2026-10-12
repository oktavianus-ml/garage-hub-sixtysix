"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const dark = !mounted || resolvedTheme !== "light";

  return (
    <button
      type="button"
      className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-elevated text-ink"
      aria-label={dark ? "Ganti ke mode terang" : "Ganti ke mode gelap"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
