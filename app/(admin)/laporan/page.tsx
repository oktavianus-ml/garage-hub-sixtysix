import type { Metadata } from "next";
import { SalesReportView } from "@/components/workshop/sales-report";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { loadSalesReport, resolvePeriod } from "@/lib/data/sales-report";

export const metadata: Metadata = { title: "Laporan" };

export default async function LaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; bulan?: string; dari?: string; sampai?: string }>;
}) {
  await guard("/laporan");
  const period = resolvePeriod(await searchParams);
  const report = await loadSalesReport(period);

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Unduh penjualan ke Excel dan PDF, difilter tanggal atau bulan."
        href="/laporan"
      />
      <SalesReportView report={report} />
    </div>
  );
}
