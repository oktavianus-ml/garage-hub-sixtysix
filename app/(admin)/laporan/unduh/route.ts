import { NextResponse } from "next/server";
import { accessFor } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";
import { salesPdf } from "@/lib/data/report-pdf";
import { salesWorkbook } from "@/lib/data/report-xlsx";
import { loadSalesReport, resolvePeriod } from "@/lib/data/sales-report";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (accessFor(user.role, "/laporan") === "none") return NextResponse.redirect(new URL("/", request.url));

  const url = new URL(request.url);
  const period = resolvePeriod({
    mode: url.searchParams.get("mode") ?? undefined,
    bulan: url.searchParams.get("bulan") ?? undefined,
    dari: url.searchParams.get("dari") ?? undefined,
    sampai: url.searchParams.get("sampai") ?? undefined,
  });
  const report = await loadSalesReport(period);
  const pdf = url.searchParams.get("format") === "pdf";
  const file = pdf ? salesPdf(report) : salesWorkbook(report);
  const filename = `penjualan-${period.fileKey}.${pdf ? "pdf" : "xlsx"}`;

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": pdf
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
