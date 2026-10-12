import { redirect } from "next/navigation";
import { hasOwner } from "@/lib/auth/session";
import { adminKeyReady } from "@/lib/firebase/admin";
import { missingFirebasePublicKeys } from "@/lib/firebase/public-config";
import { SetupForm } from "@/app/setup/setup-form";

export const metadata = {
  title: "Akun pemilik",
};

export default async function SetupPage() {
  const missing = missingFirebasePublicKeys();
  const ready = missing.length === 0 && adminKeyReady();
  if (ready) {
    let owner = false;
    try {
      owner = await hasOwner();
    } catch {
      return (
        <SetupForm configMessage="Firestore belum bisa dihubungi. Periksa kunci admin dan database." />
      );
    }
    if (owner) redirect("/login");
  }

  const configMessage =
    missing.length > 0 || !adminKeyReady()
      ? "Konfigurasi Firebase belum lengkap. Isi .env.local dan taruh kunci admin di secrets/firebase-admin.json."
      : null;

  return <SetupForm configMessage={configMessage} />;
}
