import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

function serviceAccountPath() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!configured) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_PATH belum diisi. Taruh kunci admin di secrets/firebase-admin.json.",
    );
  }
  return path.resolve(process.cwd(), configured);
}

function adminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const file = serviceAccountPath();
  if (!fs.existsSync(file)) {
    throw new Error(
      `File kunci admin tidak ditemukan: ${file}. Unduh dari Project settings > Service accounts.`,
    );
  }

  return initializeApp({
    credential: cert(file),
  });
}

export function getAdminAuth() {
  return getAuth(adminApp());
}

export function getAdminFirestore() {
  return getFirestore(adminApp());
}

export function adminKeyReady() {
  const configured = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!configured) return false;
  return fs.existsSync(path.resolve(process.cwd(), configured));
}
