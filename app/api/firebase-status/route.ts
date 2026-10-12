import { connection } from "next/server";
import { adminKeyReady, getAdminFirestore } from "@/lib/firebase/admin";
import { missingFirebasePublicKeys } from "@/lib/firebase/public-config";

export async function GET() {
  await connection();

  if (process.env.NODE_ENV === "production") {
    return Response.json({ ok: false }, { status: 404 });
  }

  const missing = missingFirebasePublicKeys();
  const keyReady = adminKeyReady();

  if (missing.length > 0 || !keyReady) {
    return Response.json({
      ok: false,
      missingPublicKeys: missing,
      adminKeyReady: keyReady,
    });
  }

  try {
    await getAdminFirestore().listCollections();
    return Response.json({
      ok: true,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      missingPublicKeys: [],
      adminKeyReady: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menghubungi Firestore";
    return Response.json({ ok: false, adminKeyReady: true, message }, { status: 500 });
  }
}
