import type { Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { isRole, roleLabel, type Role } from "@/lib/auth/roles";
import { canMarkPaid, canPlacePurchase } from "@/lib/auth/access";
import {
  fieldChanges,
  queueActivity,
  type ActivityActor,
  type ActivityChange,
} from "@/lib/data/activity";
import { isBusinessDay, jakartaDate, monthKeyOf, rupiah } from "@/lib/data/format";
import {
  allocateShares,
  labeledPartners,
  partnersFromRecord,
  sharesFromClose,
  splitError,
  type ProfitPartner,
  type ProfitShare,
} from "@/lib/data/profit-split";
import { parsePayMethod, payMethodLabel, type PayMethod } from "@/lib/data/payment";
import { PURCHASE_STATUSES, purchaseStatusLabel, type PurchaseStatus } from "@/lib/data/purchase";
import { isSupplyUnit } from "@/lib/data/supply";
import { heldQty, holdDelta, type HeldPart } from "@/lib/data/stock";
import type { SaleReceipt } from "@/lib/data/sale-receipt";
import { alreadyApplied, commitBatch, openBatch, runMutation } from "@/lib/data/sync-receipt";

export type Customer = { id: string; name: string; phone: string };
export type Vehicle = {
  id: string;
  customerId: string;
  plate: string;
  brand: string;
  bikeType: string;
  year: number;
};
export type Product = {
  id: string;
  code: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  safetyStock: number;
  cashierQuick: boolean;
  distributorId: string;
};
export type Distributor = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  note: string;
};
export type { PurchaseStatus } from "@/lib/data/purchase";
export { purchaseStatusLabel } from "@/lib/data/purchase";
export type PurchaseLine = {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  cost: number;
  received: number;
};
export type PurchaseReceipt = {
  at: string;
  lines: { productId: string; name: string; qty: number }[];
};
export type Purchase = {
  id: string;
  no: string;
  distributorId: string;
  distributorName: string;
  status: PurchaseStatus;
  note: string;
  lines: PurchaseLine[];
  receipts: PurchaseReceipt[];
  total: number;
  createdAt: string;
  orderedAt: string | null;
};
export type SupplyItem = {
  id: string;
  name: string;
  unit: string;
  cost: number;
};
export type ProcurementLine = {
  itemId: string;
  name: string;
  unit: string;
  qty: number;
  cost: number;
  received: number;
};
export type ProcurementReceipt = {
  at: string;
  lines: { itemId: string; name: string; qty: number }[];
};
export type Procurement = {
  id: string;
  no: string;
  vendor: string;
  status: PurchaseStatus;
  note: string;
  lines: ProcurementLine[];
  receipts: ProcurementReceipt[];
  total: number;
  createdAt: string;
  orderedAt: string | null;
};
export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};
export type PartLine = HeldPart & { name: string; cost: number; price: number };
export type SpkStatus = "antri" | "dikerjakan" | "selesai" | "lunas" | "batal";

export type ServiceOrder = {
  id: string;
  no: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  plate: string;
  brand: string;
  bikeType: string;
  year: number;
  complaint: string;
  mechanicId: string;
  mechanicName: string;
  laborCost: number;
  parts: PartLine[];
  status: SpkStatus;
  partsSell: number;
  partsCost: number;
  grand: number;
  paidDate: string | null;
  payMethod: PayMethod | null;
  monthKey: string | null;
  createdAt: string;
};

export type WalkInSale = {
  id: string;
  no: string;
  cashierName: string;
  lines: PartLine[];
  total: number;
  costTotal: number;
  businessDate: string;
  payMethod: PayMethod | null;
  monthKey: string;
  createdAt: string;
};

export type CashDay = {
  id: string;
  cashOut: number;
  counted: number | null;
  qrisReceived: number | null;
  bankReceived: number | null;
  note: string;
  closedAt: string | null;
  monthKey: string;
};

export type ChannelTotals = {
  tunai: number;
  qris: number;
  bank: number;
  unknown: number;
};

export type CustomerPayment = {
  id: string;
  customerId: string;
  customerName: string;
  payMethod: PayMethod;
  amount: number;
  note: string;
  businessDate: string;
  monthKey: string;
  createdAt: string;
};

export type { ProfitPartner, ProfitShare } from "@/lib/data/profit-split";

export type MonthClose = {
  id: string;
  revenue: number;
  cogs: number;
  cashOut: number;
  profit: number;
  shares: ProfitShare[];
  closedAt: string;
};

export type ProfitSplit = { partners: ProfitPartner[] };

const SPK_STATUSES: SpkStatus[] = ["antri", "dikerjakan", "selesai", "lunas", "batal"];

const spkStatusLabel: Record<SpkStatus, string> = {
  antri: "Antri",
  dikerjakan: "Dikerjakan",
  selesai: "Selesai",
  lunas: "Lunas",
  batal: "Batal",
};

function store() {
  return getAdminFirestore();
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

function optionalNum(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  return num(value);
}

function moneyLabel(value: number | null) {
  return value === null ? "belum diisi" : rupiah(value);
}

async function ensureOpen(tx: Transaction, month: string) {
  const snap = await tx.get(store().doc(`monthCloses/${month}`));
  if (snap.exists && snap.data()?.status === "closed") {
    throw new Error("Bulan ini sudah ditutup.");
  }
}

async function takeNumber(tx: Transaction, prefix: "SPK" | "KSR" | "PB" | "PG") {
  const ref = store().doc("meta/sequences");
  const snap = await tx.get(ref);
  const next = num(snap.data()?.[prefix]) + 1;
  tx.set(ref, { [prefix]: next }, { merge: true });
  return `${prefix}-${String(next).padStart(4, "0")}`;
}

function writeStock(
  tx: Transaction,
  snaps: FirebaseFirestore.DocumentSnapshot[],
  delta: Map<string, number>,
) {
  for (const snap of snaps) {
    const change = delta.get(snap.id);
    if (!change) continue;
    if (!snap.exists) throw new Error("Produk tidak ditemukan.");
    const name = text(snap.data()?.name, "Produk");
    const next = num(snap.data()?.stock) - change;
    if (next < 0) throw new Error(`Stok ${name} tidak cukup.`);
    tx.update(snap.ref, { stock: next });
  }
}

function mapParts(value: unknown): PartLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    return [
      {
        productId: text(row.productId),
        name: text(row.name),
        qty: num(row.qty),
        cost: num(row.cost),
        price: num(row.price),
      },
    ];
  });
}

function mapOrder(id: string, data: FirebaseFirestore.DocumentData): ServiceOrder {
  return {
    id,
    no: text(data.no),
    customerId: text(data.customerId),
    customerName: text(data.customerName),
    vehicleId: text(data.vehicleId),
    plate: text(data.plate),
    brand: text(data.brand),
    bikeType: text(data.bikeType),
    year: num(data.year),
    complaint: text(data.complaint),
    mechanicId: text(data.mechanicId),
    mechanicName: text(data.mechanicName),
    laborCost: num(data.laborCost),
    parts: mapParts(data.parts),
    status: SPK_STATUSES.includes(data.status) ? data.status : "antri",
    partsSell: num(data.partsSell),
    partsCost: num(data.partsCost),
    grand: num(data.grand),
    paidDate: data.paidDate ? text(data.paidDate) : null,
    payMethod: parsePayMethod(data.payMethod),
    monthKey: data.monthKey ? text(data.monthKey) : null,
    createdAt: text(data.createdAt),
  };
}

function priorFields(exists: boolean, fields: Record<string, string>) {
  return exists ? fields : {};
}

function partsText(parts: PartLine[]) {
  return parts.map((part) => `${part.name} ×${part.qty}`).join(", ");
}

function orderFields(order: {
  customerName: string;
  plate: string;
  complaint: string;
  mechanicName: string;
  laborCost: number;
  parts: PartLine[];
  status: SpkStatus;
  grand: number;
  payMethod: PayMethod | null;
}) {
  return {
    Pelanggan: order.customerName,
    Plat: order.plate,
    Pekerjaan: order.complaint,
    Mekanik: order.mechanicName,
    Ongkos: rupiah(order.laborCost),
    Part: partsText(order.parts),
    Status: spkStatusLabel[order.status],
    Total: rupiah(order.grand),
    "Tempat uang": order.payMethod ? payMethodLabel[order.payMethod] : "—",
  };
}

