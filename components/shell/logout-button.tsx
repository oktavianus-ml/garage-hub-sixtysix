"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/session", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex size-11 items-center justify-center rounded-xl border border-line"
      aria-label="Keluar"
    >
      <LogOut className="size-5" />
    </button>
  );
}
