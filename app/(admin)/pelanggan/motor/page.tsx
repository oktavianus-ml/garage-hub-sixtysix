import { redirect } from "next/navigation";

export default async function MotorPelangganPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; pelanggan?: string }>;
}) {
  const { id, pelanggan } = await searchParams;
  if (id) redirect(`/pelanggan?motor=${encodeURIComponent(id)}`);
  if (pelanggan) redirect(`/pelanggan?pelanggan=${encodeURIComponent(pelanggan)}&baru=motor`);
  redirect("/pelanggan?baru=motor");
}
