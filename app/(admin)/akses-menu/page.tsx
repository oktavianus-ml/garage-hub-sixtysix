import { MenuAccessPanel } from "@/components/workshop/menu-access-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { resolvedRoleMenus } from "@/lib/data/menu-access";
import { listStaff } from "@/lib/data/records";

export const metadata = { title: "Akses menu" };

export default async function AksesMenuPage() {
  await guard("/akses-menu");
  const [staff, access] = await Promise.all([listStaff(), resolvedRoleMenus()]);
  return (
    <div>
      <PageHeader
        title="Akses menu"
        description="Atur menu yang terbuka untuk tiap peran, atau untuk satu orang."
        href="/akses-menu"
      />
      <MenuAccessPanel staff={staff} roles={access.roles} users={access.users} />
    </div>
  );
}
