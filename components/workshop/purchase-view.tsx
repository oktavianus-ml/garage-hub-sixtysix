import { PurchasesPanel } from "@/components/workshop/purchases-panel";
import { PageHeader } from "@/components/ui/page-header";
import { canPlacePurchase } from "@/lib/auth/access";
import { guard } from "@/lib/auth/guard";
import type { PurchaseStage } from "@/lib/data/purchase";
import { listDistributors, listProducts, listPurchases } from "@/lib/data/records";

export async function PurchaseView({
  stage,
  title,
  description,
}: {
  stage: PurchaseStage;
  title: string;
  description: string;
}) {
  const { canWrite, user } = await guard(`/pembelian/${stage}`);
  const [purchases, distributors, products] = await Promise.all([
    listPurchases(),
    listDistributors(),
    listProducts(),
  ]);
  return (
    <div>
      <PageHeader title={title} description={description} href={`/pembelian/${stage}`} />
      <PurchasesPanel
        stage={stage}
        purchases={purchases}
        distributors={distributors}
        products={products}
        canWrite={canWrite}
        canOrder={canPlacePurchase(user.role)}
      />
    </div>
  );
}
