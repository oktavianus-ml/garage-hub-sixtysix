import type { Role } from "@/lib/auth/roles";
import {
  branchChildren,
  builtinAccess,
  configurableHrefs,
  hasFullMenuAccess,
  MENU_ACCESS_HREF,
  menuKey,
  type Access,
} from "@/lib/auth/menus";
import { effectiveOpen, loadMenuAccess } from "@/lib/data/menu-access";

export type { Access };

export async function accessFor(role: Role, href: string, userId = ""): Promise<Access> {
  const key = menuKey(href);
  if (key === MENU_ACCESS_HREF) return hasFullMenuAccess(role) ? "write" : "none";
  if (!key) return "none";
  const open = new Set(effectiveOpen(role, userId, await loadMenuAccess()));
  if (key === "/pembelian" || key === "/pengadaan") {
    const children = branchChildren(key).filter((child) => open.has(child));
    if (children.length === 0) return "none";
    return children.some((child) => builtinAccess(role, child) === "write") ? "write" : "read";
  }
  if (!open.has(key)) return "none";
  return builtinAccess(role, key) === "write" ? "write" : "read";
}

export async function allowedHrefs(role: Role, userId = "") {
  const open = new Set(effectiveOpen(role, userId, await loadMenuAccess()));
  const hrefs = configurableHrefs().filter((href) => open.has(href));
  if (hasFullMenuAccess(role)) hrefs.push(MENU_ACCESS_HREF);
  return hrefs;
}

export async function firstOpenHref(role: Role, userId: string, prefix: "/pembelian" | "/pengadaan") {
  const allowed = new Set(await allowedHrefs(role, userId));
  return branchChildren(prefix).find((href) => allowed.has(href)) ?? null;
}

export function canMarkPaid(role: Role) {
  return role === "pemilik" || role === "investor" || role === "kasir";
}

export function canPlacePurchase(role: Role) {
  return role === "pemilik" || role === "investor";
}
