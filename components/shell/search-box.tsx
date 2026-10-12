"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { searchWorkshopAction, type SearchHit } from "@/lib/data/search";

const labels = {
  pelanggan: "Pelanggan",
  motor: "Motor",
  spk: "SPK",
} as const;

export function SearchBox({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState("");

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) return;
    let cancel = false;
    const handle = window.setTimeout(() => {
      setPending(true);
      void searchWorkshopAction(trimmed)
        .then((next) => {
          if (cancel) return;
          setHits(next);
          setSearched(trimmed);
          setOpen(true);
          setPending(false);
        })
        .catch(() => {
          if (cancel) return;
          setHits([]);
          setSearched(trimmed);
          setOpen(true);
          setPending(false);
        });
    }, 250);
    return () => {
      cancel = true;
      window.clearTimeout(handle);
    };
  }, [query]);

  useEffect(() => {
    function onPointer(event: PointerEvent) {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const groups = (["pelanggan", "motor", "spk"] as const)
    .map((kind) => ({ kind, items: hits.filter((hit) => hit.kind === kind) }))
    .filter((group) => group.items.length > 0);
  const show = open && query.trim().length >= 2;

  if (!enabled) return null;

  return (
    <div ref={boxRef} className="relative hidden min-w-0 max-w-md flex-1 xl:block">
      <label className="flex h-11 w-full items-center gap-2 rounded-full border border-line bg-white/45 px-4 text-sm text-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] backdrop-blur-md transition-colors focus-within:border-amber/40 focus-within:bg-white/70 focus-within:outline-none dark:bg-white/5 dark:focus-within:bg-white/10">
        <Search className="size-4 shrink-0" aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          placeholder="Cari nama pelanggan, plat, atau nomor SPK"
          className="min-w-0 flex-1 bg-transparent text-ink placeholder:text-muted"
          style={{ outline: "none", boxShadow: "none" }}
          role="combobox"
          aria-expanded={show}
          aria-controls={listId}
          aria-autocomplete="list"
        />
      </label>
      {show ? (
        <div
          id={listId}
          role="listbox"
          className="absolute top-[calc(100%+0.5rem)] right-0 left-0 z-30 max-h-80 overflow-y-auto rounded-2xl border border-line bg-white/90 p-1.5 shadow-[0_16px_40px_rgba(28,25,21,0.08)] backdrop-blur-xl dark:bg-[#16191d]/95"
        >
          {pending && searched !== query.trim() ? (
            <p className="px-3 py-2 text-sm text-muted">Mencari...</p>
          ) : groups.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">Tidak ketemu</p>
          ) : (
            groups.map((group) => (
              <div key={group.kind} className="py-1">
                <p className="px-3 py-1 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">
                  {labels[group.kind]}
                </p>
                {group.items.map((hit) => (
                  <button
                    key={`${hit.kind}-${hit.id}`}
                    type="button"
                    role="option"
                    className="flex w-full flex-col rounded-lg px-3 py-2 text-left hover-wash"
                    onClick={() => {
                      setOpen(false);
                      setQuery("");
                      router.push(hit.href);
                    }}
                  >
                    <span className="truncate text-sm font-medium text-ink">{hit.title}</span>
                    <span className="truncate text-xs text-muted">{hit.note}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
