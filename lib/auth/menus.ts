import type { Role } from "@/lib/auth/roles";
import { isNavHidden, navGroups } from "@/lib/nav";

export type Access = "none" | "read" | "write";

export const MENU_ACCESS_HREF = "/akses-menu";

export const CONFIGURABLE_ROLES = ["investor", "kasir", "gudang", "mekanik"] as const;

export type ConfigurableRole = (typeof CONFIGURABLE_ROLES)[number];

export function isConfigurableRole(value: unknown): value is ConfigurableRole {
  return typeof value === "string" && CONFIGURABLE_ROLES.includes(value as ConfigurableRole);
}

const shared: Record<string, Access> = {
  "/": "read",
  "/service": "none",
  "/kasir": "none",
  "/pelanggan": "none",
  "/produk": "none",
  "/inventori": "none",
  "/kas": "none",
  "/pembayaran": "none",
  "/bagi-hasil": "none",
};

const byRole: Record<Role, Record<string, Access>> = {
  pemilik: {},
  investor: {
    "/": "read",
    "/service": "read",
    "/kasir": "read",
    "/pelanggan": "read",
    "/produk": "read",
    "/inventori": "read",
    "/distributor": "read",
    "/pembelian": "read",
    "/pengadaan": "read",
    "/kas": "read",
    "/pembayaran": "read",
    "/bagi-hasil": "read",
    "/audit": "read",
  },
  kasir: {
    "/": "read",
    "/service": "write",
    "/kasir": "write",
    "/pelanggan": "write",
    "/produk": "read",
    "/inventori": "read",
    "/kas": "write",
    "/pembayaran": "write",
    "/pengadaan": "write",
  },
  gudang: {
    "/": "read",
    "/produk": "write",
    "/inventori": "write",
    "/distributor": "write",
    "/pembelian": "write",
    "/pengadaan": "write",
  },
  mekanik: {
    "/": "read",
    "/service": "write",
    "/pelanggan": "read",
    "/produk": "read",
    "/inventori": "read",
  },
};

export type MenuLeaf = { href: string; label: string };

export type MenuNode =
  | { kind: "leaf"; href: string; label: string }
  | { kind: "branch"; label: string; children: MenuLeaf[] };

export type MenuGroup = { label: string; nodes: MenuNode[] };

export function menuGroups(): MenuGroup[] {
  return navGroups.flatMap((group) => {
    const nodes: MenuNode[] = [];
    for (const item of group.items) {
      if (item.hidden || item.href === MENU_ACCESS_HREF) continue;
      const children = (item.children ?? []).filter((child) => !child.hidden && child.href !== MENU_ACCESS_HREF);
      if (children.length > 0) {
        nodes.push({
          kind: "branch",
          label: item.label,
          children: children.map((child) => ({ href: child.href, label: child.label })),
        });
      } else if (!item.children?.length) {
        nodes.push({ kind: "leaf", href: item.href, label: item.label });
      }
    }
    return nodes.length === 0 ? [] : [{ label: group.label, nodes }];
  });
}

export function configurableHrefs() {
  const hrefs: string[] = [];
  for (const group of menuGroups()) {
    for (const node of group.nodes) {
      if (node.kind === "leaf") hrefs.push(node.href);
      else hrefs.push(...node.children.map((child) => child.href));
    }
  }
  return hrefs;
}

export function menuTrackLabel(href: string) {
  for (const group of menuGroups()) {
    for (const node of group.nodes) {
      if (node.kind === "leaf" && node.href === href) return node.label;
      if (node.kind === "branch") {
        const child = node.children.find((item) => item.href === href);
        if (child) return `${node.label} · ${child.label}`;
      }
    }
  }
  return href;
}

export function branchChildren(prefix: "/pembelian" | "/pengadaan") {
  return configurableHrefs().filter((href) => href.startsWith(`${prefix}/`));
}

function legacyKey(href: string) {
  if (href === "/pembelian" || href.startsWith("/pembelian/")) return "/pembelian";
  if (href === "/pengadaan" || href.startsWith("/pengadaan/")) return "/pengadaan";
  if (href === "/pelanggan" || href.startsWith("/pelanggan/")) return "/pelanggan";
  if (href === "/pembayaran" || href.startsWith("/pembayaran/")) return "/pembayaran";
  return href;
}

export function builtinAccess(role: Role, href: string): Access {
  if (role === "pemilik") return isNavHidden(href) ? "none" : "write";
  const key = legacyKey(href);
  return byRole[role][key] ?? shared[key] ?? "none";
}

export function defaultOpenHrefs(role: Role) {
  if (role === "pemilik") return configurableHrefs();
  return configurableHrefs().filter((href) => builtinAccess(role, href) !== "none");
}

export function sanitizeHrefs(hrefs: string[]) {
  const wanted = new Set(hrefs);
  return configurableHrefs().filter((href) => wanted.has(href));
}

const configurable = () => new Set(configurableHrefs());

export function menuKey(href: string) {
  if (href === MENU_ACCESS_HREF) return MENU_ACCESS_HREF;
  if (isNavHidden(href)) return null;
  if (configurable().has(href)) return href;
  if (href === "/pelanggan" || href.startsWith("/pelanggan/")) return "/pelanggan";
  if (href === "/pembayaran" || href.startsWith("/pembayaran/")) return "/pembayaran/catat";
  if (href === "/pembelian" || href === "/pengadaan") return href;
  return null;
}
