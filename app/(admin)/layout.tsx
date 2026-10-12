import { redirect } from "next/navigation";
import { AdminShell } from "@/components/shell/admin-shell";
import { accessFor, allowedHrefs } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";
import { procurementQueueCounts, purchaseQueueCounts } from "@/lib/data/records";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");
  const [purchaseCounts, procurementCounts] = await Promise.all([
    accessFor(user.role, "/pembelian") === "none" ? Promise.resolve({}) : purchaseQueueCounts(),
    accessFor(user.role, "/pengadaan") === "none" ? Promise.resolve({}) : procurementQueueCounts(),
  ]);
  const counts = { ...purchaseCounts, ...procurementCounts };

  return (
    <AdminShell user={user} allowedHrefs={allowedHrefs(user.role)} counts={counts}>
      {children}
    </AdminShell>
  );
}
