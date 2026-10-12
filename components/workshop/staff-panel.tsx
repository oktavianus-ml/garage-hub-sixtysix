"use client";

import { useActionState } from "react";
import { UserPlus, Users } from "lucide-react";
import { saveStaffAction } from "@/lib/data/actions";
import { ROLES, roleLabel, type Role } from "@/lib/auth/roles";
import type { StaffUser } from "@/lib/data/records";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

export function StaffPanel({ staff }: { staff: StaffUser[] }) {
  const [state, action, pending] = useActionState(saveStaffAction, null);

  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <GlassCard accent className="p-4">
        <SectionTitle icon={UserPlus}>Pegawai baru</SectionTitle>
        <p className="mt-1 text-sm text-muted">Masuk dengan email dan kata sandi ini.</p>
        <form action={action} className="mt-3 flex flex-col gap-3">
          <input name="name" required placeholder="Nama" className={inputClass} />
          <input name="email" type="email" required placeholder="Email" className={inputClass} />
          <input name="password" type="password" required minLength={8} placeholder="Kata sandi" className={inputClass} />
          <select name="role" required className={inputClass} defaultValue="kasir">
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {roleLabel[role]}
              </option>
            ))}
          </select>
          {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
          <SaveButton pending={pending}>Buat akun</SaveButton>
        </form>
      </GlassCard>
      <GlassCard className="p-4">
        <SectionTitle icon={Users} tone="teal">
          Tim
        </SectionTitle>
        <ul className="mt-2 divide-y divide-line">
          {staff.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-medium">{person.name}</p>
                <p className="text-xs text-muted">{person.email}</p>
              </div>
              <p className="text-sm font-semibold text-amber">{roleLabel[person.role as Role]}</p>
            </li>
          ))}
        </ul>
      </GlassCard>
    </div>
  );
}