function stockChanges(
  snaps: FirebaseFirestore.DocumentSnapshot[],
  delta: Map<string, number>,
): ActivityChange[] {
  return snaps.flatMap((snap) => {
    const change = delta.get(snap.id);
    if (!change || !snap.exists) return [];
    const before = num(snap.data()?.stock);
    return [
      {
        field: `Stok ${text(snap.data()?.name, "Produk")}`,
        before: String(before),
        after: String(before - change),
      },
    ];
  });
}

export async function listCustomers() {
  const snap = await store().collection("customers").get();
  return snap.docs
    .map((doc) => ({
      id: doc.id,
      name: text(doc.data().name),
      phone: text(doc.data().phone),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function listVehicles() {
  const snap = await store().collection("vehicles").get();
  return snap.docs.map((doc) => ({
    id: doc.id,
    customerId: text(doc.data().customerId),
    plate: text(doc.data().plate),
    brand: text(doc.data().brand),
    bikeType: text(doc.data().bikeType),
    year: num(doc.data().year),
  }));
}

export async function saveCustomer(
  input: { id?: string; name: string; phone: string },
  actor: ActivityActor,
) {
  const ref = input.id
    ? store().collection("customers").doc(input.id)
    : store().collection("customers").doc();
  const existing = input.id ? await ref.get() : null;
  const before = priorFields(Boolean(existing?.exists), {
    Nama: text(existing?.data()?.name),
    Telepon: text(existing?.data()?.phone),
  });
  const after = { Nama: input.name, Telepon: input.phone };
  const batch = openBatch();
  batch.set(ref, { name: input.name, phone: input.phone }, { merge: true });
  queueActivity(batch, {
    actor,
    action: existing?.exists ? "ubah" : "buat",
    entity: "pelanggan",
    entityId: ref.id,
    label: existing?.exists ? `Pelanggan ${input.name} diubah` : `Pelanggan ${input.name} dibuat`,
    changes: fieldChanges(before, after),
  });
  await commitBatch(batch);
  return ref.id;
}

export async function saveVehicle(
  input: {
    id?: string;
    customerId: string;
    plate: string;
    brand: string;
    bikeType: string;
    year: number;
  },
  actor: ActivityActor,
) {
  const customer = await store().collection("customers").doc(input.customerId).get();
  if (!customer.exists) throw new Error("Pelanggan tidak ditemukan.");
  const ref = input.id
    ? store().collection("vehicles").doc(input.id)
    : store().collection("vehicles").doc();
  const existing = input.id ? await ref.get() : null;
  let previousCustomer = "";
  if (existing?.exists) {
    const previousId = text(existing.data()?.customerId);
    if (previousId === input.customerId) previousCustomer = text(customer.data()?.name);
    else if (previousId) {
      const previous = await store().collection("customers").doc(previousId).get();
      previousCustomer = text(previous.data()?.name);
    }
  }
  const plate = input.plate.toUpperCase();
  const before = priorFields(Boolean(existing?.exists), {
    Pelanggan: previousCustomer,
    Plat: text(existing?.data()?.plate),
    Merk: text(existing?.data()?.brand),
    Tipe: text(existing?.data()?.bikeType),
    Tahun: String(num(existing?.data()?.year)),
  });
  const after = {
    Pelanggan: text(customer.data()?.name),
    Plat: plate,
    Merk: input.brand,
    Tipe: input.bikeType,
    Tahun: String(input.year),
  };
  const batch = openBatch();
  batch.set(
    ref,
    {
      customerId: input.customerId,
      plate,
      brand: input.brand,
      bikeType: input.bikeType,
      year: input.year,
    },
    { merge: true },
  );
  queueActivity(batch, {
    actor,
    action: existing?.exists ? "ubah" : "buat",
    entity: "motor",
    entityId: ref.id,
    label: existing?.exists ? `Motor ${plate} diubah` : `Motor ${plate} dibuat`,
    changes: fieldChanges(before, after),
  });
  await commitBatch(batch);
}

export async function listProducts() {
  const snap = await store().collection("products").get();
  return snap.docs
    .map((doc) => ({
      id: doc.id,
      code: text(doc.data().code),
      name: text(doc.data().name),
      unit: text(doc.data().unit, "pcs"),
      cost: num(doc.data().cost),
      price: num(doc.data().price),
      stock: num(doc.data().stock),
      safetyStock: num(doc.data().safetyStock),
      cashierQuick: doc.data().cashierQuick === true,
      distributorId: text(doc.data().distributorId),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function saveProduct(
  input: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    cost: number;
    price: number;
    distributorId: string;
  },
  actor: ActivityActor,
) {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("Isi kode produk.");
  if (!input.distributorId) throw new Error("Pilih distributor.");
  const ref = input.id
    ? store().collection("products").doc(input.id)
    : store().collection("products").doc();
  const [taken, existing, distributorSnap] = await Promise.all([
    store().collection("products").where("code", "==", code).limit(1).get(),
    input.id ? ref.get() : Promise.resolve(null),
    store().collection("distributors").doc(input.distributorId).get(),
  ]);
  if (!taken.empty && taken.docs[0]?.id !== ref.id) {
    throw new Error("Kode produk sudah dipakai.");
  }
  if (!distributorSnap.exists) throw new Error("Distributor tidak ditemukan.");
  const creating = !existing?.exists;
  const unit = input.unit || "pcs";
  const distributorName = text(distributorSnap.data()?.name, "Distributor");
  const previousDistributorId = text(existing?.data()?.distributorId);
  const previousDistributorName =
    previousDistributorId === input.distributorId
      ? distributorName
      : previousDistributorId
        ? text(
            (await store().collection("distributors").doc(previousDistributorId).get()).data()?.name,
          )
        : "";
  const before = priorFields(Boolean(existing?.exists), {
    Kode: text(existing?.data()?.code),
    Nama: text(existing?.data()?.name),
    Satuan: text(existing?.data()?.unit, "pcs"),
    "Harga pokok": rupiah(num(existing?.data()?.cost)),
    "Harga jual": rupiah(num(existing?.data()?.price)),
    Distributor: previousDistributorName,
  });
  const after = {
    Kode: code,
    Nama: input.name,
    Satuan: unit,
    "Harga pokok": rupiah(input.cost),
    "Harga jual": rupiah(input.price),
    Distributor: distributorName,
    ...(creating ? { Stok: "0" } : {}),
  };
  const batch = openBatch();
  batch.set(
    ref,
    {
      code,
      name: input.name,
      unit,
      cost: input.cost,
      price: input.price,
      distributorId: input.distributorId,
      ...(creating ? { stock: 0, safetyStock: 0 } : {}),
    },
    { merge: true },
  );
  queueActivity(batch, {
    actor,
    action: creating ? "buat" : "ubah",
    entity: "produk",
    entityId: ref.id,
    label: creating ? `Produk ${input.name} dibuat` : `Produk ${input.name} diubah`,
    changes: fieldChanges(before, after),
  });
  await commitBatch(batch);
}

export async function saveSafetyStock(productId: string, safetyStock: number, actor: ActivityActor) {
  if (!productId) throw new Error("Barang tidak ditemukan.");
  if (!Number.isInteger(safetyStock) || safetyStock < 0 || safetyStock > 100000) {
    throw new Error("Batas aman harus angka dari 0 sampai 100.000.");
  }
  const ref = store().collection("products").doc(productId);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Barang tidak ditemukan.");
  const before = num(existing.data()?.safetyStock);
  if (before === safetyStock) return false;
  const name = text(existing.data()?.name);
  const unit = text(existing.data()?.unit, "pcs");
  const batch = openBatch();
  batch.update(ref, { safetyStock });
  queueActivity(batch, {
    actor,
    action: "ubah",
    entity: "produk",
    entityId: ref.id,
    label: `Batas aman ${name} diubah`,
    changes: fieldChanges(
      { "Batas aman": `${before} ${unit}` },
      { "Batas aman": `${safetyStock} ${unit}` },
    ),
  });
  await commitBatch(batch);
  return true;
}

export async function setProductCashierQuick(productId: string, cashierQuick: boolean, actor: ActivityActor) {
  if (!productId) throw new Error("Barang tidak ditemukan.");
  const ref = store().collection("products").doc(productId);
  const existing = await ref.get();
  if (!existing.exists) throw new Error("Barang tidak ditemukan.");
  const before = existing.data()?.cashierQuick === true;
  if (before === cashierQuick) return false;
  const name = text(existing.data()?.name, "Produk");
  const batch = openBatch();
  batch.update(ref, { cashierQuick });
  queueActivity(batch, {
    actor,
    action: "ubah",
    entity: "produk",
    entityId: ref.id,
    label: cashierQuick ? `${name} masuk kartu kasir` : `${name} lepas dari kartu kasir`,
    changes: fieldChanges(
      { "Kartu kasir": before ? "Ya" : "Tidak" },
      { "Kartu kasir": cashierQuick ? "Ya" : "Tidak" },
    ),
  });
  await commitBatch(batch);
  return true;
}

export async function listDistributors() {
  const snap = await store().collection("distributors").get();
  return snap.docs
    .map((doc) => ({
      id: doc.id,
      name: text(doc.data().name),
      contact: text(doc.data().contact),
      phone: text(doc.data().phone),
      address: text(doc.data().address),
      note: text(doc.data().note),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function saveDistributor(
  input: {
    id?: string;
    name: string;
    contact: string;
    phone: string;
    address: string;
    note: string;
  },
  actor: ActivityActor,
) {
  const ref = input.id
    ? store().collection("distributors").doc(input.id)
    : store().collection("distributors").doc();
  const existing = input.id ? await ref.get() : null;
  if (input.id && !existing?.exists) throw new Error("Distributor tidak ditemukan.");
  const before = priorFields(Boolean(existing?.exists), {
    Nama: text(existing?.data()?.name),
    Kontak: text(existing?.data()?.contact),
    Telepon: text(existing?.data()?.phone),
    Alamat: text(existing?.data()?.address),
    Catatan: text(existing?.data()?.note),
  });
  const after = {
    Nama: input.name,
    Kontak: input.contact,
    Telepon: input.phone,
    Alamat: input.address,
    Catatan: input.note,
  };
  const batch = openBatch();
  batch.set(
    ref,
    {
      name: input.name,
      contact: input.contact,
      phone: input.phone,
      address: input.address,
      note: input.note,
    },
    { merge: true },
  );
  queueActivity(batch, {
    actor,
    action: existing?.exists ? "ubah" : "buat",
    entity: "distributor",
    entityId: ref.id,
    label: existing?.exists ? `Distributor ${input.name} diubah` : `Distributor ${input.name} dibuat`,
    changes: fieldChanges(before, after),
  });
  await commitBatch(batch);
  return ref.id;
}

function mapPurchaseLines(value: unknown): PurchaseLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const productId = text(row.productId);
    if (!productId) return [];
    return [
      {
        productId,
        name: text(row.name, "Produk"),
        unit: text(row.unit, "pcs"),
        qty: num(row.qty),
        cost: num(row.cost),
        received: num(row.received),
      },
    ];
  });
}

function mapReceipts(value: unknown): PurchaseReceipt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const lines = mapPurchaseLines(row.lines).map((line) => ({
      productId: line.productId,
      name: line.name,
      qty: line.qty,
    }));
    return [{ at: text(row.at), lines }];
  });
}

function mapPurchase(id: string, data: FirebaseFirestore.DocumentData): Purchase {
  const lines = mapPurchaseLines(data.lines);
  const status = PURCHASE_STATUSES.includes(data.status) ? data.status : "diminta";
  return {
    id,
    no: text(data.no),
    distributorId: text(data.distributorId),
    distributorName: text(data.distributorName),
    status,
    note: text(data.note),
    lines,
    receipts: mapReceipts(data.receipts),
    total: lines.reduce((sum, line) => sum + line.qty * line.cost, 0),
    createdAt: text(data.createdAt),
    orderedAt: data.orderedAt ? text(data.orderedAt) : null,
  };
}

function purchaseFields(purchase: {
  distributorName: string;
  lines: PurchaseLine[];
  status: PurchaseStatus;
  total: number;
  note: string;
}) {
  return {
    Distributor: purchase.distributorName,
    Barang: purchase.lines.map((line) => `${line.name} ×${line.qty}`).join(", "),
    Status: purchaseStatusLabel[purchase.status],
    Total: rupiah(purchase.total),
    Catatan: purchase.note,
  };
}

function mergePurchaseLines(lines: { productId: string; qty: number; cost: number }[]) {
  if (lines.length === 0) throw new Error("Tambah barang yang dibeli.");
  const merged = new Map<string, { qty: number; cost: number }>();
  for (const line of lines) {
    if (!line.productId || !Number.isInteger(line.qty) || line.qty <= 0 || line.qty > 100000) {
      throw new Error("Jumlah barang harus lebih dari nol.");
    }
    if (!Number.isInteger(line.cost) || line.cost < 0 || line.cost > 1_000_000_000) {
      throw new Error("Harga beli tidak valid.");
    }
    const previous = merged.get(line.productId);
    if (previous && previous.cost !== line.cost) throw new Error("Harga beli satu barang harus sama.");
    merged.set(line.productId, { qty: (previous?.qty ?? 0) + line.qty, cost: line.cost });
  }
  return merged;
}

export async function listPurchases() {
  const snap = await store().collection("purchases").get();
  return snap.docs
    .map((doc) => mapPurchase(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function purchaseQueueCounts() {
  const purchases = await listPurchases();
  const menunggu = purchases.filter((item) => item.status === "diminta").length;
  const datang = purchases.filter((item) => item.status === "dipesan" || item.status === "sebagian").length;
  return {
    "/pembelian/permintaan": menunggu,
    "/pembelian/persetujuan": menunggu,
    "/pembelian/penerimaan": datang,
  };
}

export async function savePurchase(
  input: {
    id?: string;
    distributorId: string;
    note: string;
    lines: { productId: string; qty: number; cost: number }[];
  },
  actor: ActivityActor,
) {
  const merged = mergePurchaseLines(input.lines);
  const database = store();

  await runMutation(database, async (tx) => {
    const ref = input.id
      ? database.collection("purchases").doc(input.id)
      : database.collection("purchases").doc();
    const existingSnap = input.id ? await tx.get(ref) : null;
    const existing = existingSnap?.exists ? mapPurchase(existingSnap.id, existingSnap.data() ?? {}) : null;
    if (input.id && !existing) throw new Error("Pembelian tidak ditemukan.");
    if (existing && existing.status !== "diminta") {
      throw new Error("Pesanan yang sudah dikirim tidak bisa diubah.");
    }
    const distributorSnap = await tx.get(database.collection("distributors").doc(input.distributorId));
    if (!distributorSnap.exists) throw new Error("Distributor tidak ditemukan.");
    const productSnaps = [];
    for (const productId of merged.keys()) {
      productSnaps.push(await tx.get(database.collection("products").doc(productId)));
    }
    const lines: PurchaseLine[] = productSnaps.map((snap) => {
      if (!snap.exists) throw new Error("Produk tidak ditemukan.");
      const productName = text(snap.data()?.name, "Produk");
      if (text(snap.data()?.distributorId) !== input.distributorId) {
        throw new Error(`${productName} bukan barang distributor ini.`);
      }
      const row = merged.get(snap.id);
      return {
        productId: snap.id,
        name: productName,
        unit: text(snap.data()?.unit, "pcs"),
        qty: row?.qty ?? 0,
        cost: row?.cost ?? 0,
        received: 0,
      };
    });
    const no = existing?.no ?? (await takeNumber(tx, "PB"));
    const distributorName = text(distributorSnap.data()?.name, "Distributor");
    const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
    const next = {
      distributorName,
      lines,
      status: "diminta" as const,
      total,
      note: input.note,
    };
    tx.set(ref, {
      no,
      distributorId: input.distributorId,
      distributorName,
      status: "diminta",
      note: input.note,
      lines,
      receipts: existing?.receipts ?? [],
      total,
      createdAt: existing?.createdAt || new Date().toISOString(),
      orderedAt: null,
    });
    queueActivity(tx, {
      actor,
      action: existing ? "ubah" : "buat",
      entity: "pembelian",
      entityId: ref.id,
      label: existing ? `${no} diubah` : `${no} diminta ke ${distributorName}`,
      changes: fieldChanges(existing ? purchaseFields(existing) : {}, purchaseFields(next)),
    });
  });
}

export async function placePurchase(id: string, actor: ActivityActor) {
  if (!canPlacePurchase(actor.role)) {
    throw new Error("Hanya pemilik dan investor yang menyetujui permintaan.");
  }
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = database.collection("purchases").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pembelian tidak ditemukan.");
    const purchase = mapPurchase(snap.id, snap.data() ?? {});
    if (purchase.status !== "diminta") throw new Error("Hanya permintaan yang bisa disetujui.");
    if (!purchase.distributorId) throw new Error("Pilih distributor dulu.");
    tx.update(ref, { status: "dipesan", orderedAt: new Date().toISOString() });
    queueActivity(tx, {
      actor,
      action: "ubah",
      entity: "pembelian",
      entityId: id,
      label: `${purchase.no} disetujui ke ${purchase.distributorName}`,
      changes: fieldChanges(
        { Status: purchaseStatusLabel.diminta },
        { Status: purchaseStatusLabel.dipesan },
      ),
    });
  });
}

export async function cancelPurchase(id: string, actor: ActivityActor) {
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = database.collection("purchases").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pembelian tidak ditemukan.");
    const purchase = mapPurchase(snap.id, snap.data() ?? {});
    if (purchase.status !== "diminta" && purchase.status !== "dipesan") {
      throw new Error("Pesanan ini tidak bisa dibatalkan.");
    }
    if (purchase.lines.some((line) => line.received > 0)) {
      throw new Error("Barang yang sudah diterima tidak bisa dibatalkan.");
    }
    if (purchase.status === "dipesan" && !canPlacePurchase(actor.role)) {
      throw new Error("Hanya pemilik dan investor yang membatalkan pesanan.");
    }
    tx.update(ref, { status: "batal" });
    queueActivity(tx, {
      actor,
      action: "ubah",
      entity: "pembelian",
      entityId: id,
      label: `${purchase.no} dibatalkan`,
      changes: fieldChanges(
        { Status: purchaseStatusLabel[purchase.status] },
        { Status: purchaseStatusLabel.batal },
      ),
    });
  });
}

export async function receivePurchase(
  id: string,
  inputLines: { productId: string; qty: number }[],
  actor: ActivityActor,
  options?: { closeShort?: boolean },
) {
  const closeShort = options?.closeShort === true;
  const qtyByProduct = new Map<string, number>();
  for (const line of inputLines) {
    if (!line.productId || !Number.isInteger(line.qty) || line.qty <= 0) continue;
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + line.qty);
  }
  if (qtyByProduct.size === 0 && !closeShort) throw new Error("Isi jumlah barang yang datang.");

  const database = store();
  await runMutation(database, async (tx) => {
    const ref = database.collection("purchases").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pembelian tidak ditemukan.");
    const purchase = mapPurchase(snap.id, snap.data() ?? {});
    if (purchase.status !== "dipesan" && purchase.status !== "sebagian") {
      throw new Error("Barang diterima dari pesanan yang sudah dikirim.");
    }
    const productSnaps = [];
    for (const productId of qtyByProduct.keys()) {
      productSnaps.push(await tx.get(database.collection("products").doc(productId)));
    }
    const nextLines = purchase.lines.map((line) => ({ ...line }));
    const receiptLines: PurchaseReceipt["lines"] = [];
    const stockLogs: ActivityChange[] = [];
    for (const productSnap of productSnaps) {
      const qty = qtyByProduct.get(productSnap.id) ?? 0;
      if (!qty) continue;
      const line = nextLines.find((item) => item.productId === productSnap.id);
      if (!line) throw new Error("Barang ini tidak ada di pesanan.");
      const remaining = line.qty - line.received;
      if (qty > remaining) throw new Error(`Jumlah ${line.name} melebihi sisa pesanan.`);
      if (!productSnap.exists) throw new Error("Produk tidak ditemukan.");
      const beforeStock = num(productSnap.data()?.stock);
      const beforeCost = num(productSnap.data()?.cost);
      tx.update(productSnap.ref, { stock: beforeStock + qty, cost: line.cost });
      line.received += qty;
      receiptLines.push({ productId: line.productId, name: line.name, qty });
      stockLogs.push({
        field: `Stok ${line.name}`,
        before: String(beforeStock),
        after: String(beforeStock + qty),
      });
      if (beforeCost !== line.cost) {
        stockLogs.push({
          field: `Harga pokok ${line.name}`,
          before: rupiah(beforeCost),
          after: rupiah(line.cost),
        });
      }
    }
    const complete = nextLines.every((line) => line.received >= line.qty);
    if (closeShort && !nextLines.some((line) => line.received > 0)) {
      throw new Error("Belum ada barang masuk stok. Batalkan pesanan jika tidak jadi diterima.");
    }
    const status: PurchaseStatus = complete || closeShort ? "diterima" : "sebagian";
    const ordered = nextLines.reduce((sum, line) => sum + line.qty, 0);
    const received = nextLines.reduce((sum, line) => sum + line.received, 0);
    const receipts =
      receiptLines.length > 0
        ? [...purchase.receipts, { at: new Date().toISOString(), lines: receiptLines }]
        : purchase.receipts;
    tx.update(ref, { lines: nextLines, status, receipts });
    const qtyTotal = receiptLines.reduce((sum, line) => sum + line.qty, 0);
    const after: Record<string, string> = { Status: purchaseStatusLabel[status] };
    if (receiptLines.length > 0) {
      after.Datang = receiptLines.map((line) => `${line.name} ×${line.qty}`).join(", ");
    }
    if (closeShort && !complete) after.Diterima = `${received} dari ${ordered}`;
    queueActivity(tx, {
      actor,
      action: "ubah",
      entity: "pembelian",
      entityId: id,
      label: complete
        ? `${purchase.no} diterima lengkap`
        : closeShort
          ? `${purchase.no} ditutup, diterima ${received} dari ${ordered}`
          : `${purchase.no} menerima ${qtyTotal} barang`,
      changes: [...fieldChanges({ Status: purchaseStatusLabel[purchase.status] }, after), ...stockLogs],
    });
  });
}

function mapProcurementLines(value: unknown): ProcurementLine[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const itemId = text(row.itemId);
    const name = text(row.name);
    if (!itemId || !name) return [];
    return [
      {
        itemId,
        name,
        unit: text(row.unit, "pcs"),
        qty: num(row.qty),
        cost: num(row.cost),
        received: num(row.received),
      },
    ];
  });
}

function mapProcurementReceipts(value: unknown): ProcurementReceipt[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const lines = mapProcurementLines(row.lines).map((line) => ({
      itemId: line.itemId,
      name: line.name,
      qty: line.qty,
    }));
    return [{ at: text(row.at), lines }];
  });
}

