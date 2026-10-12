import { CashPanel } from "@/components/workshop/cash-panel";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { guard } from "@/lib/auth/guard";
import { isBusinessDay, jakartaDate, monthKeyOf } from "@/lib/data/format";
import { cashSnapshot, getCashDay, previewMonth } from "@/lib/data/records";

export const metadata = { title: "Pantauan" };

export default async function KasPage({
  searchParams,
}: {
  searchParams: Promise<{ hari?: string }>;
}) {
  const { canWrite } = await guard("/kas");
  const params = await searchParams;
  const day = params.hari && isBusinessDay(params.hari) ? params.hari : jakartaDate();
  const [{ channels, payments }, saved, month] = await Promise.all([
    cashSnapshot(day),
    getCashDay(day),
    previewMonth(monthKeyOf(day)),
  ]);

  return (
    <div>
      <PageHeader
        title="Pantauan"
        description="Tiga jumlah hari ini, lalu daftar orang yang membayar."
        href="/kas"
      />
      <form action="/kas" className="mt-5 flex max-w-md gap-2">
        <input type="date" name="hari" defaultValue={day} className={inputClass} />
        <button className={buttonClass}>Lihat</button>
      </form>
      <CashPanel
        key={day}
        day={day}
        channels={channels}
        payments={payments}
        saved={saved}
        canWrite={canWrite}
        monthClosed={month.closed}
      />
    </div>
  );
}
