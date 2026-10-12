import { getAdminFirestore } from "@/lib/firebase/admin";
import { isBusinessDay, jakartaDate, monthKeyOf } from "@/lib/data/format";
import { parsePayMethod, payMethodLabel, type PayMethod } from "@/lib/data/payment";

const FULL_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const CHANNELS: { method: PayMethod; label: string }[] = [
  { method: "tunai", label: payMethodLabel.tunai },
  { method: "qris", label: payMethodLabel.qris },
  { method: "bank", label: payMethodLabel.bank },
];

export type ReportMode = "bulan" | "tanggal";
export type SaleSource = "Servis" | "Kasir";

export type ReportPeriod = {
  mode: ReportMode;
  month: string;
  from: string;
  to: string;
  label: string;
  fileKey: string;
};

export type SaleLine = {
  id: string;
  date: string;
  no: string;
  source: SaleSource;
  customer: string;
  detail: string;
  labor: number;
  parts: number;
  total: number;
  cost: number;
  profit: number;
  payLabel: string;
};

export type SalesReport = {
  period: ReportPeriod;
  sales: SaleLine[];
  count: number;
  labor: number;
  parts: number;
  total: number;
  cost: number;
  profit: number;
  channels: { label: string; amount: number }[];
  sources: { label: SaleSource; count: number; amount: number }[];
};

export function formatDay(iso: string) {
  const [year, month, day] = iso.split("-");
  const name = SHORT_MONTHS[Number(month) - 1];
  if (!year || !name || !day) return iso;
  return `${Number(day)} ${name} ${year}`;
}

export function formatMonth(key: string) {
  const [year, month] = key.split("-");
  const name = FULL_MONTHS[Number(month) - 1];
  return name ? `${name} ${year}` : key;
}

export function rupiahPlain(value: number) {
  const negative = value < 0;
  const digits = Math.abs(Math.round(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${negative ? "-" : ""}Rp ${digits}`;
}

function isMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

export function resolvePeriod(input: {
  mode?: string;
  bulan?: string;
  dari?: string;
  sampai?: string;
}): ReportPeriod {
  const today = jakartaDate();
  const month = input.bulan && isMonth(input.bulan) ? input.bulan : monthKeyOf(today);
  let from = input.dari && isBusinessDay(input.dari) ? input.dari : today;
  let to = input.sampai && isBusinessDay(input.sampai) ? input.sampai : today;
  if (from > to) [from, to] = [to, from];
  const mode: ReportMode = input.mode === "tanggal" ? "tanggal" : "bulan";
  const label =
    mode === "bulan" ? formatMonth(month) : from === to ? formatDay(from) : `${formatDay(from)} sampai ${formatDay(to)}`;
  const fileKey = mode === "bulan" ? month : from === to ? from : `${from}_${to}`;
  return { mode, month, from, to, label, fileKey };
}

export function reportSearch(period: ReportPeriod, format?: "xlsx" | "pdf") {
  const params = new URLSearchParams({
    mode: period.mode,
    bulan: period.month,
    dari: period.from,
    sampai: period.to,
  });
  if (format) params.set("format", format);
  return params.toString();
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

function payLabel(value: unknown) {
  const method = parsePayMethod(value);
  return method ? payMethodLabel[method] : "Belum dicatat";
}

function inPeriod(date: string, period: ReportPeriod) {
  if (!isBusinessDay(date)) return false;
  if (period.mode === "bulan") return monthKeyOf(date) === period.month;
  return date >= period.from && date <= period.to;
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
      return [`${name} × ${qty}`];
    })
    .join(", ");
}

function orderLine(id: string, data: Record<string, unknown>, period: ReportPeriod) {
  if (data.status !== "lunas") return null;
  const date = text(data.paidDate);
  if (!inPeriod(date, period)) return null;
  const labor = num(data.laborCost);
  const parts = num(data.partsSell);
  const total = num(data.grand);
  const cost = num(data.partsCost);
  const detail = [text(data.plate), text(data.complaint)].filter(Boolean).join(" · ");
  return {
    id: `spk-${id}`,
    date,
    no: text(data.no),
    source: "Servis" as const,
    customer: text(data.customerName, "Pelanggan"),
    detail,
    labor,
    parts,
    total,
    cost,
    profit: total - cost,
    payLabel: payLabel(data.payMethod),
    createdAt: text(data.createdAt),
  };
}

function walkInLine(id: string, data: Record<string, unknown>, period: ReportPeriod) {
  const date = text(data.businessDate);
  if (!inPeriod(date, period)) return null;
  const total = num(data.total);
  const cost = num(data.costTotal);
  return {
    id: `ksr-${id}`,
    date,
    no: text(data.no),
    source: "Kasir" as const,
    customer: "Walk-in",
    detail: partDetail(data.lines),
    labor: 0,
    parts: total,
    total,
    cost,
    profit: total - cost,
    payLabel: payLabel(data.payMethod),
    createdAt: text(data.createdAt),
  };
}

export async function loadSalesReport(period: ReportPeriod): Promise<SalesReport> {
  const database = getAdminFirestore();
  const orders = database.collection("serviceOrders");
  const walkIns = database.collection("walkInSales");
  const [orderSnap, saleSnap] = await Promise.all(
    period.mode === "bulan"
      ? [orders.where("monthKey", "==", period.month).get(), walkIns.where("monthKey", "==", period.month).get()]
      : [
          orders.where("paidDate", ">=", period.from).where("paidDate", "<=", period.to).get(),
          walkIns.where("businessDate", ">=", period.from).where("businessDate", "<=", period.to).get(),
        ],
  );

  const drafted = [
    ...orderSnap.docs.flatMap((doc) => {
      const line = orderLine(doc.id, doc.data() ?? {}, period);
      return line ? [line] : [];
    }),
    ...saleSnap.docs.flatMap((doc) => {
      const line = walkInLine(doc.id, doc.data() ?? {}, period);
      return line ? [line] : [];
    }),
  ].sort(
    (a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt) || a.no.localeCompare(b.no),
  );

  const sales: SaleLine[] = drafted.map((line) => ({
    id: line.id,
    date: line.date,
    no: line.no,
    source: line.source,
    customer: line.customer,
    detail: line.detail,
    labor: line.labor,
    parts: line.parts,
    total: line.total,
    cost: line.cost,
    profit: line.profit,
    payLabel: line.payLabel,
  }));
  const sum = (pick: (line: SaleLine) => number) => sales.reduce((total, line) => total + pick(line), 0);
  const channelAmounts = new Map(CHANNELS.map((channel) => [channel.label, 0]));
  let unrecorded = 0;
  for (const line of sales) {
    if (channelAmounts.has(line.payLabel)) channelAmounts.set(line.payLabel, (channelAmounts.get(line.payLabel) ?? 0) + line.total);
    else unrecorded += line.total;
  }
  const channels = CHANNELS.map((channel) => ({
    label: channel.label,
    amount: channelAmounts.get(channel.label) ?? 0,
  }));
  if (unrecorded > 0) channels.push({ label: "Belum dicatat", amount: unrecorded });

  const sources = (["Servis", "Kasir"] as const).map((label) => {
    const group = sales.filter((line) => line.source === label);
    return { label, count: group.length, amount: group.reduce((total, line) => total + line.total, 0) };
  });

  return {
    period,
    sales,
    count: sales.length,
    labor: sum((line) => line.labor),
    parts: sum((line) => line.parts),
    total: sum((line) => line.total),
    cost: sum((line) => line.cost),
    profit: sum((line) => line.profit),
    channels,
    sources,
  };
}
