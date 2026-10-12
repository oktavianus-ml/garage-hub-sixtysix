import { StaffPanel } from "@/components/workshop/staff-panel";
import { PageHeader } from "@/components/ui/page-header";
import { guard } from "@/lib/auth/guard";
import { listStaff } from "@/lib/data/records";

export const metadata = { title: "Pegawai" };

export default async function PegawaiPage() {
  await guard("/pegawai");
  const staff = await listStaff();
  return (
    <div>
      <PageHeader title="Pegawai" description="Akun email pegawai dan peran yang menentukan menu." href="/pegawai" />
      <StaffPanel staff={staff} />
    </div>
  );
}