function mapProcurement(id: string, data: FirebaseFirestore.DocumentData): Procurement | null {
  const lines = mapProcurementLines(data.lines);
  if (lines.length === 0) return null;
  const status = PURCHASE_STATUSES.includes(data.status) ? data.status : "diminta";
  return {
    id,
    no: text(data.no),
    vendor: text(data.vendor),
    status,
    note: text(data.note),
    lines,
    receipts: mapProcurementReceipts(data.receipts),
    total: lines.reduce((sum, line) => sum + line.qty * line.cost, 0),
    createdAt: text(data.createdAt),
    orderedAt: data.orderedAt ? text(data.orderedAt) : null,
  };
}

function procurementFields(record: {
  vendor: string;
  lines: ProcurementLine[];
  status: PurchaseStatus;
  total: number;
  note: string;
}) {
  return {
    Toko: record.vendor,
    Barang: record.lines.map((line) => `${line.name} ×${line.qty}`).join(", "),
    Status: purchaseStatusLabel[record.status],
    Total: rupiah(record.total),
    Catatan: record.note,
  };
}

function mergeSupplyLines(lines: { itemId: string; qty: number; cost: number }[]) {
  if (lines.length === 0) throw new Error("Tambah barang yang dibeli.");
  const merged = new Map<string, { qty: number; cost: number }>();
  for (const line of lines) {
    if (!line.itemId || !Number.isInteger(line.qty) || line.qty <= 0 || line.qty > 100000) {
      throw new Error("Jumlah barang harus lebih dari nol.");
    }
    if (!Number.isInteger(line.cost) || line.cost < 0 || line.cost > 1_000_000_000) {
      throw new Error("Harga beli tidak valid.");
    }
    const previous = merged.get(line.itemId);
    if (previous && previous.cost !== line.cost) throw new Error("Harga beli satu barang harus sama.");
    merged.set(line.itemId, { qty: (previous?.qty ?? 0) + line.qty, cost: line.cost });
  }
  return merged;
}

