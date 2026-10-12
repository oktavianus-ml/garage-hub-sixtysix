import type { Transaction } from "firebase-admin/firestore";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import type { Role } from "@/lib/auth/roles";
import { canMarkPaid } from "@/lib/auth/access";
import { jakartaDate, monthKeyOf } from "@/lib/data/format";
import { heldQty, holdDelta, type HeldPart } from "@/lib/data/stock";

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
  monthKey: string;
  createdAt: string;
};

export type CashDay = {
  id: string;
  cashOut: number;
  counted: number | null;
  note: string;
  closedAt: string | null;
  monthKey: string;
};

export type MonthClose = {
  id: string;
  revenue: number;
  cogs: number;
  cashOut: number;
  profit: number;
  ownerPercent: number;
  investorPercent: number;
  ownerShare: number;
  investorShare: number;
  closedAt: string;
};

export type ProfitSplit = { ownerPercent: number; investorPercent: number };

const SPK_STATUSES: SpkStatus[] = ["antri", "dikerjakan", "selesai", "lunas", "batal"];

function store() {
  return getAdminFirestore();
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : Number(value) || 0;
}

async function ensureOpen(tx: Transaction, month: string) {
  const snap = await tx.get(store().doc(`monthCloses/${month}`));
  if (snap.exists && snap.data()?.status === "closed") {
    throw new Error("Bulan ini sudah ditutup.");
  }
}

async function takeNumber(tx: Transaction, prefix: "SPK" | "KSR") {
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
    monthKey: data.monthKey ? text(data.monthKey) : null,
    createdAt: text(data.createdAt),
  };
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

export async function saveCustomer(input: { id?: string; name: string; phone: string }) {
  const ref = input.id
    ? store().collection("customers").doc(input.id)
    : store().collection("customers").doc();
  await ref.set({ name: input.name, phone: input.phone }, { merge: true });
  return ref.id;
}

export async function saveVehicle(input: {
  id?: string;
  customerId: string;
  plate: string;
  brand: string;
  bikeType: string;
  year: number;
}) {
  const customer = await store().collection("customers").doc(input.customerId).get();
  if (!customer.exists) throw new Error("Pelanggan tidak ditemukan.");
  const ref = input.id
    ? store().collection("vehicles").doc(input.id)
    : store().collection("vehicles").doc();
  await ref.set(
    {
      customerId: input.customerId,
      plate: input.plate.toUpperCase(),
      brand: input.brand,
      bikeType: input.bikeType,
      year: input.year,
    },
    { merge: true },
  );
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
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}

export async function saveProduct(input: {
  id?: string;
  code: string;
  name: string;
  unit: string;
  cost: number;
  price: number;
  stock: number;
  safetyStock: number;
}) {
  const code = input.code.trim().toUpperCase();
  if (!code) throw new Error("Isi kode produk.");
  const ref = input.id
    ? store().collection("products").doc(input.id)
    : store().collection("products").doc();
  const taken = await store().collection("products").where("code", "==", code).limit(1).get();
  if (!taken.empty && taken.docs[0]?.id !== ref.id) {
    throw new Error("Kode produk sudah dipakai.");
  }
  await ref.set(
    {
      code,
      name: input.name,
      unit: input.unit || "pcs",
      cost: input.cost,
      price: input.price,
      stock: input.stock,
      safetyStock: input.safetyStock,
    },
    { merge: true },
  );
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

export async function createStaff(input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) {
  const created = await getAdminAuth().createUser({
    email: input.email,
    password: input.password,
    displayName: input.name,
  });
  await store().collection("users").doc(created.uid).set({
    name: input.name,
    email: input.email,
    role: input.role,
    active: true,
  });
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
  },
  role: Role,
) {
  if (!SPK_STATUSES.includes(input.status)) throw new Error("Status tidak dikenal.");
  if ((input.status === "lunas" || input.status === "batal") && !canMarkPaid(role)) {
    throw new Error("Hanya kasir atau pemilik yang menandai lunas dan batal.");
  }
  if (role === "mekanik" && !["antri", "dikerjakan", "selesai"].includes(input.status)) {
    throw new Error("Mekanik mengubah status sampai selesai.");
  }

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

  await database.runTransaction(async (tx) => {
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
    writeStock(tx, productSnaps, holdDelta(before, after));
    const partsSell = parts.reduce((sum, part) => sum + part.qty * part.price, 0);
    const partsCost = parts.reduce((sum, part) => sum + part.qty * part.cost, 0);
    const vehicleData = vehicle.data() ?? {};

    tx.set(ref, {
      no,
      customerId: input.customerId,
      customerName: text(customer.data()?.name),
      vehicleId: input.vehicleId,
      plate: text(vehicleData.plate),
      brand: text(vehicleData.brand),
      bikeType: text(vehicleData.bikeType),
      year: num(vehicleData.year),
      complaint: input.complaint,
      mechanicId: input.mechanicId,
      mechanicName: text(mechanic.data()?.name),
      laborCost: input.laborCost,
      parts,
      status: input.status,
      partsSell,
      partsCost,
      grand: partsSell + input.laborCost,
      paidDate,
      monthKey: paidDate ? monthKeyOf(paidDate) : null,
      createdAt: existing?.createdAt || new Date().toISOString(),
    });
  });
}

