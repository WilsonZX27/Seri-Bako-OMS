"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Factory } from "lucide-react";
import { useMemo, useState } from "react";
import { getVisibleNavGroups } from "@/components/layout/nav-items";
import { APP_RELEASE_NOTE } from "@/lib/app-version";
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

  function toggleGroup(groupId: string, currentlyClosed: boolean) {
    setClosedGroups((current) => ({ ...current, [groupId]: !currentlyClosed }));
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

  const activeGroupId = groups.find((group) => group.href === pathname)?.id ?? activeNavKey?.split("-")[0] ?? null;

  return (
    <div className={cn("flex h-dvh w-[var(--sb-sidebar-width)] flex-col border-r border-white/10 bg-[var(--sb-green-950)] text-white", mobile ? "w-full" : "")}>
      <div className="border-b border-white/10 px-3 py-3">
        <Link href={brandHref} prefetch={false} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-[2px] p-1 hover:bg-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-white/12 text-white ring-1 ring-white/10">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoUrl} alt={`${companyName} logo`} width={32} height={32} className="h-8 w-8 max-h-8 max-w-8 object-contain" />
            ) : (
              <Factory className="h-4 w-4" />
            )}
          </div>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold leading-tight">{companyName}</p>
              <p className="text-[10px] uppercase tracking-[0.08em] text-white/55">Operational ERP</p>
            </div>
        </Link>
      </div>

        <nav className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1.5">
          {groups.map((group) => {
            const visibleItems = group.items;
            const groupClosed = closedGroups[group.id] ?? group.id !== activeGroupId;
            return (
              <div key={group.id}>
                  <div className={cn("mb-1 flex w-full items-center rounded-[2px] font-medium leading-none text-white/60 hover:bg-white/8 hover:text-white", activeGroupId === group.id && group.href ? "bg-white/8 text-white" : "", mobile ? "min-h-9 text-[11px]" : "min-h-8 text-[10px]")}>
                    {group.href ? (
                      <Link href={group.href} prefetch={false} onClick={onNavigate} className="flex min-h-[inherit] min-w-0 flex-1 items-center px-2">
                        <span className={mobile ? "text-[11px]" : "text-[10px]"}>{group.label}</span>
                      </Link>
                    ) : (
                      <button type="button" className="flex min-h-[inherit] min-w-0 flex-1 items-center px-2 text-left" onClick={() => toggleGroup(group.id, groupClosed)} aria-expanded={!groupClosed}>
                        <span className={mobile ? "text-[11px]" : "text-[10px]"}>{group.label}</span>
                      </button>
                    )}
                    <button type="button" className="flex min-h-8 min-w-8 items-center justify-center rounded-[2px] hover:bg-white/10" onClick={() => toggleGroup(group.id, groupClosed)} aria-expanded={!groupClosed} aria-label={`${groupClosed ? "Expand" : "Collapse"} ${group.label}`}>
                      <ChevronDown className={cn("h-3 w-3 transition-transform", groupClosed ? "-rotate-90" : "")} />
                    </button>
                  </div>
                <div className={cn("space-y-0.5", groupClosed ? "hidden" : "")}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const itemKey = `${group.id}-${item.href}`;
                    const active = activeNavKey === itemKey;
                    const count = item.badgeKey ? navCounts[item.badgeKey] : undefined;
                    return (
                      <Link
                        key={itemKey}
                        href={item.href}
                        prefetch={false}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center gap-2 rounded-[2px] px-2 font-medium transition-colors",
                          mobile ? "min-h-10 text-xs" : "min-h-8 text-xs",
                          active ? "bg-[var(--sb-green-100)] text-[var(--sb-green-950)] ring-1 ring-white/10" : "text-white/72 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[var(--sb-green-950)]" : "text-white/55")} />
                          <>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {typeof count === "number" && count > 0 ? (
                              <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-[var(--sb-amber-300)] px-1.5 py-0.5 text-[10px] font-semibold leading-none text-[var(--sb-green-950)]">
                                {count > 99 ? "99+" : count}
                              </span>
                            ) : null}
                          </>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-2 text-[10px] text-white/45">{APP_RELEASE_NOTE}</div>
    </div>
  );
}
