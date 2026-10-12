"use client";

import { signInWithEmailAndPassword } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerOwner } from "@/app/setup/actions";
import { BrandMark } from "@/components/shell/brand-mark";
import { GlassCard } from "@/components/ui/glass-card";
import { getFirebaseAuth } from "@/lib/firebase/client";

export function SetupForm({ configMessage }: { configMessage: string | null }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const blocked = Boolean(configMessage);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (blocked) return;
    setPending(true);
    setError(null);
    const created = await registerOwner({ name, email, password });
    if (!created.ok) {
      setError(created.message);
      setPending(false);
      return;
    }

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
        router.push("/login");
        router.refresh();
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-10">
      <BrandMark />
      <GlassCard accent className="mt-6 p-5">
        <h1 className="text-2xl font-semibold tracking-tight">Akun pemilik</h1>
        <p className="mt-1 text-sm leading-6 text-muted">
          Akun pertama masuk dengan email dan kata sandi. Akun ini menjadi pemilik bengkel.
        </p>
        {configMessage ? (
          <p className="mt-4 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {configMessage}
          </p>
        ) : null}
        <form className="mt-5 flex flex-col gap-4" onSubmit={onSubmit}>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nama
            <input
              name="name"
              autoComplete="name"
              required
              disabled={blocked || pending}
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 rounded-xl border border-line-strong bg-field px-3 text-base font-normal"
            />
          </label>
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
              className="h-11 rounded-xl border border-line-strong bg-field px-3 text-base font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Kata sandi
            <input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={blocked || pending}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl border border-line-strong bg-field px-3 text-base font-normal"
            />
          </label>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <button
            type="submit"
            disabled={blocked || pending}
            className="h-11 rounded-xl bg-amber font-semibold text-[#1c1915] disabled:opacity-60"
          >
            {pending ? "Menyimpan..." : "Buat akun pemilik"}
          </button>
        </form>
        <p className="mt-4 text-sm text-muted">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-semibold text-amber">
            Masuk
          </Link>
        </p>
      </GlassCard>
    </main>
  );
}
