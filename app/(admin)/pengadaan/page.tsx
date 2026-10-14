import { redirect } from "next/navigation";
import { firstOpenHref } from "@/lib/auth/access";
import { getSessionUser } from "@/lib/auth/session";

export default async function PengadaanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");
  redirect((await firstOpenHref(user.role, user.uid, "/pengadaan")) ?? "/");
}
