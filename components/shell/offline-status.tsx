"use client";

import { createContext, useActionState, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { replayQueuedAction } from "@/lib/data/actions";
import type { FormState } from "@/lib/data/form-state";
import {
  clearQueue,
  listQueue,
  putQueueItem,
  removeQueueItem,
  type QueueItem,
} from "@/lib/offline/queue";
import { cn } from "@/lib/cn";

export const QUEUED_MESSAGE = "Tersimpan di perangkat. Akan masuk otomatis saat internet kembali.";

type OfflineContextValue = {
  uid: string;
  online: boolean;
  syncing: boolean;
  items: QueueItem[];
  isOnline: () => boolean;
  enqueue: (item: QueueItem) => Promise<void>;
  retry: (id: string) => Promise<void>;
  discard: (id: string) => Promise<void>;
  clearMine: () => Promise<void>;
};

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function useOffline() {
  const value = useContext(OfflineContext);
  if (!value) throw new Error("Status koneksi belum siap.");
  return value;
}

function isNextRedirect(error: unknown) {
  if (typeof error !== "object" || error === null || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
}

function isNetworkError(error: unknown) {
  if (isNextRedirect(error)) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (error instanceof TypeError) return true;
  const message = error instanceof Error ? error.message : "";
  return /failed to fetch|networkerror|load failed|fetch failed|aborted/i.test(message);
}

async function probe() {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  try {
    const response = await fetch("/api/ping", {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

let flushing = false;
const queueListeners = new Set<(uid: string) => void>();

function notifyQueue(uid: string) {
  for (const listener of queueListeners) listener(uid);
}

function snapshot(formData: FormData) {
  const fields: [string, string][] = [];
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") fields.push([key, value]);
  }
  return fields;
}

export function OfflineProvider({ uid, children }: { uid: string; children: React.ReactNode }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [items, setItems] = useState<QueueItem[]>([]);
  const onlineRef = useRef(true);
  const uidRef = useRef(uid);
  uidRef.current = uid;

  const refreshItems = useCallback(async () => {
    const next = await listQueue(uidRef.current);
    setItems(next);
    notifyQueue(uidRef.current);
    return next;
  }, []);

  useEffect(() => {
    const listener = (changedUid: string) => {
      if (changedUid !== uidRef.current) return;
      void listQueue(changedUid).then(setItems);
    };
    queueListeners.add(listener);
    void listQueue(uid).then(setItems);
    return () => {
      queueListeners.delete(listener);
    };
  }, [uid]);

  useEffect(() => {
    let gone = false;
    async function check() {
      const reachable = await probe();
      if (gone) return;
      onlineRef.current = reachable;
      setOnline(reachable);
    }
    function onOffline() {
      onlineRef.current = false;
      setOnline(false);
    }
    function onOnline() {
      void check();
    }
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const id = window.setInterval(() => void check(), 15000);
    void check();
    return () => {
      gone = true;
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!online || flushing) return;
    const pending = items.filter((item) => item.status === "pending");
    if (pending.length === 0) return;
    flushing = true;
    setSyncing(true);
    void (async () => {
      let sent = false;
      try {
        for (const item of pending) {
          if (!onlineRef.current) break;
          try {
            const result = await replayQueuedAction(item.action, item.fields, item.id);
            if (result?.ok) {
              await removeQueueItem(item.id);
              sent = true;
            } else {
              await putQueueItem({
                ...item,
                status: "failed",
                error: result?.message || "Gagal menyimpan.",
              });
            }
          } catch (error) {
            if (isNetworkError(error)) {
              onlineRef.current = false;
              setOnline(false);
              break;
            }
            await putQueueItem({ ...item, status: "failed", error: "Gagal menyimpan." });
          }
        }
      } finally {
        flushing = false;
        await refreshItems();
        setSyncing(false);
        if (sent) router.refresh();
      }
    })();
  }, [items, online, refreshItems, router]);

  const enqueue = useCallback(
    async (item: QueueItem) => {
      await putQueueItem(item);
      await refreshItems();
    },
    [refreshItems],
  );

  const retry = useCallback(
    async (id: string) => {
      const current = (await listQueue(uidRef.current)).find((item) => item.id === id);
      if (!current) return;
      await putQueueItem({ ...current, status: "pending", error: undefined });
      await refreshItems();
    },
    [refreshItems],
  );

  const discard = useCallback(
    async (id: string) => {
      await removeQueueItem(id);
      await refreshItems();
    },
    [refreshItems],
  );

  const clearMine = useCallback(async () => {
    await clearQueue(uidRef.current);
    setItems([]);
  }, []);

  const isOnline = useCallback(() => onlineRef.current, []);

  return (
    <OfflineContext.Provider value={{ uid, online, syncing, items, isOnline, enqueue, retry, discard, clearMine }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useQueuedAction(
  action: (prev: FormState, formData: FormData) => Promise<FormState>,
  actionName: string,
) {
  const offline = useOffline();
  return useActionState(async (prev: FormState, formData: FormData): Promise<FormState> => {
    const mutationId = crypto.randomUUID();
    formData.set("_mutationId", mutationId);
    const item: QueueItem = {
      id: mutationId,
      uid: offline.uid,
      action: actionName,
      fields: snapshot(formData),
      createdAt: Date.now(),
      status: "pending",
    };
    async function keepLocal() {
      try {
        await offline.enqueue(item);
      } catch {
        return { message: "Gagal menyimpan di perangkat ini." } satisfies FormState;
      }
      return { ok: true, message: QUEUED_MESSAGE } satisfies FormState;
    }
    if (!offline.isOnline()) return keepLocal();
    try {
      return await action(prev, formData);
    } catch (error) {
      if (isNextRedirect(error)) throw error;
      if (!isNetworkError(error)) throw error;
      return keepLocal();
    }
  }, null);
}

export function ConnectionChip() {
  const { online, items } = useOffline();
  const waiting = items.length;
  return (
    <span
      role="status"
      className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line bg-chip px-2.5 text-xs font-medium whitespace-nowrap"
    >
      <span className={cn("size-1.5 rounded-full", online ? "bg-teal" : "bg-amber")} aria-hidden />
      {online ? "Online" : "Offline"}
      {waiting > 0 ? <span className="text-muted">· {waiting}</span> : null}
    </span>
  );
}

export function ConnectionBanner() {
  const { online, syncing, items, retry, discard } = useOffline();
  const pending = items.filter((item) => item.status === "pending").length;
  const failed = items.filter((item) => item.status === "failed");
  if (online && !syncing && pending === 0 && failed.length === 0) return null;

  return (
    <div
      role="status"
      className={cn(
        "border-b px-4 py-2 text-sm md:px-6",
        !online ? "border-amber/40 bg-amber-soft" : failed.length > 0 ? "border-danger/30 bg-danger-soft" : "border-line bg-elevated",
      )}
    >
      {!online ? (
        <p>Tidak ada internet. Data yang disimpan masuk antrean di perangkat ini. Jangan muat ulang halaman selama offline.</p>
      ) : syncing ? (
        <p>Mengirim data...</p>
      ) : pending > 0 ? (
        <p>{pending} data menunggu dikirim.</p>
      ) : null}
      {failed.map((item) => (
        <div key={item.id} className="mt-2 flex flex-wrap items-center gap-2">
          <p className="min-w-0 text-danger">{item.error || "Gagal menyimpan."}</p>
          <button
            type="button"
            className="rounded-lg border border-line bg-elevated px-2.5 py-1 text-xs font-semibold"
            onClick={() => void retry(item.id)}
          >
            Coba lagi
          </button>
          <button
            type="button"
            className="rounded-lg border border-line bg-elevated px-2.5 py-1 text-xs font-semibold"
            onClick={() => void discard(item.id)}
          >
            Buang
          </button>
        </div>
      ))}
    </div>
  );
}
