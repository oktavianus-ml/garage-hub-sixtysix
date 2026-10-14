"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guard } from "@/lib/auth/guard";
import { isRole } from "@/lib/auth/roles";
import { bikeSelectionError } from "@/lib/data/bikes";
import { accountCodeError, isAccountKind } from "@/lib/data/account-types";
import { saveChartAccount, seedChartAccounts } from "@/lib/data/accounts";
import { saveBudget } from "@/lib/data/budget";
import { asInt, isBusinessDay } from "@/lib/data/format";
import { parsePayMethod } from "@/lib/data/payment";
import { isSupplyUnit } from "@/lib/data/supply";
import { isPaperWidth, isReceiptLogo } from "@/lib/data/receipt-options";
import { saveWorkshopSettings } from "@/lib/data/settings";
import {
  closeMonth,
  createStaff,
  updateStaff,
  saveCashDay,
  saveCustomer,
  saveDistributor,
  saveProduct,
  saveSafetyStock,
  saveProfitSplit,
  savePurchase,
  saveProcurement,
  saveSupplyItem,
  placeProcurement,
  receiveProcurement,
  cancelProcurement,
  placePurchase,
  receivePurchase,
  cancelPurchase,
  saveServiceOrder,
  saveVehicle,
  saveWalkInSale,
  saveCustomerPayment,
  type SpkStatus,
} from "@/lib/data/records";

export type FormState = { message: string; ok?: boolean } | null;

function fail(error: unknown): FormState {
  const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
  if (code === "auth/email-already-exists") return { message: "Email ini sudah dipakai." };
  const raw = error instanceof Error ? error.message : "";
  if (code === "auth/configuration-not-found" || raw.includes("no configuration corresponding")) {
    return {
      message:
        "Login email belum dinyalakan. Di Firebase buka Authentication, klik Get started, lalu nyalakan Email/Password.",
    };
  }
  return { message: error instanceof Error ? error.message : "Gagal menyimpan." };
}

