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
  const [purchaseLevel, procurementLevel, hrefs] = await Promise.all([
    accessFor(user.role, "/pembelian", user.uid),
    accessFor(user.role, "/pengadaan", user.uid),
    allowedHrefs(user.role, user.uid),
  ]);
  const [purchaseCounts, procurementCounts] = await Promise.all([
    purchaseLevel === "none" ? Promise.resolve({}) : purchaseQueueCounts(),
    procurementLevel === "none" ? Promise.resolve({}) : procurementQueueCounts(),
  ]);
  const counts = { ...purchaseCounts, ...procurementCounts };

  return (
    <AdminShell user={user} allowedHrefs={hrefs} counts={counts}>
      {children}
    </AdminShell>
  );
}
