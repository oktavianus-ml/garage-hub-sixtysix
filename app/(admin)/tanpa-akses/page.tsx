import { PageHeader } from "@/components/ui/page-header";

export const metadata = { title: "Tidak ada menu" };

export default function TanpaAksesPage() {
  return (
    <div>
      <PageHeader
        title="Tidak ada menu"
        description="Akun ini belum diberi menu. Minta pemilik mengatur akses."
      />
    </div>
  );
}