export async function saveCustomerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pelanggan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (name.length < 2) return { message: "Isi nama pelanggan." };
  let id = "";
  try {
    id = await saveCustomer(
      {
        id: String(formData.get("id") ?? "") || undefined,
        name,
        phone,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  if (String(formData.get("id") ?? "")) redirect(`/pelanggan?pelanggan=${encodeURIComponent(id)}`);
  redirect(`/pelanggan?pelanggan=${encodeURIComponent(id)}&baru=motor`);
}

export async function saveVehicleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pelanggan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const year = asInt(formData.get("year"));
  const plate = String(formData.get("plate") ?? "").trim();
  const brand = String(formData.get("brand") ?? "").trim();
  const bikeType = String(formData.get("bikeType") ?? "").trim();
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId || !plate || !brand || !bikeType || year === null) {
    return { message: "Lengkapi plat, merk, tipe, dan tahun." };
  }
  const bikeError = bikeSelectionError(brand, bikeType, year);
  if (bikeError) return { message: bikeError };
  try {
    await saveVehicle(
      {
        id: String(formData.get("id") ?? "") || undefined,
        customerId,
        plate,
        brand,
        bikeType,
        year,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/pelanggan?pelanggan=${encodeURIComponent(customerId)}`);
}

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/produk");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const cost = asInt(formData.get("cost"));
  const price = asInt(formData.get("price"));
  if (!code || !name || cost === null || price === null) {
    return { message: "Lengkapi kode produk, nama, harga pokok, dan harga jual." };
  }
  try {
    await saveProduct(
      {
        id: String(formData.get("id") ?? "") || undefined,
        code,
        name,
        unit: String(formData.get("unit") ?? "pcs").trim() || "pcs",
        cost,
        price,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/produk");
}

export async function saveSafetyStockAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/inventori");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "").trim();
  const safetyStock = asInt(formData.get("safetyStock"));
  if (!id || safetyStock === null || safetyStock > 100000) {
    return { message: "Isi batas aman dari 0 sampai 100.000." };
  }
  try {
    const changed = await saveSafetyStock(id, safetyStock, access.user);
    if (!changed) return { message: "Tidak ada yang berubah.", ok: true };
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/inventori");
  revalidatePath("/");
  return { message: "Batas aman tersimpan.", ok: true };
}

export async function saveDistributorAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/distributor");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const name = String(formData.get("name") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (name.length < 2 || name.length > 80) return { message: "Isi nama distributor." };
  if (contact.length > 80 || phone.length > 30 || address.length > 200 || note.length > 200) {
    return { message: "Ada isian yang terlalu panjang." };
  }
  try {
    await saveDistributor(
      {
        id: String(formData.get("id") ?? "") || undefined,
        name,
        contact,
        phone,
        address,
        note,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/distributor");
}

function wholeNumber(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number);
}

function readPurchaseLines(raw: FormDataEntryValue | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { message: "Daftar barang tidak valid." } satisfies FormState;
  }
  if (!Array.isArray(parsed)) return { message: "Daftar barang tidak valid." } satisfies FormState;
  const lines: { productId: string; qty: number; cost: number }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId : "";
    const qty = wholeNumber(row.qty);
    const cost = wholeNumber(row.cost);
    if (!productId || qty === null || qty <= 0 || qty > 100000) {
      return { message: "Jumlah barang harus lebih dari nol." } satisfies FormState;
    }
    if (cost === null || cost < 0 || cost > 1_000_000_000) {
      return { message: "Harga beli tidak valid." } satisfies FormState;
    }
    lines.push({ productId, qty, cost });
  }
  if (lines.length === 0) return { message: "Tambah barang yang dibeli." } satisfies FormState;
  return lines;
}

function readReceiveLines(raw: FormDataEntryValue | null, allowEmpty = false) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { message: "Daftar barang tidak valid." } satisfies FormState;
  }
  if (!Array.isArray(parsed)) return { message: "Daftar barang tidak valid." } satisfies FormState;
  const lines: { productId: string; qty: number }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const productId = typeof row.productId === "string" ? row.productId : "";
    const qty = wholeNumber(row.qty);
    if (!productId || qty === null || qty < 0 || qty > 100000) {
      return { message: "Jumlah barang yang datang tidak valid." } satisfies FormState;
    }
    if (qty > 0) lines.push({ productId, qty });
  }
  if (lines.length === 0 && !allowEmpty) return { message: "Isi jumlah barang yang datang." } satisfies FormState;
  return lines;
}

function procurementPath(formData: FormData) {
  const stage = String(formData.get("stage") ?? "permintaan");
  if (stage === "permintaan" || stage === "persetujuan" || stage === "penerimaan") {
    return `/pengadaan/${stage}`;
  }
  return "/pengadaan/permintaan";
}

function readSupplyLines(raw: FormDataEntryValue | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { message: "Daftar barang tidak valid." } satisfies FormState;
  }
  if (!Array.isArray(parsed)) return { message: "Daftar barang tidak valid." } satisfies FormState;
  const lines: { itemId: string; qty: number; cost: number }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const itemId = typeof row.itemId === "string" ? row.itemId : "";
    const qty = wholeNumber(row.qty);
    const cost = wholeNumber(row.cost);
    if (!itemId || qty === null || qty <= 0 || qty > 100000) {
      return { message: "Jumlah barang harus lebih dari nol." } satisfies FormState;
    }
    if (cost === null || cost < 0 || cost > 1_000_000_000) {
      return { message: "Harga beli tidak valid." } satisfies FormState;
    }
    lines.push({ itemId, qty, cost });
  }
  if (lines.length === 0) return { message: "Tambah barang yang dibeli." } satisfies FormState;
  return lines;
}

function readSupplyReceiveLines(raw: FormDataEntryValue | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { message: "Daftar barang tidak valid." } satisfies FormState;
  }
  if (!Array.isArray(parsed)) return { message: "Daftar barang tidak valid." } satisfies FormState;
  const lines: { itemId: string; qty: number }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const itemId = typeof row.itemId === "string" ? row.itemId : "";
    const qty = wholeNumber(row.qty);
    if (!itemId || qty === null || qty < 0 || qty > 100000) {
      return { message: "Jumlah barang yang datang tidak valid." } satisfies FormState;
    }
    if (qty > 0) lines.push({ itemId, qty });
  }
  if (lines.length === 0) return { message: "Isi jumlah barang yang datang." } satisfies FormState;
  return lines;
}

export async function saveSupplyItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pengadaan/barang");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const name = String(formData.get("name") ?? "").trim();
  const unit = String(formData.get("unit") ?? "").trim();
  const cost = asInt(formData.get("cost"));
  if (name.length < 2 || name.length > 80) return { message: "Isi nama barang." };
  if (!isSupplyUnit(unit)) return { message: "Pilih satuan barang." };
  if (cost === null || cost > 1_000_000_000) return { message: "Harga beli tidak valid." };
  try {
    await saveSupplyItem(
      { id: String(formData.get("id") ?? "") || undefined, name, unit, cost },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/pengadaan/barang");
}

export async function saveProcurementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pengadaan/permintaan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const vendor = String(formData.get("vendor") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  if (vendor.length < 2 || vendor.length > 80) return { message: "Isi nama toko." };
  if (note.length > 200) return { message: "Catatan terlalu panjang." };
  const lines = readSupplyLines(formData.get("lines"));
  if (!Array.isArray(lines)) return lines;
  try {
    await saveProcurement(
      {
        id: String(formData.get("id") ?? "") || undefined,
        vendor,
        note,
        lines,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/pengadaan/permintaan");
}

export async function placeProcurementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pengadaan/persetujuan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Pilih permintaan." };
  try {
    await placeProcurement(id, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect(procurementPath(formData));
}

export async function receiveProcurementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pengadaan/penerimaan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Pilih pesanan." };
  const lines = readSupplyReceiveLines(formData.get("lines"));
  if (!Array.isArray(lines)) return lines;
  try {
    await receiveProcurement(id, lines, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect(procurementPath(formData));
}

export async function cancelProcurementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pengadaan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Pilih pengadaan." };
  try {
    await cancelProcurement(id, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect(procurementPath(formData));
}

export async function savePurchaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pembelian");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const distributorId = String(formData.get("distributorId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!distributorId) return { message: "Pilih distributor." };
  if (note.length > 200) return { message: "Catatan terlalu panjang." };
  const lines = readPurchaseLines(formData.get("lines"));
  if (!Array.isArray(lines)) return lines;
  try {
    await savePurchase(
      {
        id: String(formData.get("id") ?? "") || undefined,
        distributorId,
        note,
        lines,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/pembelian");
}

export async function placePurchaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pembelian");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Pilih permintaan." };
  try {
    await placePurchase(id, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect("/pembelian");
}

export async function receivePurchaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pembelian");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Pilih pesanan." };
  const closeShort = formData.get("closeShort") === "1";
  const lines = readReceiveLines(formData.get("lines"), closeShort);
  if (!Array.isArray(lines)) return lines;
  try {
    await receivePurchase(id, lines, access.user, { closeShort });
  } catch (error) {
    return fail(error);
  }
  redirect("/pembelian");
}

export async function cancelPurchaseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pembelian");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "");
  if (!id) return { message: "Pilih pembelian." };
  try {
    await cancelPurchase(id, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect("/pembelian");
}

export async function saveStaffAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pegawai");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  if (name.length < 2 || !email.includes("@") || !isRole(role)) {
    return { message: "Isi nama, email, dan peran." };
  }
  if ((!id && password.length < 8) || (password.length > 0 && password.length < 8)) {
    return { message: "Kata sandi minimal 8 karakter." };
  }
  try {
    if (id) {
      await updateStaff({ id, name, email, password: password || undefined, role }, access.user);
    } else {
      await createStaff({ name, email, password, role }, access.user);
    }
  } catch (error) {
    return fail(error);
  }
  redirect("/pegawai");
}

export async function saveServiceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/service");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const laborCost = asInt(formData.get("laborCost"));
  const status = String(formData.get("status") ?? "") as SpkStatus;
  let parts: { productId: string; qty: number }[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("parts") ?? "[]")) as { productId: string; qty: number }[];
    parts = Array.isArray(parsed) ? parsed : [];
  } catch {
    return { message: "Daftar part tidak valid." };
  }
  if (laborCost === null) return { message: "Isi ongkos jasa." };
  const complaint = String(formData.get("complaint") ?? "").trim();
  if (!complaint) return { message: "Pilih pekerjaan atau isi lain-lain." };
  try {
    await saveServiceOrder(
      {
        id: String(formData.get("id") ?? "") || undefined,
        customerId: String(formData.get("customerId") ?? ""),
        vehicleId: String(formData.get("vehicleId") ?? ""),
        complaint,
        mechanicId: String(formData.get("mechanicId") ?? ""),
        laborCost,
        parts,
        status,
        payMethod: parsePayMethod(formData.get("payMethod")),
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/service");
}

export async function saveSaleAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/kasir");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  let lines: { productId: string; qty: number }[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("lines") ?? "[]")) as { productId: string; qty: number }[];
    lines = Array.isArray(parsed) ? parsed : [];
  } catch {
    return { message: "Daftar barang tidak valid." };
  }
  try {
    await saveWalkInSale({ lines, payMethod: parsePayMethod(formData.get("payMethod")) }, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect("/kasir");
}

export async function saveCustomerPaymentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pembayaran/catat");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const day = String(formData.get("day") ?? "");
  const customerId = String(formData.get("customerId") ?? "");
  const payMethod = parsePayMethod(formData.get("payMethod"));
  const amount = asInt(formData.get("amount"));
  if (!isBusinessDay(day)) return { message: "Tanggal tidak valid." };
  if (!customerId || !payMethod || amount === null || amount <= 0) {
    return { message: "Pilih pelanggan, tempat uang, dan jumlah." };
  }
  try {
    await saveCustomerPayment(
      {
        day,
        customerId,
        payMethod,
        amount,
        note: String(formData.get("note") ?? "").trim(),
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/pembayaran/catat?hari=${day}`);
}

function optionalMoney(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const number = asInt(value);
  return number === null ? ("bad" as const) : number;
}

export async function saveCashAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/kas");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const day = String(formData.get("day") ?? "");
  if (!isBusinessDay(day)) return { message: "Tanggal tidak valid." };
  const cashOutField = optionalMoney(formData.get("cashOut"));
  const counted = asInt(formData.get("counted"));
  const qrisReceived = optionalMoney(formData.get("qrisReceived"));
  const bankReceived = optionalMoney(formData.get("bankReceived"));
  if (cashOutField === "bad" || counted === null || qrisReceived === "bad" || bankReceived === "bad") {
    return { message: "Isi tunai di laci. Kolom lain boleh kosong, atau diisi angka." };
  }
  const cashOut = cashOutField ?? 0;
  try {
    await saveCashDay(
      {
        day,
        cashOut,
        counted,
        qrisReceived,
        bankReceived,
        note: String(formData.get("note") ?? "").trim(),
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/kas?hari=${day}`);
}

export async function saveSplitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/bagi-hasil");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const ids = formData.getAll("partnerId");
  const percents = formData.getAll("partnerPercent");
  if (ids.length === 0 || ids.length !== percents.length) {
    return { message: "Data orang tidak lengkap." };
  }
  const partners = ids.map((id, index) => {
    const raw = String(percents[index] ?? "").trim();
    const percent = /^\d+$/.test(raw) ? Number(raw) : Number.NaN;
    return { id: String(id), name: "", percent };
  });
  try {
    await saveProfitSplit({ partners }, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect(`/bagi-hasil?bulan=${String(formData.get("month") ?? "")}`);
}

export async function closeMonthAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/bagi-hasil");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { message: "Pilih bulan." };
  try {
    await closeMonth(month, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect(`/bagi-hasil?bulan=${month}`);
}

export async function saveBudgetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/audit");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { message: "Pilih bulan." };
  const pembelian = asInt(formData.get("pembelian"));
  const pengadaan = asInt(formData.get("pengadaan"));
  const kas = asInt(formData.get("kas"));
  if (pembelian === null || pengadaan === null || kas === null) {
    return { message: "Isi anggaran pembelian, pengadaan, dan pengeluaran kas." };
  }
  try {
    await saveBudget(
      {
        month,
        plan: { pembelian, pengadaan, kas },
        note: String(formData.get("note") ?? "").trim(),
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect(`/audit?bulan=${month}`);
}

export async function saveAccountAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/akun");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const active = String(formData.get("active") ?? "") !== "0";
  const codeError = accountCodeError(code);
  if (codeError) return { message: codeError };
  if (name.length < 2 || name.length > 80) return { message: "Isi nama akun." };
  if (!isAccountKind(kind)) return { message: "Pilih jenis akun." };
  if (note.length > 160) return { message: "Catatan terlalu panjang." };
  try {
    await saveChartAccount(
      {
        id: String(formData.get("id") ?? "") || undefined,
        code,
        name,
        kind,
        note,
        active,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/akun");
}

export async function saveWorkshopSettingsAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const access = await guard("/pengaturan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const receiptFooter = String(formData.get("receiptFooter") ?? "").trim();
  const paper = String(formData.get("paper") ?? "");
  const logo = String(formData.get("logo") ?? "");
  if (name.length < 2 || name.length > 80) return { message: "Isi nama bengkel." };
  if (phone.length > 30) return { message: "Telepon terlalu panjang." };
  if (address.length > 200) return { message: "Alamat terlalu panjang." };
  if (receiptFooter.length > 160) return { message: "Catatan struk terlalu panjang." };
  if (!isPaperWidth(paper)) return { message: "Pilih lebar kertas struk." };
  if (!isReceiptLogo(logo)) return { message: "Pilih logo struk." };
  try {
    const changed = await saveWorkshopSettings(
      {
        name,
        phone,
        address,
        receiptFooter,
        showPhone: formData.get("showPhone") === "1",
        showAddress: formData.get("showAddress") === "1",
        showLabor: formData.get("showLabor") === "1",
        paper,
        logo,
      },
      access.user,
    );
    if (!changed) return { message: "Tidak ada yang berubah.", ok: true };
  } catch (error) {
    return fail(error);
  }
  revalidatePath("/pengaturan");
  return { message: "Pengaturan tersimpan.", ok: true };
}

export async function seedAccountsAction(_prev: FormState, _formData: FormData): Promise<FormState> {
  const access = await guard("/akun");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  try {
    await seedChartAccounts(access.user);
  } catch (error) {
    return fail(error);
  }
  redirect("/akun");
}
