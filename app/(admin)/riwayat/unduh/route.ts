import { NextResponse } from "next/server";
import { accessFor } from "@/lib/auth/access";
import { roleLabel } from "@/lib/auth/roles";
import { getSessionUser } from "@/lib/auth/session";
import {
  activityActionLabel,
  activityEntityLabel,
  formatActivityTime,
  listActivity,
} from "@/lib/data/activity";
import { tableWorkbook } from "@/lib/data/report-xlsx";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if ((await accessFor(user.role, "/riwayat", user.uid)) === "none") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const url = new URL(request.url);
  const log = await listActivity({
    from: url.searchParams.get("dari") ?? undefined,
    to: url.searchParams.get("sampai") ?? undefined,
    actorId: url.searchParams.get("pelaku") ?? undefined,
    entity: url.searchParams.get("jenis") ?? undefined,
    action: url.searchParams.get("aksi") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
  });
  const file = tableWorkbook(
    "Riwayat",
    ["Waktu", "Ringkasan", "Pelaku", "Peran", "Jenis", "Aksi", "Perubahan"],
    log.entries.map((entry) => [
      formatActivityTime(entry.at),
      entry.label,
      entry.actorName,
      roleLabel[entry.actorRole],
      activityEntityLabel[entry.entity],
      activityActionLabel[entry.action],
      entry.changes
        .map((change) => `${change.field}: ${change.before || "—"} → ${change.after || "—"}`)
        .join("; "),
    ]),
    [22, 42, 20, 16, 22, 10, 64],
  );
  const filename = `riwayat-${log.from}_${log.to}.xlsx`;

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
