import { redirect } from "next/navigation";
import { accessFor, allowedHrefs } from "@/lib/auth/access";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { isNavHidden } from "@/lib/nav";

export async function guard(href: string): Promise<{
  user: SessionUser;
  canWrite: boolean;
}> {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");
  const level = await accessFor(user.role, href, user.uid);
  if (level === "none" || isNavHidden(href)) {
    const allowed = await allowedHrefs(user.role, user.uid);
    const next = allowed.find((item) => item !== href);
    redirect(next ?? "/tanpa-akses");
  }
  return { user, canWrite: level === "write" };
}
