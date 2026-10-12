import { redirect } from "next/navigation";
import { AdminShell } from "@/components/shell/admin-shell";
import { accessFor, allowedHrefs } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";
import { purchaseQueueCounts } from "@/lib/data/records";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");
  const counts = accessFor(user.role, "/pembelian") === "none" ? {} : await purchaseQueueCounts();

  return (
    <AdminShell user={user} allowedHrefs={allowedHrefs(user.role)} counts={counts}>
      {children}
    </AdminShell>
  );
}
