import { cookies } from "next/headers";
import { connection } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth/cookie";
import { getAdminAuth, getAdminFirestore } from "@/lib/firebase/admin";
import { isRole, type Role } from "@/lib/auth/roles";
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_SEC = 5 * 24 * 60 * 60;

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  role: Role;
};

export async function hasOwner() {
  await connection();
  const snap = await getAdminFirestore().doc("meta/bootstrap").get();
  return snap.exists;
}

export async function createOwner(input: {
  name: string;
  email: string;
  password: string;
}) {
  const db = getAdminFirestore();
  const boot = await db.doc("meta/bootstrap").get();
  if (boot.exists) {
    throw new Error("Pemilik sudah dibuat. Masuk dengan email itu.");
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const created = await getAdminAuth().createUser({
    email,
    password: input.password,
    displayName: name,
  });

  await db.collection("users").doc(created.uid).set({
    name,
    email,
    role: "pemilik",
    active: true,
  });
  await db.doc("meta/bootstrap").set({ ownerUid: created.uid });
}

export async function createSessionCookie(idToken: string) {
  const decoded = await getAdminAuth().verifyIdToken(idToken);
  const snap = await getAdminFirestore().collection("users").doc(decoded.uid).get();
  const data = snap.data();
  if (!snap.exists || data?.active === false || !isRole(data?.role)) {
    throw new Error("Akun ini belum terdaftar di bengkel.");
  }

  return getAdminAuth().createSessionCookie(idToken, { expiresIn: FIVE_DAYS_MS });
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: FIVE_DAYS_SEC,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  await connection();
  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!cookie) return null;

  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    const snap = await getAdminFirestore().collection("users").doc(decoded.uid).get();
    const data = snap.data();
    if (!snap.exists || data?.active === false || !isRole(data?.role)) return null;
    return {
      uid: decoded.uid,
      email: typeof data.email === "string" ? data.email : decoded.email ?? "",
      name: typeof data.name === "string" ? data.name : "Pengguna",
      role: data.role,
    };
  } catch {
    return null;
  }
}
