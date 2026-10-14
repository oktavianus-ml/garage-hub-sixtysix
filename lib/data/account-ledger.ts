import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  ACCOUNT_KINDS,
  LEDGER_CODES,
  type AccountKind,
  type ChartAccount,
} from "@/lib/data/account-types";
import { listChartAccounts } from "@/lib/data/accounts";
import { allocateShares, partnersFromRecord, type ProfitShare } from "@/lib/data/profit-split";
import { formatDay, formatMonth } from "@/lib/data/sales-report";

export type AccountLedgerLine = {
  id: string;
  date: string;
  when: string;
  title: string;
  detail: string;
  amount: number;
  href: string;
};

export type AccountLedgerRow = {
  id: string;
  code: string;
  name: string;
  kind: AccountKind;
  note: string;
  active: boolean;
  posted: boolean;
  total: number;
  lines: AccountLedgerLine[];
};

export type AccountLedger = {
  month: string;
  monthLabel: string;
  rows: AccountLedgerRow[];
  income: number;
  expense: number;
  gap: number;
  shares: ProfitShare[];
};

const POSTED = new Set<string>(Object.values(LEDGER_CODES));

const FALLBACK: Record<string, { name: string; kind: AccountKind }> = {
  [LEDGER_CODES.partsIncome]: { name: "Pendapatan penjualan sparepart", kind: "pendapatan" },
  [LEDGER_CODES.cogs]: { name: "Harga pokok barang", kind: "beban" },
  [LEDGER_CODES.operations]: { name: "Beban operasional", kind: "beban" },
};

function num(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function partDetail(value: unknown) {
  if (!Array.isArray(value)) return "";
  return value
    .flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const row = item as Record<string, unknown>;
      const name = text(row.name);
      const qty = num(row.qty);
      if (!name || qty <= 0) return [];
      return [`${name} ×${qty}`];
    })
    .join(", ");
}

function pushLine(bucket: Map<string, AccountLedgerLine[]>, code: string, line: AccountLedgerLine) {
  const lines = bucket.get(code) ?? [];
  lines.push(line);
  bucket.set(code, lines);
}

function sortLines(lines: AccountLedgerLine[]) {
  return lines.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, "id"));
}

function rowFromAccount(account: ChartAccount, lines: AccountLedgerLine[]): AccountLedgerRow {
  return {
    id: account.id,
    code: account.code,
    name: account.name,
    kind: account.kind,
    note: account.note,
    active: account.active,
    posted: POSTED.has(account.code),
    total: lines.reduce((sum, line) => sum + line.amount, 0),
    lines: sortLines(lines),
  };
}

export async function loadAccountLedger(month: string): Promise<AccountLedger> {
  const database = getAdminFirestore();
  const [accounts, salesSnap, ordersSnap, cashSnap, splitSnap] = await Promise.all([
    listChartAccounts(),
    database.collection("walkInSales").where("monthKey", "==", month).get(),
    database.collection("serviceOrders").where("monthKey", "==", month).get(),
    database.collection("cashDays").where("monthKey", "==", month).get(),
    database.doc("settings/profitSplit").get(),
  ]);

  const lines = new Map<string, AccountLedgerLine[]>();

  for (const doc of salesSnap.docs) {
    const data = doc.data();
    const date = text(data.businessDate);
    const title = text(data.no, "Kasir");
    const detail = partDetail(data.lines);
    const total = num(data.total);
    const cost = num(data.costTotal);
    if (total > 0) {
      pushLine(lines, LEDGER_CODES.partsIncome, {
        id: `ksr-${doc.id}-jual`,
        date,
        when: formatDay(date),
        title,
        detail,
        amount: total,
        href: "/kasir",
      });
    }
    if (cost > 0) {
      pushLine(lines, LEDGER_CODES.cogs, {
        id: `ksr-${doc.id}-pokok`,
        date,
        when: formatDay(date),
        title,
        detail,
        amount: cost,
        href: "/kasir",
      });
    }
  }

  for (const doc of ordersSnap.docs) {
    const data = doc.data();
    if (data.status !== "lunas") continue;
    const date = text(data.paidDate);
    const title = text(data.no, "SPK");
    const detail = [text(data.customerName), text(data.plate)].filter(Boolean).join(" · ");
    const parts = partDetail(data.parts);
    const sell = num(data.partsSell);
    const cost = num(data.partsCost);
    if (sell > 0) {
      pushLine(lines, LEDGER_CODES.partsIncome, {
        id: `spk-${doc.id}-jual`,
        date,
        when: formatDay(date),
        title,
        detail: [detail, parts].filter(Boolean).join(" · "),
        amount: sell,
        href: "/service",
      });
    }
    if (cost > 0) {
      pushLine(lines, LEDGER_CODES.cogs, {
        id: `spk-${doc.id}-pokok`,
        date,
        when: formatDay(date),
        title,
        detail: [detail, parts].filter(Boolean).join(" · "),
        amount: cost,
        href: "/service",
      });
    }
  }

  for (const doc of cashSnap.docs) {
    const amount = num(doc.data().cashOut);
    if (amount <= 0) continue;
    const note = text(doc.data().note);
    pushLine(lines, LEDGER_CODES.operations, {
      id: `kas-${doc.id}`,
      date: doc.id,
      when: formatDay(doc.id),
      title: "Dari laci",
      detail: note,
      amount,
      href: `/kas?hari=${doc.id}`,
    });
  }

  const seen = new Set<string>();
  const rows: AccountLedgerRow[] = [];
  for (const account of accounts) {
    if (!account.active && !POSTED.has(account.code)) continue;
    if (seen.has(account.code)) continue;
    seen.add(account.code);
    rows.push(rowFromAccount(account, lines.get(account.code) ?? []));
  }
  for (const code of POSTED) {
    if (seen.has(code)) continue;
    const fallback = FALLBACK[code];
    const bucket = lines.get(code) ?? [];
    rows.push({
      id: `missing-${code}`,
      code,
      name: fallback.name,
      kind: fallback.kind,
      note: "Kode ini belum ada di daftar akun.",
      active: true,
      posted: true,
      total: bucket.reduce((sum, line) => sum + line.amount, 0),
      lines: sortLines(bucket),
    });
  }

  const kindOrder = new Map(ACCOUNT_KINDS.map((kind, index) => [kind, index]));
  rows.sort(
    (a, b) =>
      (kindOrder.get(a.kind) ?? 9) - (kindOrder.get(b.kind) ?? 9) ||
      a.code.localeCompare(b.code, "id", { numeric: true }),
  );

  const income = rows
    .filter((row) => row.code === LEDGER_CODES.partsIncome)
    .reduce((sum, row) => sum + row.total, 0);
  const expense = rows
    .filter((row) => row.code === LEDGER_CODES.cogs || row.code === LEDGER_CODES.operations)
    .reduce((sum, row) => sum + row.total, 0);
  const gap = income - expense;

  return {
    month,
    monthLabel: formatMonth(month),
    rows,
    income,
    expense,
    gap,
    shares: allocateShares(gap, partnersFromRecord(splitSnap.data())),
  };
}