export async function listSupplyItems() {
  const snap = await store().collection("supplyItems").get();
  return snap.docs
    .map((doc) => ({
      id: doc.id,
      name: text(doc.data().name),
      unit: text(doc.data().unit, "pcs"),
      cost: num(doc.data().cost),
    }))
    .filter((item) => item.name)
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function saveSupplyItem(
  input: { id?: string; name: string; unit: string; cost: number },
  actor: ActivityActor,
) {
  const name = input.name.trim();
  const unit = input.unit.trim();
  if (name.length < 2 || name.length > 80) throw new Error("Isi nama barang.");
  if (!isSupplyUnit(unit)) throw new Error("Pilih satuan barang.");
  if (!Number.isInteger(input.cost) || input.cost < 0 || input.cost > 1_000_000_000) {
    throw new Error("Harga beli tidak valid.");
  }
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = input.id ? database.collection("supplyItems").doc(input.id) : database.collection("supplyItems").doc();
    const existingSnap = input.id ? await tx.get(ref) : null;
    if (input.id && !existingSnap?.exists) throw new Error("Barang tidak ditemukan.");
    const catalog = await tx.get(database.collection("supplyItems"));
    const clash = catalog.docs.find(
      (doc) => doc.id !== ref.id && text(doc.data().name).toLowerCase() === name.toLowerCase(),
    );
    if (clash) throw new Error("Barang ini sudah terdaftar.");
    const before = priorFields(Boolean(existingSnap?.exists), {
      Nama: text(existingSnap?.data()?.name),
      Satuan: text(existingSnap?.data()?.unit),
      "Harga beli": rupiah(num(existingSnap?.data()?.cost)),
    });
    const after = { Nama: name, Satuan: unit, "Harga beli": rupiah(input.cost) };
    tx.set(ref, { name, unit, cost: input.cost }, { merge: true });
    queueActivity(tx, {
      actor,
      action: existingSnap?.exists ? "ubah" : "buat",
      entity: "pengadaan",
      entityId: ref.id,
      label: existingSnap?.exists ? `${name} diubah` : `${name} didaftarkan`,
      changes: fieldChanges(before, after),
    });
  });
}

