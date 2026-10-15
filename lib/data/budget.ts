import { getAdminFirestore } from "@/lib/firebase/admin";
import { commitBatch, openBatch } from "@/lib/data/sync-receipt";
import { fieldChanges, queueActivity, type ActivityActor } from "@/lib/data/activity";
import type { BudgetAmounts, BudgetAudit, BudgetKey, BudgetOutflow } from "@/lib/data/budget-types";
import { jakartaDate, monthKeyOf, rupiah } from "@/lib/data/format";
import { listProcurements, listPurchases } from "@/lib/data/records";
import { formatDay, formatMonth } from "@/lib/data/sales-report";

export const BUDGET_KEYS = ["pembelian", "pengadaan", "kas"] as const satisfies readonly BudgetKey[];

const BUDGET_META: Record<BudgetKey, { label: string; hint: string }> = {
  pembelian: {
    label: "Pembelian barang",
    hint: "Barang stok yang sudah diterima bulan ini.",
  },
  pengadaan: {
    label: "Pengadaan perlengkapan",
    hint: "Perlengkapan yang sudah diterima bulan ini.",
  },
  kas: {
    label: "Pengeluaran kas",
    hint: "Uang yang keluar dari laci bulan ini.",
  },
};

const MONEY_CAP = 1_000_000_000;

function emptyAmounts(): BudgetAmounts {
  return { pembelian: 0, pengadaan: 0, kas: 0 };
}

function num(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function readAmounts(data: FirebaseFirestore.DocumentData | undefined): BudgetAmounts {
  return {
    pembelian: Math.max(0, num(data?.pembelian)),
    pengadaan: Math.max(0, num(data?.pengadaan)),
    kas: Math.max(0, num(data?.kas)),
  };
}

function previousMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function eventDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return jakartaDate(date);
}

function planFields(plan: BudgetAmounts, note: string) {
  return {
    "Pembelian barang": rupiah(plan.pembelian),
    "Pengadaan perlengkapan": rupiah(plan.pengadaan),
    "Pengeluaran kas": rupiah(plan.kas),
    Catatan: note,
  };
}

