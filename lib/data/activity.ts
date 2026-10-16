import type { Transaction, WriteBatch } from "firebase-admin/firestore";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { isRole, type Role } from "@/lib/auth/roles";
import {
  activityActionLabel,
  activityEntityLabel,
  ACTIVITY_ENTITIES,
  isActivityEntity,
  type ActivityAction,
  type ActivityEntity,
} from "@/lib/data/activity-kinds";
import { jakartaDate } from "@/lib/data/format";

export {
  activityActionLabel,
  activityEntityLabel,
  ACTIVITY_ENTITIES,
  isActivityEntity,
  type ActivityAction,
  type ActivityEntity,
};

export type ActivityActor = {
  uid: string;
  name: string;
  role: Role;
};

export type ActivityChange = {
  field: string;
  before: string;
  after: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  actorId: string;
  actorName: string;
  actorRole: Role;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  label: string;
  changes: ActivityChange[];
};

export type ActivityDraft = {
  actor: ActivityActor;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  label: string;
  changes: ActivityChange[];
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const QUERY_CAP = 500;
const PAGE_CAP = 200;

export function fieldChanges(before: Record<string, string>, after: Record<string, string>) {
  const fields = [...Object.keys(after), ...Object.keys(before).filter((field) => !(field in after))];
  return fields.flatMap((field) => {
    const previous = before[field] ?? "";
    const next = after[field] ?? "";
    if (previous === next) return [];
    return [{ field, before: previous, after: next }];
  });
}

export function queueActivity(writer: Transaction | WriteBatch, draft: ActivityDraft) {
  if (draft.changes.length === 0) return;
  const ref = getAdminFirestore().collection("activityLogs").doc();
  const data = {
    at: new Date().toISOString(),
    actorId: draft.actor.uid,
    actorName: draft.actor.name,
    actorRole: draft.actor.role,
    action: draft.action,
    entity: draft.entity,
    entityId: draft.entityId,
    label: draft.label,
    changes: draft.changes,
  };
  if ("commit" in writer) writer.set(ref, data);
  else writer.set(ref, data);
}

export function activityWindow(from?: string, to?: string) {
  const end = to && DAY.test(to) ? to : jakartaDate();
  const start =
    from && DAY.test(from) ? from : jakartaDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}

function mapChange(value: unknown): ActivityChange | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.field !== "string") return null;
  return {
    field: row.field,
    before: typeof row.before === "string" ? row.before : "",
    after: typeof row.after === "string" ? row.after : "",
  };
}

function mapActivity(id: string, data: FirebaseFirestore.DocumentData): ActivityEntry | null {
  if (!isRole(data.actorRole)) return null;
  if (data.action !== "buat" && data.action !== "ubah") return null;
  if (typeof data.entity !== "string" || !isActivityEntity(data.entity)) return null;
  if (typeof data.at !== "string" || typeof data.label !== "string") return null;
  const changes = Array.isArray(data.changes) ? data.changes.flatMap((item) => {
    const change = mapChange(item);
    return change ? [change] : [];
  }) : [];
  return {
    id,
    at: data.at,
    actorId: typeof data.actorId === "string" ? data.actorId : "",
    actorName: typeof data.actorName === "string" ? data.actorName : "Pengguna",
    actorRole: data.actorRole,
    action: data.action,
    entity: data.entity,
    entityId: typeof data.entityId === "string" ? data.entityId : "",
    label: data.label,
    changes,
  };
}

export async function listActivity(filter: {
  from?: string;
  to?: string;
  actorId?: string;
  entity?: string;
  action?: string;
  q?: string;
}) {
  const window = activityWindow(filter.from, filter.to);
  const start = new Date(`${window.from}T00:00:00+07:00`).toISOString();
  const end = new Date(`${window.to}T23:59:59.999+07:00`).toISOString();
  const snap = await getAdminFirestore()
    .collection("activityLogs")
    .where("at", ">=", start)
    .where("at", "<=", end)
    .orderBy("at", "desc")
    .limit(QUERY_CAP)
    .get();

  const rows = snap.docs.flatMap((doc) => {
    const entry = mapActivity(doc.id, doc.data());
    return entry ? [entry] : [];
  });
  const actors = [...new Map(rows.map((row) => [row.actorId, { id: row.actorId, name: row.actorName }])).values()]
    .filter((actor) => actor.id)
    .sort((a, b) => a.name.localeCompare(b.name, "id"));

  const entity = filter.entity && isActivityEntity(filter.entity) ? filter.entity : "";
  const action = filter.action === "buat" || filter.action === "ubah" ? filter.action : "";
  const actorId = filter.actorId ?? "";
  const query = (filter.q ?? "").trim().toLowerCase();
  const entries = rows
    .filter((row) => {
      if (actorId && row.actorId !== actorId) return false;
      if (entity && row.entity !== entity) return false;
      if (action && row.action !== action) return false;
      if (query && !row.label.toLowerCase().includes(query)) return false;
      return true;
    })
    .slice(0, PAGE_CAP);

  return { ...window, entries, actors, entity, action, actorId, q: (filter.q ?? "").trim() };
}

export function formatActivityTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
