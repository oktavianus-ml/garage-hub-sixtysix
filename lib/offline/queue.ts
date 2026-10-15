export type QueueItem = {
  id: string;
  uid: string;
  action: string;
  fields: [string, string][];
  createdAt: number;
  status: "pending" | "failed";
  error?: string;
};

const DB_NAME = "garage-hub-offline";
const STORE = "queue";

function requestDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Antrean perangkat gagal dibuka."));
  });
}

async function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>) {
  const db = await requestDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = run(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Antrean perangkat gagal."));
    });
  } finally {
    db.close();
  }
}

export async function listQueue(uid: string) {
  const all = await withStore("readonly", (store) => store.getAll() as IDBRequest<QueueItem[]>);
  return all
    .filter((item) => item.uid === uid)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function putQueueItem(item: QueueItem) {
  await withStore("readwrite", (store) => store.put(item));
}

export async function removeQueueItem(id: string) {
  await withStore("readwrite", (store) => store.delete(id));
}

export async function clearQueue(uid: string) {
  const mine = await listQueue(uid);
  if (mine.length === 0) return;
  const db = await requestDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      for (const item of mine) store.delete(item.id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Antrean perangkat gagal dihapus."));
    });
  } finally {
    db.close();
  }
}
