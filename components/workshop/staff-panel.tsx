"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, UserPlus, Users } from "lucide-react";
import { saveStaffAction } from "@/lib/data/actions";
import { ROLES, isRole, roleLabel, type Role } from "@/lib/auth/roles";
import type { StaffUser } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

function RecordMark({ kind }: { kind: "baru" | "revisi" }) {
  const revisi = kind === "revisi";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        revisi ? "bg-teal-soft text-teal" : "bg-amber-soft text-amber",
      )}
    >
      {revisi ? "Sudah terdaftar" : "Baru"}
    </span>
  );
}

export function StaffPanel({ staff, canWrite }: { staff: StaffUser[]; canWrite: boolean }) {
  const [state, action, pending] = useActionState(saveStaffAction, null);
  const [editing, setEditing] = useState<StaffUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("kasir");
  const formRef = useRef<HTMLDivElement>(null);
  const snapshot = staff.map((person) => `${person.id}:${person.name}:${person.email}:${person.role}`).join("|");

  function beginEdit(person: StaffUser) {
    setEditing(person);
    setName(person.name);
    setEmail(person.email);
    setPassword("");
    setRole(isRole(person.role) ? person.role : "kasir");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("kasir");
  }

  useEffect(() => {
    setEditing(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("kasir");
  }, [snapshot]);

  return (
    <div className={cn("mt-5 grid items-start gap-4", canWrite && "lg:grid-cols-2")}>
      {canWrite ? (
        <div ref={formRef}>
          <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
            <div className="flex items-start justify-between gap-3">
              <SectionTitle icon={editing ? Pencil : UserPlus} tone={editing ? "teal" : "amber"}>
                {editing ? "Ubah pegawai" : "Pegawai baru"}
              </SectionTitle>
              <RecordMark kind={editing ? "revisi" : "baru"} />
            </div>
            <p className="mt-1 text-sm text-muted">
              {editing
                ? "Kosongkan kata sandi jika tidak ingin mengubahnya."
                : "Masuk dengan email dan kata sandi ini."}
            </p>
            <form action={action} className="mt-3 flex flex-col gap-3">
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <input
                name="name"
                required
                maxLength={80}
                placeholder="Nama"
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <input
                name="email"
                type="email"
                required
                maxLength={120}
                placeholder="Email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              <input
                name="password"
                type="password"
                required={!editing}
                minLength={!editing || password.length > 0 ? 8 : undefined}
                placeholder={editing ? "Kata sandi baru" : "Kata sandi"}
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
              />
              <select
                name="role"
                required
                className={inputClass}
                value={role}
                onChange={(event) => {
                  if (isRole(event.target.value)) setRole(event.target.value);
                }}
              >
                {ROLES.map((item) => (
                  <option key={item} value={item}>
                    {roleLabel[item]}
                  </option>
                ))}
              </select>
              {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
              <div className="flex gap-2">
                {editing ? (
                  <button
                    type="button"
                    className="h-11 shrink-0 rounded-xl border border-teal/40 bg-teal-soft px-4 text-sm font-semibold text-teal"
                    onClick={cancelEdit}
                  >
                    Batal
                  </button>
                ) : null}
                <SaveButton pending={pending} className="flex-1">
                  {editing ? "Simpan perubahan" : "Buat akun"}
                </SaveButton>
              </div>
            </form>
          </GlassCard>
        </div>
      ) : null}
      <GlassCard className="p-4">
        <SectionTitle icon={Users} tone="teal">
          Tim
        </SectionTitle>
        {staff.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada pegawai.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {staff.map((person) => {
              const editingThis = editing?.id === person.id;
              return (
                <li key={person.id} className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{person.name}</p>
                      <p className="text-xs text-muted">{person.email}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <p className="text-sm font-semibold text-amber">{roleLabel[person.role]}</p>
                      {canWrite ? (
                        <button
                          type="button"
                          className="glass inline-flex h-8 items-center rounded-xl px-3.5 text-sm font-semibold leading-none text-teal"
                          onClick={() => beginEdit(person)}
                        >
                          Ubah
                        </button>
                      ) : null}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>
    </div>
  );
}
