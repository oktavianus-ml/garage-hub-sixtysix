"use server";

import { redirect } from "next/navigation";
import { guard } from "@/lib/auth/guard";
import { isRole } from "@/lib/auth/roles";
import { bikeSelectionError } from "@/lib/data/bikes";
import { asInt, jakartaDate } from "@/lib/data/format";
import {
  closeMonth,
  createStaff,
  saveCashDay,
  saveCustomer,
  saveDistributor,
  saveProduct,
  saveProfitSplit,
  savePurchase,
  saveProcurement,
  placePurchase,
  receivePurchase,
  cancelPurchase,
  saveServiceOrder,
  saveVehicle,
  saveWalkInSale,
  type SpkStatus,
} from "@/lib/data/records";

export type FormState = { message: string } | null;

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
  if (String(formData.get("id") ?? "")) redirect("/pelanggan/daftar");
  redirect(`/pelanggan/motor?pelanggan=${encodeURIComponent(id)}`);
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
  redirect("/pelanggan/daftar");
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

function readReceiveLines(raw: FormDataEntryValue | null) {
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
  if (lines.length === 0) return { message: "Isi jumlah barang yang datang." } satisfies FormState;
  return lines;
}

function readProcurementLines(raw: FormDataEntryValue | null) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw ?? "[]"));
  } catch {
    return { message: "Daftar barang tidak valid." } satisfies FormState;
  }
  if (!Array.isArray(parsed)) return { message: "Daftar barang tidak valid." } satisfies FormState;
  const lines: { name: string; unit: string; qty: number; cost: number }[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const unit = typeof row.unit === "string" ? row.unit.trim() : "";
    const qty = wholeNumber(row.qty);
    const cost = wholeNumber(row.cost);
    if (!name && (qty === null || qty === 0) && (cost === null || cost === 0)) continue;
    if (name.length < 2 || name.length > 80) return { message: "Isi nama barang." } satisfies FormState;
    if (unit.length > 20) return { message: "Satuan terlalu panjang." } satisfies FormState;
    if (qty === null || qty <= 0 || qty > 100000) {
      return { message: "Jumlah barang harus lebih dari nol." } satisfies FormState;
    }
    if (cost === null || cost < 0 || cost > 1_000_000_000) {
      return { message: "Harga beli tidak valid." } satisfies FormState;
    }
    lines.push({ name, unit: unit || "pcs", qty, cost });
  }
  if (lines.length === 0 || lines.length > 40) return { message: "Tambah barang yang dibeli." } satisfies FormState;
  return lines;
}

export async function saveProcurementAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/pengadaan");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const vendor = String(formData.get("vendor") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const boughtOn = String(formData.get("boughtOn") ?? "");
  if (vendor.length < 2 || vendor.length > 80) return { message: "Isi nama toko." };
  if (note.length > 200) return { message: "Catatan terlalu panjang." };
  const lines = readProcurementLines(formData.get("lines"));
  if (!Array.isArray(lines)) return lines;
  try {
    await saveProcurement(
      {
        id: String(formData.get("id") ?? "") || undefined,
        vendor,
        note,
        boughtOn,
        lines,
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/pengadaan");
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
  const lines = readReceiveLines(formData.get("lines"));
  if (!Array.isArray(lines)) return lines;
  try {
    await receivePurchase(id, lines, access.user);
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
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");
  if (name.length < 2 || !email.includes("@") || password.length < 8 || !isRole(role)) {
    return { message: "Isi nama, email, kata sandi minimal 8 karakter, dan peran." };
  }
  try {
    await createStaff({ name, email, password, role }, access.user);
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
  try {
    await saveServiceOrder(
      {
        id: String(formData.get("id") ?? "") || undefined,
        customerId: String(formData.get("customerId") ?? ""),
        vehicleId: String(formData.get("vehicleId") ?? ""),
        complaint: String(formData.get("complaint") ?? "").trim(),
        mechanicId: String(formData.get("mechanicId") ?? ""),
        laborCost,
        parts,
        status,
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
    await saveWalkInSale({ lines }, access.user);
  } catch (error) {
    return fail(error);
  }
  redirect("/kasir");
}

export async function saveCashAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/kas");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const cashOut = asInt(formData.get("cashOut"));
  const counted = asInt(formData.get("counted"));
  if (cashOut === null || counted === null) return { message: "Isi pengeluaran kas dan uang yang dihitung." };
  try {
    await saveCashDay(
      {
        day: jakartaDate(),
        cashOut,
        counted,
        note: String(formData.get("note") ?? "").trim(),
      },
      access.user,
    );
  } catch (error) {
    return fail(error);
  }
  redirect("/kas");
}

export async function saveSplitAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/bagi-hasil");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const ownerPercent = asInt(formData.get("ownerPercent"));
  const investorPercent = asInt(formData.get("investorPercent"));
  if (ownerPercent === null || investorPercent === null) {
    return { message: "Isi persentase pemilik dan investor." };
  }
  try {
    await saveProfitSplit({ ownerPercent, investorPercent }, access.user);
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
