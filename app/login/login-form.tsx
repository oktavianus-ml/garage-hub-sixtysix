"use client";

import { sendPasswordResetEmail, signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useState } from "react";
import { BrandMark } from "@/components/shell/brand-mark";
import { GlassCard } from "@/components/ui/glass-card";
import { getFirebaseAuth } from "@/lib/firebase/client";

function messageFor(code: string) {
  if (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/wrong-password" ||
    code === "auth/user-not-found" ||
    code === "auth/invalid-password"
  ) {
    return "Kata sandi tidak cocok dengan akun yang sudah tersimpan. Pakai kata sandi saat membuat akun pemilik, atau kirim tautan untuk menggantinya.";
  }
  if (code === "auth/configuration-not-found" || code === "auth/operation-not-allowed") {
    return "Login email belum dinyalakan di Firebase Authentication.";
  }
  if (code === "auth/invalid-email") return "Email tidak valid.";
  if (code === "auth/too-many-requests") return "Terlalu banyak percobaan. Coba lagi nanti.";
  if (code === "auth/network-request-failed") return "Jaringan ke Firebase gagal. Coba lagi.";
  if (!code) return "Masuk gagal. Periksa email dan kata sandi.";
  return `Masuk gagal (${code}).`;
}

function describeAuthError(caught: unknown) {
  const message = caught instanceof Error ? caught.message : "";
  const explicit =
    typeof caught === "object" && caught && "code" in caught && caught.code
      ? String(caught.code)
      : "";
  const fromMessage = message.match(/auth\/[a-z0-9-]+/)?.[0] ?? "";
  const code = explicit || fromMessage;
  if (!code) return message || "Masuk gagal. Periksa email dan kata sandi.";
  return messageFor(code);
}

export function LoginForm({
  needsSetup,
  configMessage,
}: {
  needsSetup: boolean;
  configMessage: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const blocked = Boolean(configMessage);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (blocked) return;
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        setError(body?.message ?? "Masuk gagal.");
        setPending(false);
        return;
      }
      window.location.assign("/");
    } catch (caught) {
      setError(describeAuthError(caught));
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <BrandMark />
      <GlassCard className="mt-6 p-5">
        <h1 className="text-2xl font-semibold tracking-tight">Masuk</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          Pakai email dan kata sandi akun bengkel.
        </p>
        {configMessage ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {configMessage}
          </p>
        ) : null}
        <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Email
            <input
              type="email"
              name="email"
              autoComplete="username"
              required
              disabled={blocked || pending}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border border-line bg-chip px-3 text-base font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Kata sandi
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              required
              disabled={blocked || pending}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl border border-line bg-chip px-3 text-base font-normal"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {notice ? <p className="text-sm text-teal">{notice}</p> : null}
          <button
            type="submit"
            disabled={blocked || pending}
            className="h-11 rounded-xl bg-amber font-semibold text-[#1c1915] disabled:opacity-60"
          >
            {pending ? "Memeriksa..." : "Masuk"}
          </button>
        </form>
        {!configMessage ? (
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-amber"
            onClick={async () => {
              setError(null);
              setNotice(null);
              if (!email.includes("@")) {
                setError("Isi email dulu, lalu kirim tautan ganti kata sandi.");
                return;
              }
              try {
                await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
                setNotice("Tautan ganti kata sandi sudah dikirim ke email itu.");
              } catch (caught) {
                setError(describeAuthError(caught));
              }
            }}
          >
            Kirim tautan ganti kata sandi
          </button>
        ) : null}
        {needsSetup && !configMessage ? (
          <p className="mt-4 text-sm text-muted">
            Belum ada pemilik.{" "}
            <Link href="/setup" className="font-semibold text-amber">
              Buat akun email pertama
            </Link>
          </p>
        ) : null}
      </GlassCard>
    </main>
  );
}
