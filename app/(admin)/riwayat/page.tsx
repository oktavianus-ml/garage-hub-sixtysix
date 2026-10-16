import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { guard } from "@/lib/auth/guard";
import { roleLabel } from "@/lib/auth/roles";
import {
  ACTIVITY_ENTITIES,
  activityActionLabel,
  activityEntityLabel,
  activityQuery,
  formatActivityTime,
  listActivity,
} from "@/lib/data/activity";

const PAGE_SIZE = 20;

export const metadata = { title: "Riwayat" };

export default async function RiwayatPage({
  searchParams,
}: {
  searchParams: Promise<{
    dari?: string;
    sampai?: string;
    pelaku?: string;
    jenis?: string;
    aksi?: string;
    q?: string;
    halaman?: string;
  }>;
}) {
  await guard("/riwayat");
  const params = await searchParams;
  const log = await listActivity({
    from: params.dari,
    to: params.sampai,
    actorId: params.pelaku,
    entity: params.jenis,
    action: params.aksi,
    q: params.q,
  });
  const actorKnown = log.actors.some((actor) => actor.id === log.actorId);
  const pageCount = Math.max(1, Math.ceil(log.entries.length / PAGE_SIZE));
  const requested = Number(params.halaman);
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), pageCount) : 1;
  const start = (page - 1) * PAGE_SIZE;
  const visible = log.entries.slice(start, start + PAGE_SIZE);
  const rangeStart = log.entries.length === 0 ? 0 : start + 1;
  const rangeEnd = start + visible.length;
  const filter = {
    from: log.from,
    to: log.to,
    actorId: log.actorId,
    entity: log.entity,
    action: log.action,
    q: log.q,
  };
  const excelHref = `/riwayat/unduh?${activityQuery(filter)}`;
  const pageHref = (next: number) => `/riwayat?${activityQuery({ ...filter, page: next })}`;

  return (
    <div>
      <PageHeader
        title="Riwayat"
        description="Jejak siapa yang mengubah data bengkel, dan apa yang berubah."
        href="/riwayat"
      />
      <GlassCard className="mt-5 p-4">
        <form method="get" action="/riwayat" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Dari
            <input type="date" name="dari" defaultValue={log.from} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Sampai
            <input type="date" name="sampai" defaultValue={log.to} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Pelaku
            <select name="pelaku" defaultValue={log.actorId} className={inputClass}>
              <option value="">Semua</option>
              {log.actorId && !actorKnown ? <option value={log.actorId}>Pegawai ini</option> : null}
              {log.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Jenis
            <select name="jenis" defaultValue={log.entity} className={inputClass}>
              <option value="">Semua</option>
              {ACTIVITY_ENTITIES.map((entity) => (
                <option key={entity} value={entity}>
                  {activityEntityLabel[entity]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Aksi
            <select name="aksi" defaultValue={log.action} className={inputClass}>
              <option value="">Semua</option>
              <option value="buat">{activityActionLabel.buat}</option>
              <option value="ubah">{activityActionLabel.ubah}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Kata kunci
            <input
              name="q"
              defaultValue={log.q}
              placeholder="Cari di ringkasan"
              className={inputClass}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-3">
            <button type="submit" className={buttonClass}>
              Saring
            </button>
            <Link
              href="/riwayat"
              className="inline-flex h-11 items-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
            >
              Atur ulang
            </Link>
          </div>
        </form>
      </GlassCard>
      <GlassCard className="mt-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs font-medium text-muted">
            {log.entries.length === 0
              ? "Belum ada perubahan pada rentang ini."
              : `${rangeStart}–${rangeEnd} dari ${log.entries.length}`}
            {log.truncated ? " · 500 perubahan terbaru pada rentang ini" : ""}
          </p>
          <a href={excelHref} className={`${buttonClass} inline-flex items-center gap-2 text-sm`}>
            <FileSpreadsheet className="size-4" aria-hidden />
            Unduh Excel
          </a>
        </div>
        {log.entries.length === 0 ? null : (
          <>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Waktu
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Ringkasan
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Pelaku
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Jenis
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Aksi
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      Perubahan
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((entry) => (
                    <tr key={entry.id} className="border-b border-line align-top last:border-b-0">
                      <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted">
                        {formatActivityTime(entry.at)}
                      </td>
                      <td className="py-2 pr-3 font-medium">{entry.label}</td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <span className="block">{entry.actorName}</span>
                        <span className="text-xs text-muted">{roleLabel[entry.actorRole]}</span>
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3">{activityEntityLabel[entry.entity]}</td>
                      <td className="whitespace-nowrap py-2 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            entry.action === "buat" ? "bg-teal-soft text-teal" : "bg-amber-soft text-amber"
                          }`}
                        >
                          {activityActionLabel[entry.action]}
                        </span>
                      </td>
                      <td className="py-2">
                        {entry.changes.length === 0 ? (
                          <span className="text-muted">—</span>
                        ) : (
                          <details>
                            <summary className="cursor-pointer text-xs font-semibold text-teal">
                              {entry.changes.length} bidang
                            </summary>
                            <ul className="mt-1.5 flex flex-col gap-1">
                              {entry.changes.map((change, index) => (
                                <li key={`${change.field}-${index}`}>
                                  <span className="font-medium">{change.field}</span>
                                  <span className="text-muted">
                                    {" "}
                                    {change.before || "—"} → {change.after || "—"}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pageCount > 1 ? (
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                <p className="text-xs text-muted">
                  Halaman {page} dari {pageCount}
                </p>
                <div className="flex gap-2">
                  {page > 1 ? (
                    <Link
                      href={pageHref(page - 1)}
                      className="inline-flex h-9 items-center rounded-xl border border-line bg-chip px-3 text-sm font-medium"
                    >
                      Sebelumnya
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-xl border border-line bg-chip px-3 text-sm font-medium opacity-40">
                      Sebelumnya
                    </span>
                  )}
                  {page < pageCount ? (
                    <Link
                      href={pageHref(page + 1)}
                      className="inline-flex h-9 items-center rounded-xl border border-line bg-chip px-3 text-sm font-medium"
                    >
                      Berikutnya
                    </Link>
                  ) : (
                    <span className="inline-flex h-9 items-center rounded-xl border border-line bg-chip px-3 text-sm font-medium opacity-40">
                      Berikutnya
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </>
        )}
      </GlassCard>
    </div>
  );
}
