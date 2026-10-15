"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useEffect, useRef, useState } from "react";
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
  const [state, action, pending] = useQueuedAction(saveStaffAction, "saveStaff");
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
                    {roleLabel[item].toLocaleUpperCase("id")}
                  </option>
                ))}
              </select>
              <FormMessage state={state} />
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
          <TeamTable staff={staff} canWrite={canWrite} editingId={editing?.id ?? ""} onEdit={beginEdit} />
        )}
      </GlassCard>
    </div>
  );
}

function TeamTable({
  staff,
  canWrite,
  editingId,
  onEdit,
}: {
  staff: StaffUser[];
  canWrite: boolean;
  editingId: string;
  onEdit: (person: StaffUser) => void;
}) {
  const rows = [...staff].sort((left, right) => {
    if (left.role === "pemilik" && right.role !== "pemilik") return -1;
    if (right.role === "pemilik" && left.role !== "pemilik") return 1;
    return left.name.localeCompare(right.name, "id");
  });

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-x-0 border-spacing-y-2 text-left text-sm">
        <thead>
          <tr className="text-xs font-semibold text-muted">
            <th scope="col" className="px-3 pb-1 font-semibold">
              Nama
            </th>
            <th scope="col" className="px-3 pb-1 font-semibold">
              Email
            </th>
            <th scope="col" className="px-3 pb-1 font-semibold">
              Peran
            </th>
            {canWrite ? <th scope="col" className="px-3 pb-1 text-right font-semibold" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((person) => {
            const owner = person.role === "pemilik";
            const editingThis = editingId === person.id;
            const cell = cn(
              "py-3 align-middle",
              editingThis
                ? "border-y border-teal/40 bg-teal-soft"
                : owner
                  ? "border-y border-amber/35 bg-amber-soft"
                  : "border-b border-line",
            );
            const edge = owner || editingThis;
            return (
              <tr key={person.id}>
                <td className={cn(cell, "px-3 font-medium", edge && "rounded-l-xl border-l")}>{person.name}</td>
                <td className={cn(cell, "px-3 text-muted")}>{person.email}</td>
                <td className={cn(cell, "px-3", !canWrite && edge && "rounded-r-xl border-r")}>
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
                      owner ? "bg-amber text-bg" : "bg-chip text-ink",
                    )}
                  >
                    {roleLabel[person.role]}
                  </span>
                </td>
                {canWrite ? (
                  <td className={cn(cell, "px-3 text-right", edge && "rounded-r-xl border-r")}>
                    <button
                      type="button"
                      className="glass inline-flex h-8 items-center rounded-xl px-3.5 text-sm font-semibold leading-none text-teal"
                      onClick={() => onEdit(person)}
                    >
                      Ubah
                    </button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
