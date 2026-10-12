import { redirect } from "next/navigation";
import { accessFor } from "@/lib/auth/access";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";

export async function guard(href: string): Promise<{
  user: SessionUser;
  canWrite: boolean;
}> {
  const user = await getSessionUser();
  if (!user) redirect("/api/session");
  const level = accessFor(user.role, href);
  if (level === "none") redirect("/");
  return { user, canWrite: level === "write" };
}
