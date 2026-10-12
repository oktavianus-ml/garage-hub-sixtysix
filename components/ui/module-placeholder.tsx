import { GlassCard } from "@/components/ui/glass-card";
import { PageHeader } from "@/components/ui/page-header";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <GlassCard className="mt-5 px-6 py-14 text-center">
        <p className="text-base font-semibold">Modul ini menyusul</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Halaman ini sudah bisa dibuka. Isinya ditambahkan pada tahap berikutnya.
        </p>
      </GlassCard>
    </div>
  );
}
