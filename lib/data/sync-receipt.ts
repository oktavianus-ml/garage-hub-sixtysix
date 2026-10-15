import { AsyncLocalStorage } from "node:async_hooks";
import type { Firestore, Transaction, WriteBatch } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";

const slot = new AsyncLocalStorage<string>();

function receiptRef(id: string) {
  return getAdminFirestore().collection("syncReceipts").doc(id);
}

export function readMutationId(formData: FormData) {
  const id = String(formData.get("_mutationId") ?? "").trim();
  if (!/^[A-Za-z0-9-]{16,80}$/.test(id)) return undefined;
  return id;
}

export function runWithMutation<T>(mutationId: string | undefined, run: () => Promise<T>) {
  if (!mutationId) return run();
  return slot.run(mutationId, run);
}

export async function alreadyApplied() {
  const id = slot.getStore();
  if (!id) return false;
  const snap = await receiptRef(id).get();
  return snap.exists;
}

export function openBatch() {
  const batch = getAdminFirestore().batch();
  const id = slot.getStore();
  if (id) batch.create(receiptRef(id), { at: new Date().toISOString() });
  return batch;
}

function isDuplicateReceipt(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("syncReceipts");
}

export async function commitBatch(batch: WriteBatch) {
  try {
    await batch.commit();
  } catch (error) {
    if (!isDuplicateReceipt(error)) throw error;
  }
}

export async function runMutation(database: Firestore, run: (tx: Transaction) => Promise<void>) {
  const id = slot.getStore();
  try {
    await database.runTransaction(async (tx) => {
      if (id) {
        const snap = await tx.get(receiptRef(id));
        if (snap.exists) return;
      }
      await run(tx);
      if (id) tx.create(receiptRef(id), { at: new Date().toISOString() });
    });
  } catch (error) {
    if (!isDuplicateReceipt(error)) throw error;
  }
}
