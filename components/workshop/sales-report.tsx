import { FileSpreadsheet, FileText, PieChart, ShoppingBag, Wallet } from "lucide-react";
import { ReportFilter } from "@/components/workshop/report-filter";
import { buttonClass } from "@/components/ui/controls";
import { GlassCard } from "@/components/ui/glass-card";
import { SectionTitle } from "@/components/ui/section-title";
import { rupiah } from "@/lib/data/format";
import { formatDay, reportSearch, type SalesReport } from "@/lib/data/sales-report";

export function SalesReportView({ report }: { report: SalesReport }) {
  const excelHref = `/laporan/unduh?${reportSearch(report.period, "xlsx")}`;
  const pdfHref = `/laporan/unduh?${reportSearch(report.period, "pdf")}`;
  const cards = [
    { label: "Transaksi", value: String(report.count), hint: "SPK lunas dan kasir" },
    { label: "Omzet", value: rupiah(report.total), hint: "Jasa dan sparepart" },
    { label: "Harga pokok", value: rupiah(report.cost), hint: "Modal sparepart" },
    { label: "Laba kotor", value: rupiah(report.profit), hint: "Sebelum pengeluaran kas" },
  ];

  return (
    <>
      <GlassCard className="mt-5 p-4">
        <ReportFilter
          key={`${report.period.mode}:${report.period.month}:${report.period.from}:${report.period.to}`}
          mode={report.period.mode}
          month={report.period.month}
          from={report.period.from}
          to={report.period.to}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <a href={excelHref} className={`${buttonClass} inline-flex items-center gap-2 text-sm`}>
            <FileSpreadsheet className="size-4" aria-hidden />
            Unduh Excel
          </a>
          <a
            href={pdfHref}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-chip px-4 text-sm font-semibold"
          >
            <FileText className="size-4" aria-hidden />
            Unduh PDF
          </a>
          <p className="text-sm text-muted">{report.period.label}</p>
        </div>
      </GlassCard>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <GlassCard key={card.label} className="p-4">
            <p className="text-sm text-muted">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.hint}</p>
          </GlassCard>
        ))}
      </section>
      <p className="mt-3 text-xs text-muted">
        Laba kotor dihitung dari omzet dikurangi harga pokok sparepart. Pengeluaran kas tidak masuk laporan ini.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <GlassCard className="p-4">
          <SectionTitle icon={Wallet} tone="teal">
            Tempat uang
          </SectionTitle>
          <dl className="mt-3 divide-y divide-line">
            {report.channels.map((channel) => (
              <div key={channel.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                <dt className="text-muted">{channel.label}</dt>
                <dd className="font-semibold tabular-nums">{rupiah(channel.amount)}</dd>
              </div>
            ))}
          </dl>
        </GlassCard>
        <GlassCard className="p-4">
          <SectionTitle icon={ShoppingBag}>Asal penjualan</SectionTitle>
          <ul className="mt-3 divide-y divide-line">
            {report.sources.map((source) => (
              <li key={source.label} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <p className="font-medium">{source.label}</p>
                  <p className="text-xs text-muted">{source.count} penjualan</p>
                </div>
                <p className="font-semibold tabular-nums">{rupiah(source.amount)}</p>
              </li>
            ))}
          </ul>
        </GlassCard>
      </div>

      <GlassCard className="mt-4 p-4">
        <SectionTitle icon={PieChart} tone="teal">
          Pembagian keuntungan
        </SectionTitle>
        <p className="mt-3 text-sm leading-6 text-muted">
          Dihitung dari laba kotor periode ini, mengikuti persentase bagi hasil. Pengeluaran kas belum dipotong.
        </p>
        {report.shares.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Persentase bagi hasil belum diatur.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line">
            {report.shares.map((share) => (
              <li key={share.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <p className="min-w-0">
                  <span className="font-medium">{share.name}</span>
                  {share.role ? <span className="ml-2 text-muted">{share.role}</span> : null}
                  <span className="ml-2 text-muted tabular-nums">{share.percent}%</span>
                </p>
                <p className={`shrink-0 font-semibold tabular-nums ${share.amount < 0 ? "text-danger" : ""}`}>
                  {rupiah(share.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>

      <GlassCard className="mt-4 p-4">
        <SectionTitle icon={FileSpreadsheet} tone="teal">
          Rincian penjualan
        </SectionTitle>
        {report.sales.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Belum ada penjualan pada periode ini.</p>
        ) : (
          <>
            <p className="mt-3 text-xs font-medium text-muted">{report.count} penjualan</p>
            <ul className="mt-2 divide-y divide-line md:hidden">
              {report.sales.map((sale) => (
                <li key={sale.id} className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">
                      {sale.no} · {sale.customer}
                    </p>
                    <p className="text-sm font-semibold text-amber tabular-nums">{rupiah(sale.total)}</p>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDay(sale.date)} · {sale.source}
                    {sale.detail ? ` · ${sale.detail}` : ""}
                  </p>
                  <p className="text-xs text-muted">{sale.payLabel}</p>
                </li>
              ))}
            </ul>
            <div className="mt-3 hidden overflow-x-auto md:block">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs font-semibold text-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">Tanggal</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Nomor</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Sumber</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Pelanggan</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">Keterangan</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Jasa</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Sparepart</th>
                    <th scope="col" className="py-2 pr-3 text-right font-semibold">Total</th>
                    <th scope="col" className="py-2 font-semibold">Tempat uang</th>
                  </tr>
                </thead>
                <tbody>
                  {report.sales.map((sale) => (
                    <tr key={sale.id} className="border-b border-line">
                      <td className="py-2.5 pr-3 whitespace-nowrap">{formatDay(sale.date)}</td>
                      <td className="py-2.5 pr-3 whitespace-nowrap font-medium">{sale.no}</td>
                      <td className="py-2.5 pr-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            sale.source === "Servis" ? "bg-teal-soft text-teal" : "bg-amber-soft text-amber"
                          }`}
                        >
                          {sale.source}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate py-2.5 pr-3" title={sale.customer}>
                        {sale.customer}
                      </td>
                      <td className="max-w-[240px] truncate py-2.5 pr-3 text-muted" title={sale.detail}>
                        {sale.detail || "—"}
                      </td>
                      <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{rupiah(sale.labor)}</td>
                      <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{rupiah(sale.parts)}</td>
                      <td className="py-2.5 pr-3 text-right font-semibold whitespace-nowrap tabular-nums">
                        {rupiah(sale.total)}
                      </td>
                      <td className="py-2.5 whitespace-nowrap">{sale.payLabel}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-sm font-semibold">
                    <td className="py-2.5 pr-3" colSpan={5}>
                      Total
                    </td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{rupiah(report.labor)}</td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{rupiah(report.parts)}</td>
                    <td className="py-2.5 pr-3 text-right whitespace-nowrap tabular-nums">{rupiah(report.total)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </GlassCard>
    </>
  );
}