export async function listSales() {
  const snap = await store().collection("walkInSales").get();
  return snap.docs
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        no: text(data.no),
        cashierName: text(data.cashierName),
        lines: mapParts(data.lines),
        total: num(data.total),
        costTotal: num(data.costTotal),
        businessDate: text(data.businessDate),
        monthKey: text(data.monthKey),
        createdAt: text(data.createdAt),
      } satisfies WalkInSale;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function saveWalkInSale(
  input: { lines: { productId: string; qty: number }[] },
  cashierName: string,
) {
  if (input.lines.length === 0) throw new Error("Pilih barang yang dijual.");
  const qtyByProduct = new Map<string, number>();
  for (const line of input.lines) {
    if (!line.productId || line.qty <= 0) throw new Error("Jumlah barang harus lebih dari nol.");
    qtyByProduct.set(line.productId, (qtyByProduct.get(line.productId) ?? 0) + line.qty);
  }
  const day = jakartaDate();
  const month = monthKeyOf(day);
  const database = store();

  await database.runTransaction(async (tx) => {
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
    writeStock(tx, snaps, holdDelta(new Map(), heldQty(lines, "lunas")));
    const total = lines.reduce((sum, line) => sum + line.qty * line.price, 0);
    const costTotal = lines.reduce((sum, line) => sum + line.qty * line.cost, 0);
    tx.set(database.collection("walkInSales").doc(), {
      no,
      cashierName,
      lines,
      total,
      costTotal,
      businessDate: day,
      monthKey: month,
      createdAt: new Date().toISOString(),
    });
  });
}

export async function cashInFor(day: string) {
  const database = store();
  const [orders, sales] = await Promise.all([
    database.collection("serviceOrders").where("paidDate", "==", day).get(),
    database.collection("walkInSales").where("businessDate", "==", day).get(),
  ]);
  const spk = orders.docs
    .map((doc) => mapOrder(doc.id, doc.data()))
    .filter((order) => order.status === "lunas")
    .reduce((sum, order) => sum + order.grand, 0);
  const walkIn = sales.docs.reduce((sum, doc) => sum + num(doc.data().total), 0);
  return spk + walkIn;
}

export async function getCashDay(day: string): Promise<CashDay | null> {
  const snap = await store().collection("cashDays").doc(day).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    cashOut: num(data.cashOut),
    counted: data.counted === undefined || data.counted === null ? null : num(data.counted),
    note: text(data.note),
    closedAt: data.closedAt ? text(data.closedAt) : null,
    monthKey: text(data.monthKey),
  };
}

export async function saveCashDay(input: {
  day: string;
  cashOut: number;
  counted: number;
  note: string;
}) {
  const month = monthKeyOf(input.day);
  const database = store();
  await database.runTransaction(async (tx) => {
    await ensureOpen(tx, month);
    tx.set(database.collection("cashDays").doc(input.day), {
      cashOut: input.cashOut,
      counted: input.counted,
      note: input.note,
      closedAt: new Date().toISOString(),
      monthKey: month,
    });
  });
}

