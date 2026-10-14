import { SettingsPanel } from "@/components/workshop/settings-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { getWorkshopSettings } from "@/lib/data/settings";

export const metadata = { title: "Pengaturan" };

export default async function PengaturanPage() {
  const { canWrite } = await guard("/pengaturan");
  const settings = await getWorkshopSettings();

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        description="Profil bengkel, mode tampilan, dan tempat pengaturan struk."
        href="/pengaturan"
      />
      <SettingsPanel settings={settings} canWrite={canWrite} />
    </div>
  );
}
