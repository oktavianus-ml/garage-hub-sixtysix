"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, List, Pencil, Search } from "lucide-react";
import { saveAccountAction, seedAccountsAction } from "@/lib/data/actions";
import {
  ACCOUNT_KINDS,
  accountKindLabel,
  type AccountKind,
  type ChartAccount,
} from "@/lib/data/account-types";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

type KindFilter = "semua" | AccountKind;

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

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function matchesQuery(account: ChartAccount, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  const fields = [account.code, account.name, account.note, accountKindLabel[account.kind]];
  return fields.some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

export function AccountsPanel({
  accounts,
  canWrite,
}: {
  accounts: ChartAccount[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useActionState(saveAccountAction, null);
  const [seedState, seedAction, seedPending] = useActionState(seedAccountsAction, null);
  const [editing, setEditing] = useState<ChartAccount | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AccountKind>("pendapatan");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);
  const [filter, setFilter] = useState<KindFilter>("semua");
  const formRef = useRef<HTMLDivElement>(null);
  const snapshot = accounts
    .map((item) => `${item.id}:${item.code}:${item.name}:${item.kind}:${item.note}:${item.active}`)
    .join("|");
  const counts = useMemo(() => {
    const tally = { pendapatan: 0, beban: 0, modal: 0, nonaktif: 0 };
    for (const account of accounts) {
      tally[account.kind] += 1;
      if (!account.active) tally.nonaktif += 1;
    }
    return tally;
  }, [accounts]);

  function beginEdit(account: ChartAccount) {
    setEditing(account);
    setCode(account.code);
    setName(account.name);
    setKind(account.kind);
    setNote(account.note);
    setActive(account.active);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setCode("");
    setName("");
    setKind("pendapatan");
    setNote("");
    setActive(true);
  }

  useEffect(() => {
    setEditing(null);
    setCode("");
    setName("");
    setKind("pendapatan");
    setNote("");
    setActive(true);
  }, [snapshot]);

  return (
    <>
      <section className="mt-5 grid gap-3 sm:grid-cols-3">
        {ACCOUNT_KINDS.map((item) => {
          const selected = filter === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(selected ? "semua" : item)}
              className={cn("glass rounded-2xl p-4 text-left", selected && "border-t-2 border-t-amber")}
              aria-pressed={selected}
            >
              <p className="text-sm text-muted">{accountKindLabel[item]}</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{counts[item]}</p>
              <p className="mt-1 text-xs text-muted">{selected ? "Menyaring daftar" : "Klik untuk menyaring"}</p>
            </button>
          );
        })}
      </section>

      <div className={cn("mt-4 grid items-start gap-4", canWrite && "lg:grid-cols-2")}>
        {canWrite ? (
          <div ref={formRef}>
            <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
              <div className="flex items-start justify-between gap-3">
                <SectionTitle icon={editing ? Pencil : BookOpen} tone={editing ? "teal" : "amber"}>
                  {editing ? "Ubah akun" : "Akun baru"}
                </SectionTitle>
                <RecordMark kind={editing ? "revisi" : "baru"} />
              </div>
              <form action={action} className="mt-3 flex flex-col gap-3">
                {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    name="code"
                    required
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Kode, misalnya 4100"
                    className={inputClass}
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                  />
                  <select
                    name="kind"
                    aria-label="Jenis akun"
                    className={inputClass}
                    value={kind}
                    onChange={(event) => {
                      if (event.target.value === "pendapatan" || event.target.value === "beban" || event.target.value === "modal") {
                        setKind(event.target.value);
                      }
                    }}
                  >
                    {ACCOUNT_KINDS.map((item) => (
                      <option key={item} value={item}>
                        {accountKindLabel[item]}
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  name="name"
                  required
                  maxLength={80}
                  placeholder="Nama akun"
                  className={inputClass}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <input
                  name="note"
                  maxLength={160}
                  placeholder="Catatan, misalnya untuk apa akun ini"
                  className={inputClass}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
                <select
                  name="active"
                  aria-label="Status akun"
                  className={inputClass}
                  value={active ? "1" : "0"}
                  onChange={(event) => setActive(event.target.value !== "0")}
                >
                  <option value="1">Masih dipakai</option>
                  <option value="0">Nonaktif</option>
                </select>
                {state?.message ? <p className="text-sm text-danger">{state.message}</p> : null}
                <p className="text-sm leading-6 text-muted">
                  {editing
                    ? "Perubahan menimpa akun ini. Kode yang sudah dipakai tidak boleh dobel."
                    : "Pendapatan untuk uang masuk, beban untuk biaya, modal untuk setoran pemilik."}
                </p>
                <div className="flex gap-2">
                  {editing ? (
                    <button
                      type="button"
                      className="h-11 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
                      onClick={cancelEdit}
                    >
                      Batal
                    </button>
                  ) : null}
                  <SaveButton pending={pending} className="flex-1">
                    {editing ? "Simpan perubahan" : "Simpan akun"}
                  </SaveButton>
                </div>
              </form>
            </GlassCard>
          </div>
        ) : null}
        <AccountDirectory
          accounts={accounts}
          canWrite={canWrite}
          editingId={editing?.id ?? ""}
          filter={filter}
          inactiveCount={counts.nonaktif}
          seedAction={seedAction}
          seedPending={seedPending}
          seedMessage={seedState?.message ?? ""}
          onEdit={beginEdit}
        />
      </div>
    </>
  );
}

function AccountDirectory({
  accounts,
  canWrite,
  editingId,
  filter,
  inactiveCount,
  seedAction,
  seedPending,
  seedMessage,
  onEdit,
}: {
  accounts: ChartAccount[];
  canWrite: boolean;
  editingId: string;
  filter: KindFilter;
  inactiveCount: number;
  seedAction: (payload: FormData) => void;
  seedPending: boolean;
  seedMessage: string;
  onEdit: (account: ChartAccount) => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () =>
      accounts.filter(
        (account) => (filter === "semua" || account.kind === filter) && matchesQuery(account, query),
      ),
    [accounts, filter, query],
  );
  const groups = ACCOUNT_KINDS.filter((kind) => filter === "semua" || filter === kind).map((kind) => ({
    kind,
    rows: filtered.filter((account) => account.kind === kind),
  }));

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={List} tone="teal">
          Daftar
        </SectionTitle>
        {accounts.length > 0 ? (
          <p className="text-xs font-medium text-muted">
            {filtered.length === accounts.length
              ? `${accounts.length} akun`
              : `${filtered.length} dari ${accounts.length}`}
          </p>
        ) : null}
      </div>
      {accounts.length === 0 ? (
        <div className="mt-3">
          <p className="text-sm leading-6 text-muted">
            Belum ada akun. Daftar awal berisi jasa, penjualan sparepart, harga pokok, gaji, sewa, listrik,
            operasional, modal pemilik, dan prive.
          </p>
          {canWrite ? (
            <form action={seedAction} className="mt-3">
              {seedMessage ? <p className="mb-2 text-sm text-danger">{seedMessage}</p> : null}
              <SaveButton pending={seedPending}>Pakai daftar awal</SaveButton>
            </form>
          ) : null}
        </div>
      ) : (
        <>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari kode, nama, atau catatan"
              className={cn(inputClass, "pl-10")}
            />
          </label>
          {inactiveCount > 0 ? (
            <p className="mt-2 text-xs text-muted">
              {inactiveCount === 1 ? "1 akun nonaktif" : `${inactiveCount} akun nonaktif`} tetap tersimpan.
            </p>
          ) : null}
          {filtered.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada akun yang cocok.</p>
          ) : (
            <div className="mt-2">
              {groups.map((group) =>
                group.rows.length === 0 ? null : (
                  <section key={group.kind}>
                    <p className="pt-3 text-xs font-semibold text-muted">{accountKindLabel[group.kind]}</p>
                    <ul className="divide-y divide-line">
                      {group.rows.map((account) => {
                        const editingThis = editingId === account.id;
                        return (
                          <li
                            key={account.id}
                            className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}
                          >
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <p className={cn("font-medium", !account.active && "text-muted")}>{account.name}</p>
                              <span className="text-xs font-semibold tracking-wide text-muted">{account.code}</span>
                              {!account.active ? (
                                <span className="rounded-full bg-chip px-2.5 py-1 text-[11px] font-semibold text-muted">
                                  Nonaktif
                                </span>
                              ) : null}
                              {canWrite ? (
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-teal"
                                  onClick={() => onEdit(account)}
                                >
                                  Ubah
                                </button>
                              ) : null}
                            </div>
                            {account.note ? <p className="mt-1 text-sm text-muted">{account.note}</p> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ),
              )}
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
}
