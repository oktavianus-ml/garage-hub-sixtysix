"use client";

import { useQueuedAction } from "@/components/shell/offline-status";
import { FormMessage } from "@/components/ui/form-message";
import { useEffect, useMemo, useRef, useState } from "react";
import { List, Pencil, Search, Truck } from "lucide-react";
import { saveDistributorAction } from "@/lib/data/actions";
import type { Distributor } from "@/lib/data/records";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/controls";
import { SaveButton } from "@/components/ui/save-button";
import { SectionTitle } from "@/components/ui/section-title";
import { GlassCard } from "@/components/ui/glass-card";

const PAGE_SIZE = 8;
const areaClass = "min-h-20 w-full rounded-xl border border-line-strong bg-field px-3 py-2 text-base";

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

function contactLine(distributor: Distributor) {
  const parts = [distributor.contact, distributor.phone].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Tanpa kontak";
}

function matchesQuery(distributor: Distributor, query: string) {
  const text = query.trim().toLowerCase();
  if (!text) return true;
  const folded = compact(text);
  const fields = [distributor.name, distributor.contact, distributor.phone, distributor.address, distributor.note];
  return fields.some((field) => {
    const value = field.toLowerCase();
    return value.includes(text) || (folded.length >= 2 && compact(field).includes(folded));
  });
}

export function DistributorsPanel({
  distributors,
  canWrite,
}: {
  distributors: Distributor[];
  canWrite: boolean;
}) {
  const [state, action, pending] = useQueuedAction(saveDistributorAction, "saveDistributor");
  const [editing, setEditing] = useState<Distributor | null>(null);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const formRef = useRef<HTMLDivElement>(null);
  const snapshot = distributors
    .map((item) => `${item.id}:${item.name}:${item.contact}:${item.phone}:${item.address}:${item.note}`)
    .join("|");

  function beginEdit(distributor: Distributor) {
    setEditing(distributor);
    setName(distributor.name);
    setContact(distributor.contact);
    setPhone(distributor.phone);
    setAddress(distributor.address);
    setNote(distributor.note);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function cancelEdit() {
    setEditing(null);
    setName("");
    setContact("");
    setPhone("");
    setAddress("");
    setNote("");
  }

  useEffect(() => {
    setEditing(null);
    setName("");
    setContact("");
    setPhone("");
    setAddress("");
    setNote("");
  }, [snapshot]);

  return (
    <div className={cn("mt-5 grid items-start gap-4", canWrite && "lg:grid-cols-2")}>
      {canWrite ? (
        <div ref={formRef}>
          <GlassCard accent={!editing} className={cn("p-4", editing && "border-t-2 border-t-teal")}>
            <div className="flex items-start justify-between gap-3">
              <SectionTitle icon={editing ? Pencil : Truck} tone={editing ? "teal" : "amber"}>
                {editing ? "Ubah distributor" : "Distributor baru"}
              </SectionTitle>
              <RecordMark kind={editing ? "revisi" : "baru"} />
            </div>
            <form action={action} className="mt-3 flex flex-col gap-3">
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <input
                name="name"
                required
                maxLength={80}
                placeholder="Nama distributor"
                className={inputClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  name="contact"
                  maxLength={80}
                  placeholder="Nama kontak"
                  className={inputClass}
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                />
                <input
                  name="phone"
                  maxLength={30}
                  placeholder="Telepon"
                  className={inputClass}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </div>
              <textarea
                name="address"
                maxLength={200}
                placeholder="Alamat"
                className={areaClass}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
              />
              <input
                name="note"
                maxLength={200}
                placeholder="Catatan, misalnya oli dan filter"
                className={inputClass}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
              <FormMessage state={state} />
              <p className="text-sm leading-6 text-muted">
                {editing
                  ? "Perubahan menimpa data distributor ini."
                  : "Simpan toko atau pemasok. Kontak ini dipakai saat order barang."}
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
                  {editing ? "Simpan perubahan" : "Simpan distributor"}
                </SaveButton>
              </div>
            </form>
          </GlassCard>
        </div>
      ) : null}
      <DistributorDirectory
        distributors={distributors}
        canWrite={canWrite}
        editingId={editing?.id ?? ""}
        onEdit={beginEdit}
      />
    </div>
  );
}

function DistributorDirectory({
  distributors,
  canWrite,
  editingId,
  onEdit,
}: {
  distributors: Distributor[];
  canWrite: boolean;
  editingId: string;
  onEdit: (distributor: Distributor) => void;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const filtered = useMemo(
    () => distributors.filter((distributor) => matchesQuery(distributor, query)),
    [distributors, query],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const start = currentPage * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);
  const rangeStart = filtered.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visible.length;

  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between gap-3">
        <SectionTitle icon={List} tone="teal">
          Daftar
        </SectionTitle>
        {distributors.length > 0 ? (
          <p className="text-xs font-medium text-muted">
            {filtered.length === distributors.length
              ? `${distributors.length} distributor`
              : `${filtered.length} dari ${distributors.length}`}
          </p>
        ) : null}
      </div>
      {distributors.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Belum ada distributor.</p>
      ) : (
        <>
          <label className="relative mt-3 block">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(0);
              }}
              placeholder="Cari nama, kontak, telepon, atau alamat"
              className={cn(inputClass, "pl-10")}
            />
          </label>
          {visible.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Tidak ada distributor yang cocok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {visible.map((distributor) => {
                const editingThis = editingId === distributor.id;
                return (
                  <li
                    key={distributor.id}
                    className={cn("py-3", editingThis && "-mx-2 rounded-xl bg-teal-soft px-2")}
                  >
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="font-medium">{distributor.name}</p>
                      {canWrite ? (
                        <button
                          type="button"
                          className="text-xs font-semibold text-teal"
                          onClick={() => onEdit(distributor)}
                        >
                          Ubah
                        </button>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted">{contactLine(distributor)}</p>
                    {distributor.address ? <p className="mt-1 text-sm">{distributor.address}</p> : null}
                    {distributor.note ? <p className="mt-1 text-sm text-muted">{distributor.note}</p> : null}
                  </li>
                );
              })}
            </ul>
          )}
          {filtered.length > PAGE_SIZE ? (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <p className="text-xs text-muted">
                {rangeStart}–{rangeEnd} dari {filtered.length}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  className="h-9 rounded-xl border border-line bg-chip px-3 text-sm font-medium disabled:opacity-40"
                  disabled={currentPage >= pageCount - 1}
                  onClick={() => setPage(currentPage + 1)}
                >
                  Berikutnya
                </button>
              </div>
            </div>
          ) : null}
        </>
      )}
    </GlassCard>
  );
}
