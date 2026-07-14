"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Factory } from "lucide-react";
import { useMemo, useState } from "react";
import { getVisibleNavGroups } from "@/components/layout/nav-items";
import { APP_SPRINT, APP_VERSION } from "@/lib/app-version";
import { cn } from "@/lib/utils";
import type { SidebarCounts } from "@/server/queries/sidebar";
import type { UserRole } from "@/types/database";

type WorkspaceSidebarProps = {
  role: UserRole;
  mobile?: boolean;
  companyName?: string;
  companyLogoUrl?: string | null;
  brandHref?: string;
  onNavigate?: () => void;
  navCounts?: SidebarCounts;
  userName?: string;
  userRoleLabel?: string;
  permissionMap?: Record<string, boolean>;
};

export function WorkspaceSidebar({
  role,
  mobile = false,
  companyName = "Seri Bako",
  companyLogoUrl,
  brandHref = "/dashboard",
  onNavigate,
  navCounts = {},
  permissionMap,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => getVisibleNavGroups(role, permissionMap), [permissionMap, role]);
  const compact = false;

  function toggleGroup(groupId: string) {
    setClosedGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
  }

  function isActiveNavItem(href: string) {
    const [targetPath, queryString] = href.split("?");
    if (queryString) {
      if (pathname !== targetPath) return false;
      const targetParams = new URLSearchParams(queryString);
      for (const [key, value] of targetParams.entries()) {
        if (searchParams.get(key) !== value) return false;
      }
      return true;
    }
    if (pathname.startsWith(`${targetPath}/`)) return true;
    if (pathname !== targetPath) return false;
    return !searchParams.has("step") && !searchParams.has("status") && !searchParams.has("type");
  }

  const activeNavKey = (() => {
    for (const group of groups) {
      for (const item of group.items) {
        if (isActiveNavItem(item.href)) return `${group.id}-${item.href}`;
      }
    }
    return null;
  })();

  const activeGroupId = activeNavKey?.split("-")[0] ?? null;

  return (
    <div className={cn("flex h-dvh w-[var(--sb-sidebar-width)] flex-col border-r border-white/10 bg-[var(--sb-green-950)] text-white", mobile ? "w-full" : "")}>
      <div className="border-b border-white/10 px-3 py-3">
        <Link href={brandHref} onClick={onNavigate} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-[2px] p-1 hover:bg-white/10", compact ? "justify-center" : "")} title={compact ? companyName : undefined}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-white/12 text-white ring-1 ring-white/10">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain p-1" />
            ) : (
              <Factory className="h-4 w-4" />
            )}
          </div>
          {!compact ? (
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight">{companyName}</p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-white/55">Operational ERP</p>
            </div>
          ) : null}
        </Link>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1.5">
          {groups.map((group) => {
            const visibleItems = group.items;
            const groupClosed = closedGroups[group.id] ?? group.id !== activeGroupId;
            return (
              <div key={group.id}>
                {!compact ? (
                  <button
                    type="button"
                    className="mb-1 flex min-h-11 w-full items-center justify-between rounded-[2px] px-2 py-2 text-left text-xs font-semibold text-white/60 hover:bg-white/8 hover:text-white sm:min-h-8 sm:py-1 sm:text-[10px]"
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={!groupClosed}
                  >
                    <span>{group.label}</span>
                    <ChevronDown className={cn("h-3 w-3 transition-transform", groupClosed ? "-rotate-90" : "")} />
                  </button>
                ) : null}
                <div className={cn("space-y-0.5", groupClosed && !compact ? "hidden" : "")}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const itemKey = `${group.id}-${item.href}`;
                    const active = activeNavKey === itemKey;
                    const count = item.badgeKey ? navCounts[item.badgeKey] : undefined;
                    return (
                      <Link
                        key={itemKey}
                        href={item.href}
                        onClick={onNavigate}
                        title={compact ? item.label : undefined}
                        className={cn(
                          "flex min-h-11 items-center gap-2 rounded-[2px] px-2 text-sm font-medium transition-colors sm:min-h-8 sm:text-xs",
                          compact ? "justify-center px-0" : "",
                          active ? "bg-[var(--sb-amber-100)] text-[var(--sb-green-950)] ring-1 ring-white/10" : "text-white/72 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[var(--sb-green-950)]" : "text-white/55")} />
                        {!compact ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {typeof count === "number" && count > 0 ? (
                              <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-[var(--sb-amber-300)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--sb-green-950)]">
                                {count > 99 ? "99+" : count}
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      {!compact ? <div className="border-t border-white/10 px-3 py-2 text-[10px] text-white/45">v{APP_VERSION} / {APP_SPRINT}</div> : null}
    </div>
  );
}