export function parseMonth(value: string | undefined) {
  if (value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return value;
  return monthKeyOf(jakartaDate());
}

export async function loadBudgetAudit(month: string): Promise<BudgetAudit> {
  const database = getAdminFirestore();
  const prior = previousMonth(month);
  const [purchases, procurements, cashSnap, budgetSnap, closeSnap, previousSnap] = await Promise.all([
    listPurchases(),
    listProcurements(),
    database.collection("cashDays").where("monthKey", "==", month).get(),
    database.doc(`budgets/${month}`).get(),
    database.doc(`monthCloses/${month}`).get(),
    database.doc(`budgets/${prior}`).get(),
  ]);

  const actual = emptyAmounts();
  const outflows: BudgetOutflow[] = [];

  for (const purchase of purchases) {
    const costs = new Map(purchase.lines.map((line) => [line.productId, line.cost]));
    purchase.receipts.forEach((receipt, index) => {
      const day = eventDay(receipt.at);
      if (monthKeyOf(day) !== month) return;
      let amount = 0;
      const parts: string[] = [];
      for (const line of receipt.lines) {
        if (line.qty <= 0) continue;
        amount += line.qty * (costs.get(line.productId) ?? 0);
        parts.push(`${line.name} ×${line.qty}`);
      }
      if (amount <= 0) return;
      actual.pembelian += amount;
      outflows.push({
        id: `pembelian-${purchase.id}-${index}`,
        at: day,
        when: formatDay(day),
        label: BUDGET_META.pembelian.label,
        title: `${purchase.no} · ${purchase.distributorName}`,
        detail: parts.join(", "),
        amount,
        href: "/pembelian/penerimaan",
      });
    });
  }

  for (const record of procurements) {
    const costs = new Map(record.lines.map((line) => [line.itemId, line.cost]));
    record.receipts.forEach((receipt, index) => {
      const day = eventDay(receipt.at);
      if (!day || monthKeyOf(day) !== month) return;
      let amount = 0;
      const parts: string[] = [];
      for (const line of receipt.lines) {
        if (line.qty <= 0) continue;
        amount += line.qty * (costs.get(line.itemId) ?? 0);
        parts.push(`${line.name} ×${line.qty}`);
      }
      if (amount <= 0) return;
      actual.pengadaan += amount;
      outflows.push({
        id: `pengadaan-${record.id}-${index}`,
        at: day,
        when: formatDay(day),
        label: BUDGET_META.pengadaan.label,
        title: record.vendor ? `${record.no} · ${record.vendor}` : record.no,
        detail: parts.join(", "),
        amount,
        href: "/pengadaan/penerimaan",
      });
    });
  }

  for (const doc of cashSnap.docs) {
    const cashOut = num(doc.data().cashOut);
    if (cashOut <= 0) continue;
    const note = typeof doc.data().note === "string" ? doc.data().note.trim() : "";
    actual.kas += cashOut;
    outflows.push({
      id: `kas-${doc.id}`,
      at: doc.id,
      when: formatDay(doc.id),
      label: BUDGET_META.kas.label,
      title: "Dari laci",
      detail: note,
      amount: cashOut,
      href: `/kas?hari=${doc.id}`,
    });
  }

  outflows.sort((a, b) => b.at.localeCompare(a.at) || a.title.localeCompare(b.title, "id"));

  const saved = budgetSnap.exists;
  const plan = saved ? readAmounts(budgetSnap.data()) : emptyAmounts();
  const previous = previousSnap.exists ? readAmounts(previousSnap.data()) : emptyAmounts();
  const note = saved && typeof budgetSnap.data()?.note === "string" ? budgetSnap.data()?.note.trim() : "";
  const lines = BUDGET_KEYS.map((key) => ({
    key,
    label: BUDGET_META[key].label,
    hint: BUDGET_META[key].hint,
    plan: plan[key],
    actual: actual[key],
    previous: previous[key],
  }));

  return {
    month,
    monthLabel: formatMonth(month),
    closed: closeSnap.exists && closeSnap.data()?.status === "closed",
    saved,
    note,
    lines,
    planTotal: lines.reduce((sum, line) => sum + line.plan, 0),
    actualTotal: lines.reduce((sum, line) => sum + line.actual, 0),
    outflows,
  };
}

export async function saveBudget(
  input: { month: string; plan: BudgetAmounts; note: string },
  actor: ActivityActor,
) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month)) throw new Error("Pilih bulan.");
  for (const key of BUDGET_KEYS) {
    const amount = input.plan[key];
    if (!Number.isInteger(amount) || amount < 0 || amount > MONEY_CAP) {
      throw new Error("Anggaran tidak valid.");
    }
  }
  const note = input.note.trim();
  if (note.length > 200) throw new Error("Catatan terlalu panjang.");

  const ref = getAdminFirestore().doc(`budgets/${input.month}`);
  const existing = await ref.get();
  const previousNote = typeof existing.data()?.note === "string" ? existing.data()?.note.trim() : "";
  const before = existing.exists ? planFields(readAmounts(existing.data()), previousNote) : {};
  const after = planFields(input.plan, note);
  const batch = openBatch();
  batch.set(ref, {
    pembelian: input.plan.pembelian,
    pengadaan: input.plan.pengadaan,
    kas: input.plan.kas,
    note,
    updatedAt: new Date().toISOString(),
  });
  queueActivity(batch, {
    actor,
    action: existing.exists ? "ubah" : "buat",
    entity: "audit",
    entityId: input.month,
    label: existing.exists
      ? `Anggaran ${formatMonth(input.month)} diubah`
      : `Anggaran ${formatMonth(input.month)} disimpan`,
    changes: fieldChanges(before, after),
  });
  await commitBatch(batch);
}