export async function getProfitSplit(): Promise<ProfitSplit> {
  const snap = await store().doc("settings/profitSplit").get();
  return {
    ownerPercent: snap.exists ? num(snap.data()?.ownerPercent) : 50,
    investorPercent: snap.exists ? num(snap.data()?.investorPercent) : 50,
  };
}

export async function saveProfitSplit(split: ProfitSplit) {
  if (split.ownerPercent + split.investorPercent !== 100) {
    throw new Error("Persentase pemilik dan investor harus 100.");
  }
  await store().doc("settings/profitSplit").set(split);
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
  const ownerPercent = splitSnap.exists ? num(splitSnap.data()?.ownerPercent) : 50;
  const investorPercent = splitSnap.exists ? num(splitSnap.data()?.investorPercent) : 50;
  const profit = revenue - cogs - cashOut;
  return { revenue, cogs, cashOut, profit, ownerPercent, investorPercent };
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
      ownerPercent: num(data.ownerPercent),
      investorPercent: num(data.investorPercent),
      ownerShare: num(data.ownerShare),
      investorShare: num(data.investorShare),
      closedAt: text(data.closedAt),
    };
  }
  const figures = await database.runTransaction(async (tx) => monthFigures(tx, month));
  return {
    closed: false as const,
    ...figures,
    ownerShare: Math.round((figures.profit * figures.ownerPercent) / 100),
    investorShare: Math.round((figures.profit * figures.investorPercent) / 100),
    closedAt: null,
  };
}

export async function closeMonth(month: string) {
  const database = store();
  await database.runTransaction(async (tx) => {
    await ensureOpen(tx, month);
    const figures = await monthFigures(tx, month);
    if (figures.ownerPercent + figures.investorPercent !== 100) {
      throw new Error("Atur persentase pemilik dan investor dulu.");
    }
    const profit = figures.profit;
    tx.set(database.doc(`monthCloses/${month}`), {
      status: "closed",
      ...figures,
      ownerShare: Math.round((profit * figures.ownerPercent) / 100),
      investorShare: Math.round((profit * figures.investorPercent) / 100),
      closedAt: new Date().toISOString(),
    });
  });
}

export async function todayBoard() {
  const day = jakartaDate();
  const database = store();
  const [ordersSnap, salesSnap, products] = await Promise.all([
    database.collection("serviceOrders").where("paidDate", "==", day).get(),
    database.collection("walkInSales").where("businessDate", "==", day).get(),
    listProducts(),
  ]);
  const orders = ordersSnap.docs
    .map((doc) => mapOrder(doc.id, doc.data()))
    .filter((order) => order.status === "lunas");
  const sales = salesSnap.docs.map((doc) => ({
    no: text(doc.data().no),
    total: num(doc.data().total),
    lines: mapParts(doc.data().lines),
    createdAt: text(doc.data().createdAt),
  }));
  const revenue = orders.reduce((sum, order) => sum + order.grand, 0) + sales.reduce((sum, sale) => sum + sale.total, 0);
  const partQty =
    orders.reduce((sum, order) => sum + order.parts.reduce((partSum, part) => partSum + part.qty, 0), 0) +
    sales.reduce((sum, sale) => sum + sale.lines.reduce((lineSum, line) => lineSum + line.qty, 0), 0);
  const jobs = orders.filter((order) => order.laborCost > 0).length;
  const gross =
    orders.reduce((sum, order) => sum + (order.grand - order.partsCost), 0) +
    sales.reduce((sum, sale) => sum + (sale.total - sale.lines.reduce((lineSum, line) => lineSum + line.qty * line.cost, 0)), 0);
  const lowStock = products.filter((product) => product.stock <= product.safetyStock);
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
    partQty,
    jobs,
    gross,
    lowStock,
    movements,
    hasActivity: orders.length + sales.length + products.length > 0,
  };
}
