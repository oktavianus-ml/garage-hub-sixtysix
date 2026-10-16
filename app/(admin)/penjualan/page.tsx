import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { GlassCard } from "@/components/ui/glass-card";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { SalesHistoryPanel } from "@/components/workshop/sales-history-panel";
import { guard } from "@/lib/auth/guard";
import { isBusinessDay, jakartaDate } from "@/lib/data/format";
import { PAY_METHODS, parsePayMethod, payMethodLabel } from "@/lib/data/payment";
import { listSalesBetween } from "@/lib/data/records";
import { getWorkshopSettings } from "@/lib/data/settings";

export const metadata = { title: "Riwayat penjualan" };

function windowOf(from?: string, to?: string) {
  const end = to && isBusinessDay(to) ? to : jakartaDate();
  const start =
    from && isBusinessDay(from) ? from : jakartaDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

export default async function PenjualanPage({
  searchParams,
}: {
  searchParams: Promise<{ dari?: string; sampai?: string; bayar?: string; q?: string }>;
}) {
  await guard("/penjualan");
  const params = await searchParams;
  const range = windowOf(params.dari, params.sampai);
  const pay = parsePayMethod(params.bayar);
  const query = (params.q ?? "").trim().toLowerCase();
  const [listed, settings] = await Promise.all([
    listSalesBetween(range.from, range.to),
    getWorkshopSettings(),
  ]);
  const sales = listed
    .filter((sale) => {
      if (pay && sale.payMethod !== pay) return false;
      if (!query) return true;
      const haystack = [sale.no, sale.cashierName, ...sale.lines.map((line) => line.name)]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    })
    .slice(0, 200);

  return (
    <div>
      <PageHeader
        title="Riwayat penjualan"
        description="Cari penjualan kasir menurut tanggal, lalu cetak ulang struk."
        href="/penjualan"
      />
      <GlassCard className="mt-5 p-4">
        <form method="get" action="/penjualan" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Dari
            <input type="date" name="dari" defaultValue={range.from} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Sampai
            <input type="date" name="sampai" defaultValue={range.to} className={inputClass} />
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Tempat uang
            <select name="bayar" defaultValue={pay ?? ""} className={inputClass}>
              <option value="">Semua</option>
              {PAY_METHODS.map((method) => (
                <option key={method} value={method}>
                  {payMethodLabel[method]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
            Kata kunci
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Nomor struk, barang, atau kasir"
              className={inputClass}
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
            <button type="submit" className={buttonClass}>
              Saring
            </button>
            <Link
              href="/penjualan"
              className="inline-flex h-11 items-center rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
            >
              Atur ulang
            </Link>
          </div>
        </form>
      </GlassCard>
      <GlassCard className="mt-4 p-4">
        <SalesHistoryPanel sales={sales} settings={settings} />
      </GlassCard>
    </div>
  );
}
