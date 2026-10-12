import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirebasePublicConfig } from "@/lib/firebase/public-config";

export function getFirebaseAuth() {
  const app = getApps().length > 0 ? getApp() : initializeApp(getFirebasePublicConfig());
  return getAuth(app);
}