export async function listProcurements() {
  const snap = await store().collection("procurements").get();
  return snap.docs
    .flatMap((doc) => {
      const record = mapProcurement(doc.id, doc.data());
      return record ? [record] : [];
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function procurementQueueCounts() {
  const records = await listProcurements();
  const menunggu = records.filter((item) => item.status === "diminta").length;
  const datang = records.filter((item) => item.status === "dipesan" || item.status === "sebagian").length;
  return {
    "/pengadaan/permintaan": menunggu,
    "/pengadaan/persetujuan": menunggu,
    "/pengadaan/penerimaan": datang,
  };
}

export async function saveProcurement(
  input: {
    id?: string;
    vendor: string;
    note: string;
    lines: { itemId: string; qty: number; cost: number }[];
  },
  actor: ActivityActor,
) {
  const vendor = input.vendor.trim();
  const note = input.note.trim();
  if (vendor.length < 2 || vendor.length > 80) throw new Error("Isi nama toko.");
  if (note.length > 200) throw new Error("Catatan terlalu panjang.");
  const merged = mergeSupplyLines(input.lines);
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = input.id
      ? database.collection("procurements").doc(input.id)
      : database.collection("procurements").doc();
    const existingSnap = input.id ? await tx.get(ref) : null;
    const existing = existingSnap?.exists ? mapProcurement(existingSnap.id, existingSnap.data() ?? {}) : null;
    if (input.id && !existing) throw new Error("Pengadaan tidak ditemukan.");
    if (existing && existing.status !== "diminta") {
      throw new Error("Pesanan yang sudah disetujui tidak bisa diubah.");
    }
    const itemSnaps = [];
    for (const itemId of merged.keys()) {
      itemSnaps.push(await tx.get(database.collection("supplyItems").doc(itemId)));
    }
    const lines: ProcurementLine[] = itemSnaps.map((snap) => {
      if (!snap.exists) throw new Error("Barang tidak ditemukan. Daftarkan dulu di menu Barang.");
      const row = merged.get(snap.id);
      return {
        itemId: snap.id,
        name: text(snap.data()?.name, "Barang"),
        unit: text(snap.data()?.unit, "pcs"),
        qty: row?.qty ?? 0,
        cost: row?.cost ?? 0,
        received: 0,
      };
    });
    const no = existing?.no || (await takeNumber(tx, "PG"));
    const total = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
    const next = { vendor, lines, status: "diminta" as const, total, note };
    tx.set(ref, {
      no,
      vendor,
      status: "diminta",
      note,
      lines,
      receipts: existing?.receipts ?? [],
      total,
      createdAt: existing?.createdAt || new Date().toISOString(),
      orderedAt: null,
    });
    for (const snap of itemSnaps) {
      const row = merged.get(snap.id);
      if (snap.exists && row && num(snap.data()?.cost) !== row.cost) {
        tx.update(snap.ref, { cost: row.cost });
      }
    }
    queueActivity(tx, {
      actor,
      action: existing ? "ubah" : "buat",
      entity: "pengadaan",
      entityId: ref.id,
      label: existing ? `${no} diubah` : `${no} diminta ke ${vendor}`,
      changes: fieldChanges(existing ? procurementFields(existing) : {}, procurementFields(next)),
    });
  });
}

export async function placeProcurement(id: string, actor: ActivityActor) {
  if (!canPlacePurchase(actor.role)) {
    throw new Error("Hanya pemilik dan investor yang menyetujui permintaan.");
  }
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = database.collection("procurements").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pengadaan tidak ditemukan.");
    const record = mapProcurement(snap.id, snap.data() ?? {});
    if (!record) throw new Error("Pengadaan tidak ditemukan.");
    if (record.status !== "diminta") throw new Error("Hanya permintaan yang bisa disetujui.");
    if (record.vendor.length < 2) throw new Error("Isi nama toko dulu.");
    tx.update(ref, { status: "dipesan", orderedAt: new Date().toISOString() });
    queueActivity(tx, {
      actor,
      action: "ubah",
      entity: "pengadaan",
      entityId: id,
      label: `${record.no} disetujui ke ${record.vendor}`,
      changes: fieldChanges({ Status: purchaseStatusLabel.diminta }, { Status: purchaseStatusLabel.dipesan }),
    });
  });
}

export async function cancelProcurement(id: string, actor: ActivityActor) {
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = database.collection("procurements").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pengadaan tidak ditemukan.");
    const record = mapProcurement(snap.id, snap.data() ?? {});
    if (!record) throw new Error("Pengadaan tidak ditemukan.");
    if (record.status !== "diminta" && record.status !== "dipesan") {
      throw new Error("Pesanan ini tidak bisa dibatalkan.");
    }
    if (record.lines.some((line) => line.received > 0)) {
      throw new Error("Barang yang sudah diterima tidak bisa dibatalkan.");
    }
    if (record.status === "dipesan" && !canPlacePurchase(actor.role)) {
      throw new Error("Hanya pemilik dan investor yang membatalkan pesanan.");
    }
    tx.update(ref, { status: "batal" });
    queueActivity(tx, {
      actor,
      action: "ubah",
      entity: "pengadaan",
      entityId: id,
      label: `${record.no} dibatalkan`,
      changes: fieldChanges(
        { Status: purchaseStatusLabel[record.status] },
        { Status: purchaseStatusLabel.batal },
      ),
    });
  });
}

export async function receiveProcurement(
  id: string,
  inputLines: { itemId: string; qty: number }[],
  actor: ActivityActor,
) {
  const qtyByItem = new Map<string, number>();
  for (const line of inputLines) {
    if (!line.itemId || !Number.isInteger(line.qty) || line.qty <= 0) continue;
    qtyByItem.set(line.itemId, (qtyByItem.get(line.itemId) ?? 0) + line.qty);
  }
  if (qtyByItem.size === 0) throw new Error("Isi jumlah barang yang datang.");
  const database = store();
  await runMutation(database, async (tx) => {
    const ref = database.collection("procurements").doc(id);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new Error("Pengadaan tidak ditemukan.");
    const record = mapProcurement(snap.id, snap.data() ?? {});
    if (!record) throw new Error("Pengadaan tidak ditemukan.");
    if (record.status !== "dipesan" && record.status !== "sebagian") {
      throw new Error("Barang diterima dari pesanan yang sudah disetujui.");
    }
    const nextLines = record.lines.map((line) => ({ ...line }));
    const receiptLines: ProcurementReceipt["lines"] = [];
    for (const [itemId, qty] of qtyByItem) {
      const line = nextLines.find((item) => item.itemId === itemId);
      if (!line) throw new Error("Barang ini tidak ada di pesanan.");
      const remaining = line.qty - line.received;
      if (qty > remaining) throw new Error(`Jumlah ${line.name} melebihi sisa pesanan.`);
      line.received += qty;
      receiptLines.push({ itemId, name: line.name, qty });
    }
    const status: PurchaseStatus = nextLines.every((line) => line.received >= line.qty) ? "diterima" : "sebagian";
    tx.update(ref, {
      lines: nextLines,
      status,
      receipts: [...record.receipts, { at: new Date().toISOString(), lines: receiptLines }],
    });
    const qtyTotal = receiptLines.reduce((sum, line) => sum + line.qty, 0);
    queueActivity(tx, {
      actor,
      action: "ubah",
      entity: "pengadaan",
      entityId: id,
      label: status === "diterima" ? `${record.no} diterima lengkap` : `${record.no} menerima ${qtyTotal} barang`,
      changes: fieldChanges(
        { Status: purchaseStatusLabel[record.status] },
        {
          Status: purchaseStatusLabel[status],
          Datang: receiptLines.map((line) => `${line.name} ×${line.qty}`).join(", "),
        },
      ),
    });
  });
}

