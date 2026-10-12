import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { guard } from "@/lib/auth/guard";
import { roleLabel } from "@/lib/auth/roles";
import {
  ACTIVITY_ENTITIES,
  activityActionLabel,
  activityEntityLabel,
  formatActivityTime,
  listActivity,
} from "@/lib/data/activity";

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
        {log.entries.length === 0 ? (
          <p className="text-sm text-muted">Belum ada perubahan pada rentang ini.</p>
        ) : (
          <>
            <p className="text-xs font-medium text-muted">
              {log.entries.length === 200
                ? "200 perubahan terbaru pada saringan ini."
                : `${log.entries.length} perubahan`}
            </p>
            <ul className="mt-2 divide-y divide-line">
              {log.entries.map((entry) => (
                <li key={entry.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <p className="font-medium">{entry.label}</p>
                    <p className="text-xs text-muted">{formatActivityTime(entry.at)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {entry.actorName} · {roleLabel[entry.actorRole]} · {activityEntityLabel[entry.entity]} ·{" "}
                    {activityActionLabel[entry.action]}
                  </p>
                  {entry.changes.length > 0 ? (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-teal">
                        {entry.changes.length} bidang
                      </summary>
                      <ul className="mt-2 flex flex-col gap-1">
                        {entry.changes.map((change, index) => (
                          <li key={`${change.field}-${index}`} className="text-sm">
                            <span className="font-medium">{change.field}</span>
                            <span className="text-muted">
                              {" "}
                              {change.before || "—"} → {change.after || "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        )}
      </GlassCard>
    </div>
  );
}
