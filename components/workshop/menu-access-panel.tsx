"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { saveMenuAccessAction } from "@/lib/data/actions";
import {
  builtinAccess,
  CONFIGURABLE_ROLES,
  configurableHrefs,
  hasFullMenuAccess,
  isConfigurableRole,
  menuGroups,
  type ConfigurableRole,
  type MenuLeaf,
} from "@/lib/auth/menus";
import { roleLabel, type Role } from "@/lib/auth/roles";
import type { StaffUser } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { buttonClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

function sameMenus(left: string[], right: string[]) {
  return left.join("|") === right.join("|");
}

function CheckRow({
  checked,
  indeterminate = false,
  disabled,
  label,
  hint,
  nested = false,
  className,
  onChange,
}: {
  checked: boolean;
  indeterminate?: boolean;
  disabled: boolean;
  label: string;
  hint?: string;
  nested?: boolean;
  className?: string;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate, checked]);
  return (
    <label
      className={cn(
        "flex min-h-9 items-center gap-2 rounded-lg border border-line bg-field px-2.5 py-1.5",
        nested && "bg-chip/50",
        disabled && "opacity-70",
        className,
      )}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-[#c4840a]"
      />
      <span className="min-w-0 flex-1 text-sm font-medium">{label}</span>
      {hint ? <span className="shrink-0 text-xs font-semibold text-muted">{hint}</span> : null}
    </label>
  );
}

export function MenuAccessPanel({
  staff,
  roles,
  users,
}: {
  staff: StaffUser[];
  roles: Record<ConfigurableRole, string[]>;
  users: Record<string, string[]>;
}) {
  const [state, action, pending] = useQueuedAction(saveMenuAccessAction, "saveMenuAccess");
  const [mode, setMode] = useState<"peran" | "orang">("peran");
  const [role, setRole] = useState<ConfigurableRole>("pemilik");
  const people = [...staff].sort((left, right) => {
    if (left.role === "pemilik" && right.role !== "pemilik") return -1;
    if (right.role === "pemilik" && left.role !== "pemilik") return 1;
    return left.name.localeCompare(right.name, "id");
  });
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const person = people.find((item) => item.id === personId) ?? null;
  const savedCustom = Boolean(person && Object.hasOwn(users, person.id));
  const roleMenus = (subject: Role) => (isConfigurableRole(subject) ? roles[subject] : configurableHrefs());
  const baseline =
    mode === "peran"
      ? roles[role]
      : person
        ? savedCustom
          ? users[person.id]
          : roleMenus(person.role)
        : [];
  const sourceKey = `${mode}:${mode === "peran" ? role : personId}:${savedCustom}:${baseline.join("|")}`;
  const [draftKey, setDraftKey] = useState(sourceKey);
  const [draft, setDraft] = useState(baseline);
  const [customizing, setCustomizing] = useState(false);
  if (draftKey !== sourceKey) {
    setDraftKey(sourceKey);
    setDraft(baseline);
    setCustomizing(false);
  }

  const editable = mode === "peran" || savedCustom || customizing;
  const selected = new Set(draft);
  const dirty = !sameMenus(draft, baseline) || (mode === "orang" && customizing && !savedCustom);
  const subjectRole: Role = mode === "peran" ? role : (person?.role ?? "kasir");
  const groups = menuGroups();

  function hint(href: string) {
    return builtinAccess(subjectRole, href) === "write" ? "Bisa ubah" : "Bisa lihat";
  }

  function toggle(href: string, on: boolean) {
    const next = new Set(draft);
    if (on) next.add(href);
    else next.delete(href);
    setDraft(configurableHrefs().filter((item) => next.has(item)));
  }

  function toggleBranch(children: MenuLeaf[], on: boolean) {
    const next = new Set(draft);
    for (const child of children) {
      if (on) next.add(child.href);
      else next.delete(child.href);
    }
    setDraft(configurableHrefs().filter((item) => next.has(item)));
  }

  const title = mode === "peran" ? roleLabel[role] : (person?.name ?? "Pegawai");

  return (
    <div className="mt-5 grid items-start gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <GlassCard className="p-4">
        <SectionTitle icon={ShieldCheck} tone="teal">
          Sasaran
        </SectionTitle>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-chip p-1">
          {(["peran", "orang"] as const).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={mode === item}
              className={cn(
                "h-10 rounded-lg text-sm font-semibold",
                mode === item ? "bg-amber-soft text-amber" : "text-muted",
              )}
              onClick={() => setMode(item)}
            >
              {item === "peran" ? "Per peran" : "Per orang"}
            </button>
          ))}
        </div>
        {mode === "peran" ? (
          <ul className="mt-3 flex flex-col gap-1">
            {CONFIGURABLE_ROLES.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  aria-pressed={role === item}
                  className={cn(
                    "flex min-h-11 w-full items-center rounded-xl border-l-[3px] px-3 text-left text-sm font-bold tracking-wide uppercase",
                    role === item ? "border-amber bg-amber-soft text-amber" : "border-transparent hover-wash",
                  )}
                  onClick={() => setRole(item)}
                >
                  {roleLabel[item]}
                </button>
              </li>
            ))}
          </ul>
        ) : people.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada pegawai.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1">
            {people.map((item) => {
              const custom = Object.hasOwn(users, item.id);
              const active = personId === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl border-l-[3px] px-3 py-2 text-left",
                      active ? "border-amber bg-amber-soft" : "border-transparent hover-wash",
                    )}
                    onClick={() => setPersonId(item.id)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{item.name}</span>
                      <span className="block truncate text-xs text-muted">{item.email}</span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block text-[11px] font-bold tracking-wide text-amber uppercase">
                        {roleLabel[item.role]}
                      </span>
                      {custom ? <span className="text-[11px] font-semibold text-teal">Khusus</span> : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs leading-5 text-muted">
          Halaman ini tetap terbuka untuk pemilik dan investor.
        </p>
      </GlassCard>

      <GlassCard className="p-4">
        <SectionTitle icon={ShieldCheck}>{title}</SectionTitle>
        <p className="mt-2 text-sm leading-6 text-muted">
          {mode === "orang" && !savedCustom && !customizing
            ? "Centang ini mengikuti peran. Atur khusus bila menu orang ini harus berbeda."
            : hasFullMenuAccess(subjectRole)
              ? "Menu yang ditutup tidak muncul, dan halamannya tidak bisa dibuka."
              : "Menu yang ditutup tidak muncul, dan halamannya tidak bisa dibuka. Menu di luar bawaan peran hanya bisa dilihat."}
        </p>
        {!person && mode === "orang" ? null : (
          <div className="mt-3 flex flex-col gap-3">
            {groups.map((group) => (
              <section key={group.label}>
                <p className="mb-1.5 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase">{group.label}</p>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {group.nodes.map((node) => {
                    if (node.kind === "leaf") {
                      return (
                        <CheckRow
                          key={node.href}
                          checked={selected.has(node.href)}
                          disabled={!editable || pending}
                          label={node.label}
                          hint={hint(node.href)}
                          onChange={(on) => toggle(node.href, on)}
                        />
                      );
                    }
                    const childHrefs = node.children.map((child) => child.href);
                    const count = childHrefs.filter((href) => selected.has(href)).length;
                    return (
                      <div key={node.label} className="grid grid-cols-1 gap-1.5 sm:col-span-2 sm:grid-cols-2">
                        <CheckRow
                          checked={count === childHrefs.length && count > 0}
                          indeterminate={count > 0 && count < childHrefs.length}
                          disabled={!editable || pending}
                          label={node.label}
                          onChange={(on) => toggleBranch(node.children, on)}
                        />
                        {node.children.map((child) => (
                          <CheckRow
                            key={child.href}
                            nested
                            checked={selected.has(child.href)}
                            disabled={!editable || pending}
                            label={child.label}
                            hint={hint(child.href)}
                            onChange={(on) => toggle(child.href, on)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
        {state?.message ? (
          <p className={cn("mt-3 text-sm", state.ok ? "text-teal" : "text-danger")}>{state.message}</p>
        ) : null}
        {mode === "orang" && !person ? null : (
          <div className="mt-4 flex flex-wrap gap-2">
            {mode === "orang" && savedCustom ? (
              <form action={action}>
                <input type="hidden" name="intent" value="reset" />
                <input type="hidden" name="userId" value={person?.id ?? ""} />
                <button
                  type="submit"
                  disabled={pending}
                  className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold disabled:opacity-60"
                >
                  Ikut peran
                </button>
              </form>
            ) : null}
            {mode === "orang" && !savedCustom && !customizing ? (
              <button type="button" className={buttonClass} onClick={() => setCustomizing(true)}>
                Atur khusus
              </button>
            ) : null}
            {mode === "orang" && customizing && !savedCustom ? (
              <button
                type="button"
                className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                onClick={() => {
                  setCustomizing(false);
                  setDraft(baseline);
                }}
              >
                Batal
              </button>
            ) : null}
            {editable ? (
              <form action={action} className="min-w-40 flex-1">
                <input type="hidden" name="intent" value={mode === "peran" ? "role" : "user"} />
                {mode === "peran" ? <input type="hidden" name="role" value={role} /> : null}
                {mode === "orang" ? <input type="hidden" name="userId" value={person?.id ?? ""} /> : null}
                <input type="hidden" name="hrefs" value={JSON.stringify(draft)} />
                <SaveButton pending={pending} disabled={!dirty} className="w-full">
                  Simpan
                </SaveButton>
              </form>
            ) : null}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
