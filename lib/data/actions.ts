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
  saveProduct,
  saveProfitSplit,
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
    id = await saveCustomer({
      id: String(formData.get("id") ?? "") || undefined,
      name,
      phone,
    });
  } catch (error) {
    return fail(error);
  }
  redirect(`/pelanggan?pelanggan=${encodeURIComponent(id)}`);
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
    await saveVehicle({
      id: String(formData.get("id") ?? "") || undefined,
      customerId,
      plate,
      brand,
      bikeType,
      year,
    });
  } catch (error) {
    return fail(error);
  }
  redirect("/pelanggan");
}

export async function saveProductAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const access = await guard("/produk");
  if (!access.canWrite) return { message: "Akun ini hanya bisa melihat." };
  const code = String(formData.get("code") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const cost = asInt(formData.get("cost"));
  const price = asInt(formData.get("price"));
  const stock = asInt(formData.get("stock"));
  const safetyStock = asInt(formData.get("safetyStock"));
  if (!code || !name || cost === null || price === null || stock === null || safetyStock === null) {
    return { message: "Lengkapi kode produk, nama, harga pokok, harga jual, stok, dan batas aman." };
  }
  try {
    await saveProduct({
      id: String(formData.get("id") ?? "") || undefined,
      code,
      name,
      unit: String(formData.get("unit") ?? "pcs").trim() || "pcs",
      cost,
      price,
      stock,
      safetyStock,
    });
  } catch (error) {
    return fail(error);
  }
  redirect("/produk");
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
    await createStaff({ name, email, password, role });
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
      access.user.role,
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
    await saveWalkInSale({ lines }, access.user.name);
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
    await saveCashDay({
      day: jakartaDate(),
      cashOut,
      counted,
      note: String(formData.get("note") ?? "").trim(),
    });
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
    await saveProfitSplit({ ownerPercent, investorPercent });
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
    await closeMonth(month);
  } catch (error) {
    return fail(error);
  }
  redirect(`/bagi-hasil?bulan=${month}`);
}
