import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  accountKindLabel,
  isAccountKind,
  type AccountKind,
  type ChartAccount,
} from "@/lib/data/account-types";
import { fieldChanges, queueActivity, type ActivityActor } from "@/lib/data/activity";
import { alreadyApplied, commitBatch, openBatch } from "@/lib/data/sync-receipt";

export type { AccountKind, ChartAccount } from "@/lib/data/account-types";
export { ACCOUNT_KINDS, accountKindLabel, accountCodeError, isAccountKind } from "@/lib/data/account-types";

export const STARTER_ACCOUNTS: {
  code: string;
  name: string;
  kind: AccountKind;
  note: string;
}[] = [
  {
    code: "4200",
    name: "Pendapatan penjualan sparepart",
    kind: "pendapatan",
    note: "Penjualan barang di kasir dan part pada SPK.",
  },
  { code: "4900", name: "Pendapatan lain-lain", kind: "pendapatan", note: "Pemasukan di luar jasa dan barang." },
  { code: "5100", name: "Harga pokok barang", kind: "beban", note: "Harga beli barang yang terjual." },
  { code: "5500", name: "Beban operasional", kind: "beban", note: "Biaya harian bengkel." },
  { code: "5900", name: "Beban lain-lain", kind: "beban", note: "Biaya yang tidak masuk kelompok di atas." },
  { code: "3100", name: "Modal pemilik", kind: "modal", note: "Setoran awal dan tambahan modal." },
  { code: "3200", name: "Prive", kind: "modal", note: "Pengambilan uang oleh pemilik." },
];

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function priorFields(exists: boolean, fields: Record<string, string>) {
  return exists ? fields : {};
}

function statusLabel(active: boolean) {
  return active ? "Aktif" : "Nonaktif";
}

function kindText(value: unknown) {
  const kind = text(value);
  return isAccountKind(kind) ? accountKindLabel[kind] : "";
}

function mapAccount(id: string, data: FirebaseFirestore.DocumentData): ChartAccount | null {
  const kind = text(data.kind);
  if (!isAccountKind(kind)) return null;
  const code = text(data.code);
  const name = text(data.name);
  if (!code || !name) return null;
  return {
    id,
    code,
    name,
    kind,
    note: text(data.note),
    active: data.active !== false,
  };
}

export async function listChartAccounts() {
  const snap = await getAdminFirestore().collection("accounts").get();
  return snap.docs
    .flatMap((doc) => {
      const account = mapAccount(doc.id, doc.data());
      return account ? [account] : [];
    })
    .sort((a, b) => a.code.localeCompare(b.code, "id") || a.name.localeCompare(b.name, "id"));
}

export async function saveChartAccount(
  input: {
    id?: string;
    code: string;
    name: string;
    kind: AccountKind;
    note: string;
    active: boolean;
  },
  actor: ActivityActor,
) {
  const database = getAdminFirestore();
  const ref = input.id ? database.collection("accounts").doc(input.id) : database.collection("accounts").doc();
  const existing = input.id ? await ref.get() : null;
  if (input.id && !existing?.exists) throw new Error("Akun tidak ditemukan.");
  const clash = await database.collection("accounts").where("code", "==", input.code).limit(1).get();
  if (clash.docs.some((doc) => doc.id !== ref.id)) throw new Error("Kode ini sudah dipakai.");

  const previous = existing?.data();
  const before = priorFields(Boolean(existing?.exists), {
    Kode: text(previous?.code),
    Nama: text(previous?.name),
    Jenis: kindText(previous?.kind),
    Catatan: text(previous?.note),
    Status: statusLabel(previous?.active !== false),
  });
  const after = {
    Kode: input.code,
    Nama: input.name,
    Jenis: accountKindLabel[input.kind],
    Catatan: input.note,
    Status: statusLabel(input.active),
  };
  const creating = !existing?.exists;
  const batch = openBatch();
  batch.set(
    ref,
    {
      code: input.code,
      name: input.name,
      kind: input.kind,
      note: input.note,
      active: input.active,
    },
    { merge: true },
  );
  queueActivity(batch, {
    actor,
    action: creating ? "buat" : "ubah",
    entity: "akun",
    entityId: ref.id,
    label: creating ? `Akun ${input.code} ${input.name} dibuat` : `Akun ${input.code} ${input.name} diubah`,
    changes: fieldChanges(before, after),
  });
  await commitBatch(batch);
  return ref.id;
}

export async function seedChartAccounts(actor: ActivityActor) {
  if (await alreadyApplied()) return;
  const database = getAdminFirestore();
  const current = await database.collection("accounts").limit(1).get();
  if (!current.empty) throw new Error("Daftar akun sudah ada.");
  const batch = openBatch();
  for (const account of STARTER_ACCOUNTS) {
    batch.set(database.collection("accounts").doc(), {
      code: account.code,
      name: account.name,
      kind: account.kind,
      note: account.note,
      active: true,
    });
  }
  queueActivity(batch, {
    actor,
    action: "buat",
    entity: "akun",
    entityId: "awal",
    label: "Daftar akun awal dibuat",
    changes: STARTER_ACCOUNTS.map((account) => ({
      field: account.code,
      before: "",
      after: `${accountKindLabel[account.kind]} · ${account.name}`,
    })),
  });
  await commitBatch(batch);
}
