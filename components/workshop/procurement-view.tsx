import { ProcurementsPanel } from "@/components/workshop/procurements-panel";
import { PageHeader } from "@/components/ui/page-header";
import { canPlacePurchase } from "@/lib/auth/access";
import { guard } from "@/lib/auth/guard";
import type { PurchaseStage } from "@/lib/data/purchase";
import { listProcurements, listSupplyItems } from "@/lib/data/records";

export async function ProcurementView({
  stage,
  title,
  description,
}: {
  stage: PurchaseStage;
  title: string;
  description: string;
}) {
  const { canWrite, user } = await guard(`/pengadaan/${stage}`);
  const [records, items] = await Promise.all([listProcurements(), listSupplyItems()]);
  return (
    <div>
      <PageHeader title={title} description={description} href={`/pengadaan/${stage}`} />
      <ProcurementsPanel
        stage={stage}
        records={records}
        items={items}
        canWrite={canWrite}
        canOrder={canPlacePurchase(user.role)}
      />
    </div>
  );
}
