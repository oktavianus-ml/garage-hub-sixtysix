import { AccountsPanel } from "@/components/workshop/accounts-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listChartAccounts } from "@/lib/data/accounts";

export const metadata = { title: "Akun (COA)" };

export default async function AkunPage() {
  const { canWrite } = await guard("/akun");
  const accounts = await listChartAccounts();
  return (
    <div>
      <PageHeader
        title="Akun (COA)"
        description="Daftar akun sederhana untuk pendapatan, beban, dan modal."
        href="/akun"
      />
      <AccountsPanel accounts={accounts} canWrite={canWrite} />
    </div>
  );
}
