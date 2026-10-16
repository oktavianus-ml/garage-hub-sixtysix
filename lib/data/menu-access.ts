import { fieldChanges, queueActivity, type ActivityActor } from "@/lib/data/activity";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { commitBatch, openBatch } from "@/lib/data/sync-receipt";
import {
  CONFIGURABLE_ROLES,
  configurableHrefs,
  defaultOpenHrefs,
  isConfigurableRole,
  menuTrackLabel,
  sanitizeHrefs,
  type ConfigurableRole,
} from "@/lib/auth/menus";
import { isRole, roleLabel, type Role } from "@/lib/auth/roles";

export type { ConfigurableRole };

export type MenuAccessStore = {
  roles: Partial<Record<ConfigurableRole, string[]>>;
  users: Record<string, string[]>;
};

const DOC = "settings/menuAccess";

function hrefList(value: unknown) {
  if (!Array.isArray(value)) return undefined;
  return sanitizeHrefs(value.filter((item): item is string => typeof item === "string"));
}

export async function loadMenuAccess(): Promise<MenuAccessStore> {
  const snap = await getAdminFirestore().doc(DOC).get();
  if (!snap.exists) return { roles: {}, users: {} };
  const data = snap.data() ?? {};
  const roles: MenuAccessStore["roles"] = {};
  if (data.roles && typeof data.roles === "object") {
    const raw = data.roles as Record<string, unknown>;
    for (const role of CONFIGURABLE_ROLES) {
      const list = hrefList(raw[role]);
      if (list !== undefined) roles[role] = list;
    }
  }
  const users: Record<string, string[]> = {};
  if (data.users && typeof data.users === "object") {
    for (const [id, value] of Object.entries(data.users as Record<string, unknown>)) {
      const list = hrefList(value);
      if (list !== undefined) users[id] = list;
    }
  }
  return { roles, users };
}

export async function menuAccessTarget(userId: string) {
  const snap = await getAdminFirestore().collection("users").doc(userId).get();
  const data = snap.data();
  if (!snap.exists || data?.active === false || !isRole(data?.role)) return null;
  return {
    name: typeof data.name === "string" && data.name.trim() ? data.name.trim() : "Pegawai",
    role: data.role,
  };
}

export function effectiveOpen(role: Role, userId: string, store: MenuAccessStore) {
  if (userId && Object.hasOwn(store.users, userId)) return store.users[userId];
  if (isConfigurableRole(role) && Object.hasOwn(store.roles, role)) return store.roles[role] ?? [];
  return defaultOpenHrefs(role);
}

export async function resolvedRoleMenus() {
  const store = await loadMenuAccess();
  const roles = Object.fromEntries(
    CONFIGURABLE_ROLES.map((role) => [role, store.roles[role] ?? defaultOpenHrefs(role)]),
  ) as Record<ConfigurableRole, string[]>;
  return { roles, users: store.users };
}

function tracked(hrefs: string[]) {
  const open = new Set(hrefs);
  return Object.fromEntries(
    configurableHrefs().map((href) => [menuTrackLabel(href), open.has(href) ? "Terbuka" : "Tertutup"]),
  );
}

async function writeStore(store: MenuAccessStore, actor: ActivityActor, label: string, before: string[], after: string[], extra: { field: string; before: string; after: string }[] = []) {
  const changes = [...extra, ...fieldChanges(tracked(before), tracked(after))];
  if (changes.length === 0) return false;
  const database = getAdminFirestore();
  const batch = openBatch();
  batch.set(database.doc(DOC), store);
  queueActivity(batch, {
    actor,
    action: "ubah",
    entity: "akses",
    entityId: "menu",
    label,
    changes,
  });
  await commitBatch(batch);
  return true;
}

export async function saveRoleMenus(role: ConfigurableRole, hrefs: string[], actor: ActivityActor) {
  const store = await loadMenuAccess();
  const before = store.roles[role] ?? defaultOpenHrefs(role);
  const after = sanitizeHrefs(hrefs);
  const next: MenuAccessStore = {
    roles: { ...store.roles, [role]: after },
    users: store.users,
  };
  return writeStore(next, actor, `Akses menu ${roleLabel[role]} diubah`, before, after);
}

export async function saveUserMenus(
  userId: string,
  name: string,
  role: ConfigurableRole,
  hrefs: string[],
  actor: ActivityActor,
) {
  const store = await loadMenuAccess();
  const followed = !Object.hasOwn(store.users, userId);
  const before = followed ? (store.roles[role] ?? defaultOpenHrefs(role)) : store.users[userId];
  const after = sanitizeHrefs(hrefs);
  const next: MenuAccessStore = {
    roles: store.roles,
    users: { ...store.users, [userId]: after },
  };
  const extra = followed ? [{ field: "Cara", before: "Ikut peran", after: "Khusus" }] : [];
  return writeStore(next, actor, `Akses menu ${name} diatur khusus`, before, after, extra);
}

export async function clearUserMenus(userId: string, name: string, role: ConfigurableRole, actor: ActivityActor) {
  const store = await loadMenuAccess();
  if (!Object.hasOwn(store.users, userId)) return false;
  const before = store.users[userId];
  const after = store.roles[role] ?? defaultOpenHrefs(role);
  const users = { ...store.users };
  delete users[userId];
  return writeStore(
    { roles: store.roles, users },
    actor,
    `Akses menu ${name} kembali ikut peran`,
    before,
    after,
    [{ field: "Cara", before: "Khusus", after: "Ikut peran" }],
  );
}
