import { DistributorsPanel } from "@/components/workshop/distributors-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listDistributors } from "@/lib/data/records";

export const metadata = { title: "Distributor" };

export default async function DistributorPage() {
  const { canWrite } = await guard("/distributor");
  const distributors = await listDistributors();
  return (
    <div>
      <PageHeader
        title="Distributor"
        description="Pemasok tempat bengkel membeli barang."
        href="/distributor"
      />
      <DistributorsPanel distributors={distributors} canWrite={canWrite} />
    </div>
  );
}
