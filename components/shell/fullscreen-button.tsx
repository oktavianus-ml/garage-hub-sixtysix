"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  return () => document.removeEventListener("fullscreenchange", onStoreChange);
}

function fullscreenActive() {
  return document.fullscreenElement != null;
}

export function FullscreenButton() {
  const active = useSyncExternalStore(subscribe, fullscreenActive, () => false);

  async function toggle() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await document.documentElement.requestFullscreen();
    } catch {
      // Browser menolak tanpa gestur pengguna, atau kebijakan situs memblokirnya.
    }
  }

  return (
    <button
      type="button"
      className="soft-poly inline-flex size-11 items-center justify-center rounded-xl border border-line text-ink"
      aria-label={active ? "Keluar dari layar penuh" : "Layar penuh"}
      aria-pressed={active}
      onClick={toggle}
    >
      {active ? (
        <Minimize2 className="size-5" />
      ) : (
        <Maximize2 className="size-5" />
      )}
    </button>
  );
}
