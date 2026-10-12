import { ProfitPanel } from "@/components/workshop/profit-panel";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { guard } from "@/lib/auth/guard";
import { jakartaDate, monthKeyOf } from "@/lib/data/format";
import { previewMonth } from "@/lib/data/records";

export const metadata = { title: "Bagi hasil" };

export default async function BagiHasilPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { canWrite } = await guard("/bagi-hasil");
  const params = await searchParams;
  const month =
    params.bulan && /^\d{4}-\d{2}$/.test(params.bulan) ? params.bulan : monthKeyOf(jakartaDate());
  const preview = await previewMonth(month);

  return (
    <div>
      <PageHeader
        title="Bagi hasil"
        description="Laba bulan ini dikunci setelah tutup buku. Dasarnya pendapatan dikurangi harga pokok dan pengeluaran kas."
      />
      <form action="/bagi-hasil" className="mt-5 flex max-w-md gap-2">
        <input type="month" name="bulan" defaultValue={month} className={inputClass} />
        <button className={buttonClass}>Lihat</button>
      </form>
      <ProfitPanel month={month} canWrite={canWrite} {...preview} />
    </div>
  );
}
