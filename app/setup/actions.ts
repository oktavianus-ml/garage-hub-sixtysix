"use server";

import { createOwner } from "@/lib/auth/session";

export async function registerOwner(input: {
  name: string;
  email: string;
  password: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (name.length < 2) return { ok: false as const, message: "Isi nama pemilik." };
  if (!email.includes("@")) return { ok: false as const, message: "Isi email yang valid." };
  if (password.length < 8) {
    return { ok: false as const, message: "Kata sandi minimal 8 karakter." };
  }

  try {
    await createOwner({ name, email, password });
    return { ok: true as const };
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    const raw = error instanceof Error ? error.message : "";
    if (code === "auth/email-already-exists") {
      return { ok: false as const, message: "Email ini sudah dipakai." };
    }
    if (code === "auth/configuration-not-found" || raw.includes("no configuration corresponding")) {
      return {
        ok: false as const,
        message:
          "Login email belum dinyalakan. Di Firebase buka Authentication, klik Get started, lalu nyalakan Email/Password.",
      };
    }
    return { ok: false as const, message: raw || "Akun pemilik gagal dibuat." };
  }
}
