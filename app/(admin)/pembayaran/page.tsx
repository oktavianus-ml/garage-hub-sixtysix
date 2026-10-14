import { redirect } from "next/navigation";
import { accessFor } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";

export default async function PembayaranPage() {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");
  if ((await accessFor(user.role, "/pembayaran/catat", user.uid)) === "none") redirect("/");
  redirect("/pembayaran/catat");
}
