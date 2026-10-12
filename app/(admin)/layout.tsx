import { redirect } from "next/navigation";
import { AdminShell } from "@/components/shell/admin-shell";
import { allowedHrefs } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");

  return (
    <AdminShell user={user} allowedHrefs={allowedHrefs(user.role)}>
      {children}
    </AdminShell>
  );
}
