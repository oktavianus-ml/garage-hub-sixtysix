import { AccountLedgerPanel } from "@/components/workshop/account-ledger-panel";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { loadAccountLedger } from "@/lib/data/account-ledger";
import { parseMonth } from "@/lib/data/budget";

export const metadata = { title: "Rekap akun" };

export default async function RekapPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  await guard("/rekap");
  const month = parseMonth((await searchParams).bulan);
  const ledger = await loadAccountLedger(month);

  return (
    <div>
      <PageHeader
        title="Rekap akun"
        description="Penjualan produk bulan ini, lalu keuntungan yang dibagi."
        href="/rekap"
      />
      <form key={month} action="/rekap" className="mt-5 flex max-w-md gap-2">
        <input type="month" name="bulan" defaultValue={month} className={inputClass} aria-label="Bulan" />
        <button className={buttonClass}>Lihat</button>
      </form>
      <AccountLedgerPanel ledger={ledger} />
    </div>
  );
}
