import { fieldChanges, queueActivity, type ActivityActor } from "@/lib/data/activity";
import { getAdminFirestore } from "@/lib/firebase/admin";
import {
  defaultReceiptLogo,
  isPaperWidth,
  isReceiptLogo,
  paperWidthLabel,
  receiptLogoLabel,
  type PaperWidth,
  type ReceiptLogo,
} from "@/lib/data/receipt-options";

export type { PaperWidth, ReceiptLogo };

export type WorkshopSettings = {
  name: string;
  phone: string;
  address: string;
  receiptFooter: string;
  showPhone: boolean;
  showAddress: boolean;
  showLabor: boolean;
  paper: PaperWidth;
  logo: ReceiptLogo;
};

export const defaultWorkshopSettings: WorkshopSettings = {
  name: "",
  phone: "",
  address: "",
  receiptFooter: "Terima kasih. Simpan struk ini.",
  showPhone: true,
  showAddress: true,
  showLabor: false,
  paper: "58",
  logo: defaultReceiptLogo,
};

const DOC = "settings/workshop";

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function flag(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export function mapWorkshopSettings(data: FirebaseFirestore.DocumentData | undefined): WorkshopSettings {
  const paper = text(data?.paper);
  const logo = text(data?.logo);
  return {
    name: text(data?.name),
    phone: text(data?.phone),
    address: text(data?.address),
    receiptFooter: text(data?.receiptFooter, defaultWorkshopSettings.receiptFooter),
    showPhone: flag(data?.showPhone, true),
    showAddress: flag(data?.showAddress, true),
    showLabor: flag(data?.showLabor, false),
    paper: isPaperWidth(paper) ? paper : "58",
    logo: isReceiptLogo(logo) ? logo : defaultReceiptLogo,
  };
}

export type WorkshopBrand = {
  name: string;
  address: string;
  phone: string;
};

export function workshopBrand(settings: WorkshopSettings): WorkshopBrand {
  return {
    name: settings.name.trim() || "GarageHub",
    address: settings.address.trim(),
    phone: settings.phone.trim(),
  };
}

export async function getWorkshopSettings() {
  const snap = await getAdminFirestore().doc(DOC).get();
  if (!snap.exists) return { ...defaultWorkshopSettings };
  return mapWorkshopSettings(snap.data());
}

function yesNo(value: boolean) {
  return value ? "Ya" : "Tidak";
}

function tracked(settings: WorkshopSettings) {
  return {
    Nama: settings.name,
    Telepon: settings.phone,
    Alamat: settings.address,
    "Logo struk": receiptLogoLabel(settings.logo),
    "Catatan struk": settings.receiptFooter,
    "Telepon di struk": yesNo(settings.showPhone),
    "Alamat di struk": yesNo(settings.showAddress),
    "Jasa di struk": yesNo(settings.showLabor),
    "Lebar kertas": paperWidthLabel(settings.paper),
  };
}

export async function saveWorkshopSettings(input: WorkshopSettings, actor: ActivityActor) {
  const database = getAdminFirestore();
  const ref = database.doc(DOC);
  const existing = await ref.get();
  const before = existing.exists ? tracked(mapWorkshopSettings(existing.data())) : {};
  const after = tracked(input);
  const changes = fieldChanges(before, after);
  if (changes.length === 0) return false;

  const creating = !existing.exists;
  const batch = database.batch();
  batch.set(ref, input);
  queueActivity(batch, {
    actor,
    action: creating ? "buat" : "ubah",
    entity: "pengaturan",
    entityId: "workshop",
    label: creating ? `Profil bengkel ${input.name} dibuat` : `Pengaturan ${input.name} diubah`,
    changes,
  });
  await batch.commit();
  return true;
}
