"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { isActivePath, navGroups, type NavItem } from "@/lib/nav";

export function NavList({
  showLabels,
  onNavigate,
  allowedHrefs,
  counts = {},
}: {
  showLabels: boolean;
  onNavigate?: () => void;
  allowedHrefs: string[];
  counts?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const allowed = new Set(allowedHrefs);
  const groups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.flatMap((item) => {
        const children = (item.children ?? []).filter((child) => allowed.has(child.href));
        if (!allowed.has(item.href) && children.length === 0) return [];
        return [{ ...item, children }];
      }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <nav aria-label="Menu utama" className="flex flex-col gap-5">
      {groups.map((group) => (
        <div key={group.label}>
          <p
            className={cn(
              "mb-1 flex items-center gap-2 px-3 text-[11px] font-semibold tracking-[0.14em] text-muted uppercase",
              !showLabels && "sr-only",
            )}
          >
            <span className="h-px w-3 shrink-0 bg-amber" aria-hidden />
            {group.label}
          </p>
          <ul className="flex flex-col gap-1">
            {group.items.map((item) => {
              const children = item.children ?? [];
              const childActive = children.some((child) => isActivePath(pathname, child.href));
              const active = isActivePath(pathname, item.href) || childActive;
              const open = children.length === 0 || !collapsed[item.href];
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  {children.length > 0 ? (
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() =>
                        setCollapsed((current) => ({ ...current, [item.href]: !current[item.href] }))
                      }
                      className={navClass(active, showLabels)}
                    >
                      <span className="relative shrink-0">
                        <Icon className="size-5" aria-hidden />
                        {!showLabels && !open ? (
                          <ClosedIconBadge count={parentQueue(children, counts)} active={active} />
                        ) : null}
                      </span>
                      <span className={cn("min-w-0 flex-1 truncate text-left", !showLabels && "sr-only")}>
                        {item.label}
                      </span>
                      {showLabels && !open ? <QueueBadge count={parentQueue(children, counts)} active={active} /> : null}
                      {showLabels ? (
                        open ? (
                          <ChevronDown className="size-4 shrink-0" aria-hidden />
                        ) : (
                          <ChevronRight className="size-4 shrink-0" aria-hidden />
                        )
                      ) : null}
                    </button>
                  ) : (
                    <NavLink
                      item={item}
                      active={active}
                      showLabels={showLabels}
                      onNavigate={onNavigate}
                      count={0}
                    />
                  )}
                  {open && children.length > 0 ? (
                    <ul className={cn("mt-1 flex flex-col gap-1", showLabels && "ml-3 border-l border-line pl-2")}>
                      {children.map((child) => (
                        <li key={child.href}>
                          <NavLink
                            item={child}
                            active={isActivePath(pathname, child.href)}
                            showLabels={showLabels}
                            onNavigate={onNavigate}
                            count={counts[child.href] ?? 0}
                            nested
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function parentQueue(children: NavItem[], counts: Record<string, number>) {
  const hrefs = new Set(children.map((child) => child.href));
  let total = 0;
  if (hrefs.has("/pembelian/permintaan")) total += counts["/pembelian/permintaan"] ?? 0;
  else if (hrefs.has("/pembelian/persetujuan")) total += counts["/pembelian/persetujuan"] ?? 0;
  if (hrefs.has("/pembelian/penerimaan")) total += counts["/pembelian/penerimaan"] ?? 0;
  return total;
}

function navClass(active: boolean, showLabels: boolean, nested = false) {
  return cn(
    "flex w-full min-w-0 min-h-11 items-center gap-2 rounded-xl border-l-[3px] text-sm font-medium transition-colors",
    showLabels ? "px-3" : "justify-center px-0",
    nested && showLabels && "min-h-10 text-[13px]",
    active ? "border-amber bg-amber-soft text-amber" : "border-transparent text-ink hover-wash",
  );
}

function QueueBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null;
  const badge = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-semibold tabular-nums",
        active
          ? "bg-rail text-ink ring-1 ring-amber/25"
          : "bg-[color-mix(in_srgb,var(--amber)_24%,var(--bg-rail))] text-amber ring-1 ring-amber/20",
      )}
      aria-label={`${count} perlu diproses`}
    >
      {badge}
    </span>
  );
}

function ClosedIconBadge({ count, active }: { count: number; active: boolean }) {
  if (count <= 0) return null;
  const badge = count > 99 ? "99+" : String(count);
  return (
    <span
      className={cn(
        "absolute -top-2 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[10px] font-semibold",
        active ? "bg-rail text-ink" : "bg-[color-mix(in_srgb,var(--amber)_24%,var(--bg-rail))] text-amber",
      )}
    >
      {badge}
    </span>
  );
}

function NavLink({
  item,
  active,
  showLabels,
  onNavigate,
  count,
  nested = false,
}: {
  item: NavItem;
  active: boolean;
  showLabels: boolean;
  onNavigate?: () => void;
  count: number;
  nested?: boolean;
}) {
  const Icon = item.icon;
  const badge = count > 99 ? "99+" : String(count);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full min-w-0 min-h-11 items-center gap-2 rounded-xl border-l-[3px] text-sm font-medium transition-colors",
        showLabels ? "px-3" : "justify-center px-0",
        nested && showLabels && "min-h-10 text-[13px]",
        active ? "border-amber bg-amber-soft text-amber" : "border-transparent text-ink hover-wash",
      )}
    >
      <span className="relative shrink-0">
        <Icon className={nested ? "size-4" : "size-5"} aria-hidden />
        {!showLabels && count > 0 ? (
          <span
            className={cn(
              "absolute -top-2 -right-2 inline-flex h-4 min-w-4 items-center justify-center rounded-md px-1 text-[10px] font-semibold",
              active ? "bg-rail text-ink" : "bg-[color-mix(in_srgb,var(--amber)_24%,var(--bg-rail))] text-amber",
            )}
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", !showLabels && "sr-only")}>{item.label}</span>
      {showLabels && count > 0 ? (
        <span
          className={cn(
            "inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-lg px-1.5 text-xs font-semibold tabular-nums",
            active
              ? "bg-rail text-ink ring-1 ring-amber/25"
              : "bg-[color-mix(in_srgb,var(--amber)_24%,var(--bg-rail))] text-amber ring-1 ring-amber/20",
          )}
          aria-label={`${count} perlu diproses`}
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
