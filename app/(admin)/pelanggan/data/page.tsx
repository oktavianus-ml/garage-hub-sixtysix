import { redirect } from "next/navigation";

export default async function DataPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  if (id) redirect(`/pelanggan?pelanggan=${encodeURIComponent(id)}`);
  redirect("/pelanggan?baru=pelanggan");
}
