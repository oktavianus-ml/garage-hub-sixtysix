import { CashPanel } from "@/components/workshop/cash-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { jakartaDate, monthKeyOf } from "@/lib/data/format";
import { cashInFor, getCashDay, previewMonth } from "@/lib/data/records";

export const metadata = { title: "Kas harian" };

export default async function KasPage() {
  const { canWrite } = await guard("/kas");
  const day = jakartaDate();
  const [cashIn, saved, month] = await Promise.all([
    cashInFor(day),
    getCashDay(day),
    previewMonth(monthKeyOf(day)),
  ]);

  return (
    <div>
      <PageHeader title="Kas harian" description="Uang masuk, pengeluaran kas, dan tutup kas hari ini." href="/kas" />
      <CashPanel
        day={day}
        cashIn={cashIn}
        saved={saved}
        canWrite={canWrite}
        monthClosed={month.closed}
      />
    </div>
  );
}
