import { hasOwner } from "@/lib/auth/session";
import { missingFirebasePublicKeys } from "@/lib/firebase/public-config";
import { adminKeyReady } from "@/lib/firebase/admin";
import { LoginForm } from "@/app/login/login-form";

export const metadata = {
  title: "Masuk",
};

function configMessage() {
  const missing = missingFirebasePublicKeys();
  if (missing.length > 0 || !adminKeyReady()) {
    return "Konfigurasi Firebase belum lengkap. Isi .env.local dan taruh kunci admin di secrets/firebase-admin.json.";
  }
  return null;
}

export default async function LoginPage() {
  const message = configMessage();
  let needsSetup = false;
  if (!message) {
    try {
      needsSetup = !(await hasOwner());
    } catch {
      return (
        <LoginForm
          needsSetup={false}
          configMessage="Firestore belum bisa dihubungi. Periksa kunci admin dan database."
        />
      );
    }
  }

  return <LoginForm needsSetup={needsSetup} configMessage={message} />;
}
