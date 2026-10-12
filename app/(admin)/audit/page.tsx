import { AuditPanel } from "@/components/workshop/audit-panel";
import { PageHeader } from "@/components/ui/page-header";
import { buttonClass, inputClass } from "@/components/ui/controls";
import { guard } from "@/lib/auth/guard";
import { loadBudgetAudit, parseMonth } from "@/lib/data/budget";

export const metadata = { title: "Audit budget" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string }>;
}) {
  const { canWrite } = await guard("/audit");
  const params = await searchParams;
  const month = parseMonth(params.bulan);
  const audit = await loadBudgetAudit(month);

  return (
    <div>
      <PageHeader
        title="Audit budget"
        description="Cek anggaran bulanan terhadap pembelian, pengadaan, dan uang yang benar-benar keluar."
        href="/audit"
      />
      <form key={month} action="/audit" className="mt-5 flex max-w-md gap-2">
        <input type="month" name="bulan" defaultValue={month} className={inputClass} aria-label="Bulan" />
        <button className={buttonClass}>Lihat</button>
      </form>
      <AuditPanel key={`${month}:${audit.saved}:${audit.planTotal}:${audit.note}`} audit={audit} canWrite={canWrite} />
    </div>
  );
}
