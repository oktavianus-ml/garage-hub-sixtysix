"use client";

import { useState } from "react";
import Link from "next/link";
import { buttonClass, inputClass } from "@/components/ui/controls";

export function ReportFilter({
  mode,
  month,
  from,
  to,
}: {
  mode: "bulan" | "tanggal";
  month: string;
  from: string;
  to: string;
}) {
  const [current, setCurrent] = useState<"bulan" | "tanggal">(mode);

  return (
    <form method="get" action="/laporan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="hidden">
        {current === "tanggal" ? <input type="hidden" name="bulan" value={month} /> : null}
        {current === "bulan" ? (
          <>
            <input type="hidden" name="dari" value={from} />
            <input type="hidden" name="sampai" value={to} />
          </>
        ) : null}
      </div>
      <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
        Menurut
        <select
          name="mode"
          value={current}
          onChange={(event) => setCurrent(event.target.value === "tanggal" ? "tanggal" : "bulan")}
          className={inputClass}
        >
          <option value="bulan">Bulan</option>
          <option value="tanggal">Tanggal</option>
        </select>
      </label>
      {current === "bulan" ? (
        <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
          Bulan
          <input type="month" name="bulan" required defaultValue={month} className={inputClass} />
        </label>
      ) : (
        <>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Dari
            <input type="date" name="dari" required defaultValue={from} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Sampai
            <input type="date" name="sampai" required defaultValue={to} className={inputClass} />
          </label>
        </>
      )}
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <button type="submit" className={buttonClass}>
          Lihat
        </button>
        <Link
          href="/laporan"
          className="inline-flex h-11 items-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
        >
          Atur ulang
        </Link>
      </div>
    </form>
  );
}