export async function listStaff() {
  const snap = await store().collection("users").get();
  return snap.docs
    .map((doc) => ({
      id: doc.id,
      name: text(doc.data().name),
      email: text(doc.data().email),
      role: doc.data().role as Role,
      active: doc.data().active !== false,
    }))
    .filter((user) => user.active)
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function createStaff(
  input: {
    name: string;
    email: string;
    password: string;
    role: Role;
  },
  actor: ActivityActor,
) {
  if (await alreadyApplied()) return;
  let created: { uid: string };
  try {
    created = await getAdminAuth().createUser({
      email: input.email,
      password: input.password,
      displayName: input.name,
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    if (code !== "auth/email-already-exists") throw error;
    const existing = await getAdminAuth().getUserByEmail(input.email);
    const doc = await store().collection("users").doc(existing.uid).get();
    if (doc.exists) throw error;
    created = existing;
  }
  const ref = store().collection("users").doc(created.uid);
  const batch = openBatch();
  batch.set(ref, {
    name: input.name,
    email: input.email,
    role: input.role,
    active: true,
  });
  queueActivity(batch, {
    actor,
    action: "buat",
    entity: "pegawai",
    entityId: created.uid,
    label: `${input.name} ditambahkan sebagai ${roleLabel[input.role]}`,
    changes: fieldChanges(
      {},
      {
        Nama: input.name,
        Email: input.email,
        Peran: roleLabel[input.role],
      },
    ),
  });
  await commitBatch(batch);
}

export async function updateStaff(
  input: {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: Role;
  },
  actor: ActivityActor,
) {
  if (await alreadyApplied()) return;
  const ref = store().collection("users").doc(input.id);
  const snap = await ref.get();
  const data = snap.data();
  if (!snap.exists || data?.active === false || !isRole(data?.role)) {
    throw new Error("Pegawai tidak ditemukan.");
  }
  if (data.role === "pemilik" && input.role !== "pemilik") {
    const owners = await store().collection("users").where("role", "==", "pemilik").get();
    const activeOwners = owners.docs.filter((doc) => doc.data().active !== false);
    if (activeOwners.length <= 1) {
      throw new Error("Harus tetap ada satu pemilik.");
    }
  }
  const before = {
    Nama: text(data.name),
    Email: text(data.email),
    Peran: roleLabel[data.role],
  };
  const after = {
    Nama: input.name,
    Email: input.email,
    Peran: roleLabel[input.role],
  };
  await getAdminAuth().updateUser(input.id, {
    email: input.email,
    displayName: input.name,
    ...(input.password ? { password: input.password } : {}),
  });
  const changes: ActivityChange[] = fieldChanges(before, after);
  if (input.password) changes.push({ field: "Kata sandi", before: "", after: "diubah" });
  const batch = openBatch();
  batch.update(ref, {
    name: input.name,
    email: input.email,
    role: input.role,
  });
  queueActivity(batch, {
    actor,
    action: "ubah",
    entity: "pegawai",
    entityId: input.id,
    label: `Data ${input.name} diubah`,
    changes,
  });
  await commitBatch(batch);
  if (input.password && input.id !== actor.uid) {
    await getAdminAuth().revokeRefreshTokens(input.id);
  }
}

export async function listOrders() {
  const snap = await store().collection("serviceOrders").get();
  return snap.docs
    .map((doc) => mapOrder(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getOrder(id: string) {
  const snap = await store().collection("serviceOrders").doc(id).get();
  if (!snap.exists) return null;
  return mapOrder(snap.id, snap.data() ?? {});
}

export async function saveServiceOrder(
  input: {
    id?: string;
    customerId: string;
    vehicleId: string;
    complaint: string;
    mechanicId: string;
    laborCost: number;
    parts: { productId: string; qty: number }[];
    status: SpkStatus;
    payMethod: PayMethod | null;
  },
  actor: ActivityActor,
) {
  const role = actor.role;
  if (!SPK_STATUSES.includes(input.status)) throw new Error("Status tidak dikenal.");
  if ((input.status === "lunas" || input.status === "batal") && !canMarkPaid(role)) {
    throw new Error("Hanya kasir, pemilik, atau investor yang menandai lunas dan batal.");
  }
  if (role === "mekanik" && !["antri", "dikerjakan", "selesai"].includes(input.status)) {
    throw new Error("Mekanik mengubah status sampai selesai.");
  }
  const payMethod = input.status === "lunas" ? input.payMethod : null;
  if (input.status === "lunas" && !payMethod) throw new Error("Pilih tempat uang.");

  const database = store();
  const customer = await database.collection("customers").doc(input.customerId).get();
  const vehicle = await database.collection("vehicles").doc(input.vehicleId).get();
  const mechanic = await database.collection("users").doc(input.mechanicId).get();
  if (!customer.exists) throw new Error("Pelanggan tidak ditemukan.");
  if (!vehicle.exists || vehicle.data()?.customerId !== input.customerId) {
    throw new Error("Motor tidak cocok dengan pelanggan.");
  }
  if (!mechanic.exists) throw new Error("Mekanik tidak ditemukan.");

  const qtyByProduct = new Map<string, number>();
  for (const part of input.parts) {
    if (!part.productId || part.qty <= 0) throw new Error("Jumlah part harus lebih dari nol.");
    qtyByProduct.set(part.productId, (qtyByProduct.get(part.productId) ?? 0) + part.qty);
  }

  await runMutation(database, async (tx) => {
    const ref = input.id
      ? database.collection("serviceOrders").doc(input.id)
      : database.collection("serviceOrders").doc();
    const existingSnap = input.id ? await tx.get(ref) : null;
    const existing = existingSnap?.exists ? mapOrder(existingSnap.id, existingSnap.data() ?? {}) : null;
    if (input.id && !existing) throw new Error("SPK tidak ditemukan.");
    if (existing && role === "mekanik" && (existing.status === "lunas" || existing.status === "batal")) {
      throw new Error("SPK ini sudah dikunci untuk mekanik.");
    }

    const paidDate = input.status === "lunas" ? existing?.paidDate || jakartaDate() : null;
    const months = new Set<string>();
    if (existing?.monthKey) months.add(existing.monthKey);
    if (paidDate) months.add(monthKeyOf(paidDate));
    for (const month of months) await ensureOpen(tx, month);

    const before = heldQty(existing?.parts ?? [], existing?.status ?? "batal");
    const productIds = new Set([...before.keys(), ...qtyByProduct.keys()]);
    const productSnaps = [];
    for (const productId of productIds) {
      productSnaps.push(await tx.get(database.collection("products").doc(productId)));
    }
    const parts: PartLine[] = [];
    for (const snap of productSnaps) {
      if (!qtyByProduct.has(snap.id)) continue;
      if (!snap.exists) throw new Error("Produk tidak ditemukan.");
      parts.push({
        productId: snap.id,
        name: text(snap.data()?.name, "Produk"),
        qty: qtyByProduct.get(snap.id) ?? 0,
        cost: num(snap.data()?.cost),
        price: num(snap.data()?.price),
      });
    }
    const after = heldQty(parts, input.status);
    const no = existing?.no ?? (await takeNumber(tx, "SPK"));
    const delta = holdDelta(before, after);
    writeStock(tx, productSnaps, delta);
    const partsSell = parts.reduce((sum, part) => sum + part.qty * part.price, 0);
    const partsCost = parts.reduce((sum, part) => sum + part.qty * part.cost, 0);
    const vehicleData = vehicle.data() ?? {};
    const next = {
      customerName: text(customer.data()?.name),
      plate: text(vehicleData.plate),
      complaint: input.complaint,
      mechanicName: text(mechanic.data()?.name),
      laborCost: input.laborCost,
      parts,
      status: input.status,
      grand: partsSell + input.laborCost,
      payMethod,
    };

    tx.set(ref, {
      no,
      customerId: input.customerId,
      customerName: next.customerName,
      vehicleId: input.vehicleId,
      plate: next.plate,
      brand: text(vehicleData.brand),
      bikeType: text(vehicleData.bikeType),
      year: num(vehicleData.year),
      complaint: next.complaint,
      mechanicId: input.mechanicId,
      mechanicName: next.mechanicName,
      laborCost: next.laborCost,
      parts,
      status: next.status,
      partsSell,
      partsCost,
      grand: next.grand,
      paidDate,
      payMethod,
      monthKey: paidDate ? monthKeyOf(paidDate) : null,
      createdAt: existing?.createdAt || new Date().toISOString(),
    });
    const statusChanged = existing && existing.status !== input.status;
    queueActivity(tx, {
      actor,
      action: existing ? "ubah" : "buat",
      entity: "spk",
      entityId: ref.id,
      label: !existing
        ? `${no} dibuat`
        : statusChanged
          ? `${no} jadi ${spkStatusLabel[input.status].toLowerCase()}`
          : `${no} diubah`,
      changes: [
        ...fieldChanges(existing ? orderFields(existing) : {}, orderFields(next)),
        ...stockChanges(productSnaps, delta),
      ],
    });
  });
}

export async function saveCustomerPayment(
  input: {
    day: string;
    customerId: string;
    payMethod: PayMethod | null;
    amount: number;
    note: string;
  },
  actor: ActivityActor,
) {
  if (!isBusinessDay(input.day)) throw new Error("Tanggal tidak valid.");
  if (!input.payMethod) throw new Error("Pilih tempat uang.");
  if (input.amount <= 0) throw new Error("Jumlah pembayaran harus lebih dari nol.");
  const payMethod = input.payMethod;
  const database = store();
  const customer = await database.collection("customers").doc(input.customerId).get();
  if (!customer.exists) throw new Error("Pelanggan tidak ditemukan.");
  const customerName = text(customer.data()?.name);
  const month = monthKeyOf(input.day);
  await runMutation(database, async (tx) => {
    await ensureOpen(tx, month);
    const ref = database.collection("customerPayments").doc();
    tx.set(ref, {
      customerId: input.customerId,
      customerName,
      payMethod,
      amount: input.amount,
      note: input.note,
      businessDate: input.day,
      monthKey: month,
      createdAt: new Date().toISOString(),
    });
    queueActivity(tx, {
      actor,
      action: "buat",
      entity: "pembayaran",
      entityId: ref.id,
      label: `${customerName} membayar`,
      changes: fieldChanges(
        {},
        {
          Pelanggan: customerName,
          "Tempat uang": payMethodLabel[payMethod],
          Jumlah: rupiah(input.amount),
          Catatan: input.note,
        },
      ),
    });
  });
}

function mapPayment(id: string, data: FirebaseFirestore.DocumentData): CustomerPayment | null {
  const payMethod = parsePayMethod(data.payMethod);
  if (!payMethod) return null;
  return {
    id,
    customerId: text(data.customerId),
    customerName: text(data.customerName, "Pelanggan"),
    payMethod,
    amount: num(data.amount),
    note: text(data.note),
    businessDate: text(data.businessDate),
    monthKey: text(data.monthKey),
    createdAt: text(data.createdAt),
  };
}

function mapSale(id: string, data: FirebaseFirestore.DocumentData): WalkInSale {
  return {
    id,
    no: text(data.no),
    cashierName: text(data.cashierName),
    lines: mapParts(data.lines),
    total: num(data.total),
    costTotal: num(data.costTotal),
    businessDate: text(data.businessDate),
    payMethod: parsePayMethod(data.payMethod),
    monthKey: text(data.monthKey),
    createdAt: text(data.createdAt),
  };
}

export async function listSales() {
  const snap = await store().collection("walkInSales").get();
  return snap.docs
    .map((doc) => mapSale(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function listSalesBetween(from: string, to: string) {
  const snap = await store()
    .collection("walkInSales")
    .where("businessDate", ">=", from)
    .where("businessDate", "<=", to)
    .get();
  return snap.docs
    .map((doc) => mapSale(doc.id, doc.data()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveWalkInSale(
  input: { lines: { productId: string; qty: number }[]; payMethod: PayMethod | null },
  actor: ActivityActor,
): Promise<SaleReceipt | null> {
  if (input.lines.length === 0) throw new Error("Pilih barang yang dijual.");
  if (!input.payMethod) throw new Error("Pilih tempat uang.");
  if (await alreadyApplied()) return null;
  const payMethod = input.payMethod;
  const qtyByProduct = new Map<string, number>();
  for (const line of input.lines) {
    if (!line.productId || line.qty <= 0) throw new Error("Jumlah barang harus lebih dari nol.");
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + line.qty);
  }
  const day = jakartaDate();
  const month = monthKeyOf(day);
  const database = store();
  let receipt: SaleReceipt | null = null;

  await runMutation(database, async (tx) => {
    await ensureOpen(tx, month);
    const snaps = [];
    for (const productId of qtyByProduct.keys()) {
      snaps.push(await tx.get(database.collection("products").doc(productId)));
    }
    const lines: PartLine[] = snaps.map((snap) => {
      if (!snap.exists) throw new Error("Produk tidak ditemukan.");
      return {
        productId: snap.id,
        name: text(snap.data()?.name, "Produk"),
        qty: qtyByProduct.get(snap.id) ?? 0,
        cost: num(snap.data()?.cost),
        price: num(snap.data()?.price),
      };
    });
    const no = await takeNumber(tx, "KSR");
    const delta = holdDelta(new Map(), heldQty(lines, "lunas"));
    writeStock(tx, snaps, delta);
    const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const costTotal = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
    const saleRef = database.collection("walkInSales").doc();
    tx.set(saleRef, {
      no,
      cashierName: actor.name,
      lines,
      total,
      costTotal,
      businessDate: day,
      payMethod,
      monthKey: month,
      createdAt: new Date().toISOString(),
    });
    queueActivity(tx, {
      actor,
      action: "buat",
      entity: "kasir",
      entityId: saleRef.id,
      label: `${no} terjual`,
      changes: [
        ...fieldChanges({}, { Barang: partsText(lines), Total: rupiah(total), "Tempat uang": payMethodLabel[payMethod] }),
        ...stockChanges(snaps, delta),
      ],
    });
    receipt = {
      no,
      businessDate: day,
      lines: lines.map((line) => ({ name: line.name, qty: line.qty, price: line.price })),
      total,
      payMethod,
    };
  });
  return receipt;
}

function emptyChannels(): ChannelTotals {
  return { tunai: 0, qris: 0, bank: 0, unknown: 0 };
}

function addChannel(totals: ChannelTotals, method: PayMethod | null, amount: number) {
  if (method) totals[method] += amount;
  else totals.unknown += amount;
}

export async function cashSnapshot(day: string): Promise<{ channels: ChannelTotals; payments: CustomerPayment[] }> {
  const snap = await store().collection("customerPayments").where("businessDate", "==", day).get();
  const channels = emptyChannels();
  const payments: CustomerPayment[] = [];
  for (const doc of snap.docs) {
    const payment = mapPayment(doc.id, doc.data());
    if (!payment) continue;
    payments.push(payment);
    addChannel(channels, payment.payMethod, payment.amount);
  }
  payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { channels, payments };
}

export async function getCashDay(day: string): Promise<CashDay | null> {
  const snap = await store().collection("cashDays").doc(day).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    cashOut: num(data.cashOut),
    counted: optionalNum(data.counted),
    qrisReceived: optionalNum(data.qrisReceived),
    bankReceived: optionalNum(data.bankReceived),
    note: text(data.note),
    closedAt: data.closedAt ? text(data.closedAt) : null,
    monthKey: text(data.monthKey),
  };
}

export async function saveCashDay(
  input: {
    day: string;
    cashOut: number;
    counted: number;
    qrisReceived: number | null;
    bankReceived: number | null;
    note: string;
  },
  actor: ActivityActor,
) {
  if (!isBusinessDay(input.day)) throw new Error("Tanggal tidak valid.");
  const month = monthKeyOf(input.day);
  const database = store();
  await runMutation(database, async (tx) => {
    await ensureOpen(tx, month);
    const ref = database.collection("cashDays").doc(input.day);
    const existing = await tx.get(ref);
    const before = priorFields(existing.exists, {
      Pengeluaran: rupiah(num(existing.data()?.cashOut)),
      Dihitung: rupiah(num(existing.data()?.counted)),
      "QRIS masuk": moneyLabel(optionalNum(existing.data()?.qrisReceived)),
      "Bank masuk": moneyLabel(optionalNum(existing.data()?.bankReceived)),
      Catatan: text(existing.data()?.note),
    });
    const after = {
      Pengeluaran: rupiah(input.cashOut),
      Dihitung: rupiah(input.counted),
      "QRIS masuk": moneyLabel(input.qrisReceived),
      "Bank masuk": moneyLabel(input.bankReceived),
      Catatan: input.note,
    };
    tx.set(ref, {
      cashOut: input.cashOut,
      counted: input.counted,
      qrisReceived: input.qrisReceived,
      bankReceived: input.bankReceived,
      note: input.note,
      closedAt: new Date().toISOString(),
      monthKey: month,
    });
    queueActivity(tx, {
      actor,
      action: existing.exists ? "ubah" : "buat",
      entity: "kas",
      entityId: input.day,
      label: existing.exists ? `Kas ${input.day} diubah` : `Kas ${input.day} ditutup`,
      changes: fieldChanges(before, after),
    });
  });
}

function percentFields(partners: ProfitPartner[]) {
  return Object.fromEntries(labeledPartners(partners).map(({ label, row }) => [label, `${row.percent}%`]));
}

export async function getProfitSplit(): Promise<ProfitSplit> {
  const snap = await store().doc("settings/profitSplit").get();
  return { partners: partnersFromRecord(snap.data()) };
}

export async function saveProfitSplit(split: ProfitSplit, actor: ActivityActor) {
  const staff = await listStaff();
  const names = new Map(staff.map((user) => [user.id, user.name]));
  const partners = split.partners.map((partner) => ({
    id: partner.id.trim(),
    name: names.get(partner.id.trim()) ?? "",
    percent: partner.percent,
  }));
  const message = splitError(partners, new Set(names.keys()));
  if (message) throw new Error(message);
  const ref = store().doc("settings/profitSplit");
  const existing = await ref.get();
  const before = priorFields(existing.exists, percentFields(partnersFromRecord(existing.data())));
  const batch = openBatch();
  batch.set(ref, { partners });
  queueActivity(batch, {
    actor,
    action: existing.exists ? "ubah" : "buat",
    entity: "bagi-hasil",
    entityId: "profitSplit",
    label: existing.exists ? "Persentase bagi hasil diubah" : "Persentase bagi hasil dibuat",
    changes: fieldChanges(before, percentFields(partners)),
  });
  await commitBatch(batch);
}

async function monthFigures(tx: Transaction, month: string) {
  const database = store();
  const orders = await tx.get(database.collection("serviceOrders").where("monthKey", "==", month));
  const sales = await tx.get(database.collection("walkInSales").where("monthKey", "==", month));
  const days = await tx.get(database.collection("cashDays").where("monthKey", "==", month));
  const splitSnap = await tx.get(database.doc("settings/profitSplit"));
  const paidOrders = orders.docs
    .map((doc) => mapOrder(doc.id, doc.data()))
    .filter((order) => order.status === "lunas");
  const revenue =
    paidOrders.reduce((sum, order) => sum + order.grand, 0) +
    sales.docs.reduce((sum, doc) => sum + num(doc.data().total), 0);
  const cogs =
    paidOrders.reduce((sum, order) => sum + order.partsCost, 0) +
    sales.docs.reduce((sum, doc) => sum + num(doc.data().costTotal), 0);
  const cashOut = days.docs.reduce((sum, doc) => sum + num(doc.data().cashOut), 0);
  const partners = partnersFromRecord(splitSnap.data());
  const profit = revenue - cogs - cashOut;
  return { revenue, cogs, cashOut, profit, partners };
}

export async function previewMonth(month: string) {
  const database = store();
  const closed = await database.doc(`monthCloses/${month}`).get();
  if (closed.exists && closed.data()?.status === "closed") {
    const data = closed.data() ?? {};
    return {
      closed: true as const,
      revenue: num(data.revenue),
      cogs: num(data.cogs),
      cashOut: num(data.cashOut),
      profit: num(data.profit),
      shares: sharesFromClose(data),
      closedAt: text(data.closedAt),
    };
  }
  const figures = await database.runTransaction(async (tx) => monthFigures(tx, month));
  return {
    closed: false as const,
    revenue: figures.revenue,
    cogs: figures.cogs,
    cashOut: figures.cashOut,
    profit: figures.profit,
    shares: allocateShares(figures.profit, figures.partners),
    closedAt: null,
  };
}

export async function closeMonth(month: string, actor: ActivityActor) {
  const database = store();
  await runMutation(database, async (tx) => {
    await ensureOpen(tx, month);
    const figures = await monthFigures(tx, month);
    const message = splitError(figures.partners);
    if (message) throw new Error(message);
    const shares = allocateShares(figures.profit, figures.partners);
    tx.set(database.doc(`monthCloses/${month}`), {
      status: "closed",
      revenue: figures.revenue,
      cogs: figures.cogs,
      cashOut: figures.cashOut,
      profit: figures.profit,
      shares,
      closedAt: new Date().toISOString(),
    });
    queueActivity(tx, {
      actor,
      action: "buat",
      entity: "tutup-bulan",
      entityId: month,
      label: `Bulan ${month} ditutup`,
      changes: fieldChanges(
        {},
        {
          Omzet: rupiah(figures.revenue),
          "Harga pokok": rupiah(figures.cogs),
          "Pengeluaran kas": rupiah(figures.cashOut),
          Laba: rupiah(figures.profit),
          ...Object.fromEntries(
            labeledPartners(shares).map(({ label, row }) => [
              `Bagian ${label}`,
              `${rupiah(row.amount)} (${row.percent}%)`,
            ]),
          ),
        },
      ),
    });
  });
}

export async function todayBoard() {
  const day = jakartaDate();
  const database = store();
  const [ordersSnap, salesSnap, products, cashDay, splitSnap] = await Promise.all([
    database.collection("serviceOrders").where("paidDate", "==", day).get(),
    database.collection("walkInSales").where("businessDate", "==", day).get(),
    listProducts(),
    getCashDay(day),
    database.doc("settings/profitSplit").get(),
  ]);
  const orders = ordersSnap.docs
    .map((doc) => mapOrder(doc.id, doc.data()))
    .filter((order) => order.status === "lunas");
  const sales = salesSnap.docs.map((doc) => ({
    no: text(doc.data().no),
    total: num(doc.data().total),
    costTotal: num(doc.data().costTotal),
    lines: mapParts(doc.data().lines),
    createdAt: text(doc.data().createdAt),
  }));
  const revenue = orders.reduce((sum, order) => sum + order.grand, 0) + sales.reduce((sum, sale) => sum + sale.total, 0);
  const labor = orders.reduce((sum, order) => sum + order.laborCost, 0);
  const partQty =
    orders.reduce((sum, order) => sum + order.parts.reduce((partSum, part) => partSum + part.qty, 0), 0) +
    sales.reduce((sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.qty, 0), 0);
  const jobs = orders.filter((order) => order.laborCost > 0).length;
  const cogs =
    orders.reduce((sum, order) => sum + order.partsCost, 0) + sales.reduce((sum, sale) => sum + sale.costTotal, 0);
  const gross = revenue - cogs;
  const cashOut = cashDay?.cashOut ?? 0;
  const net = gross - cashOut;
  const shares = allocateShares(net, partnersFromRecord(splitSnap.data()));
  const lowStock = products.filter((product) => product.safetyStock > 0 && product.stock <= product.safetyStock);
  const movements = [
    ...orders.map((order) => ({
      title: order.no,
      note: `${order.customerName} · ${order.plate}`,
      amount: order.grand,
      at: order.createdAt,
    })),
    ...sales.map((sale) => ({
      title: sale.no,
      note: sale.lines.map((line) => line.name).join(", "),
      amount: sale.total,
      at: sale.createdAt,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return {
    day,
    revenue,
    labor,
    partQty,
    jobs,
    cogs,
    gross,
    cashOut,
    net,
    shares,
    updatedAt: new Date().toISOString(),
    lowStock,
    movements,
    hasActivity: orders.length + sales.length + products.length > 0,
  };
}
