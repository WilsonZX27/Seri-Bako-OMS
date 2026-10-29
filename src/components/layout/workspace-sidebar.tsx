"use client";

import { activeNavigationHref } from "@/lib/active-navigation";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, Factory } from "lucide-react";
import { useMemo, useState } from "react";
import { getVisibleNavGroups } from "@/components/layout/nav-items";
import { APP_RELEASE_NOTE } from "@/lib/app-version";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import { useNavigationAttention } from "@/components/layout/navigation-attention";

type WorkspaceSidebarProps = {
  role: UserRole;
  mobile?: boolean;
  companyName?: string;
  companyLogoUrl?: string | null;
  brandHref?: string;
  onNavigate?: () => void;
  userName?: string;
  userRoleLabel?: string;
  permissionMap?: Record<string, boolean>;
  attentionHrefs?: string[];
};

export function WorkspaceSidebar({
  role,
  mobile = false,
  companyName = "Operations",
  companyLogoUrl,
  brandHref = "/dashboard",
  onNavigate,
  permissionMap,
  attentionHrefs: suppliedAttentionHrefs,
}: WorkspaceSidebarProps) {
  const sharedAttentionHrefs = useNavigationAttention();
  const attentionHrefs = suppliedAttentionHrefs ?? sharedAttentionHrefs;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const groups = useMemo(() => getVisibleNavGroups(role, permissionMap, attentionHrefs), [attentionHrefs, permissionMap, role]);

  function toggleGroup(groupId: string, currentlyClosed: boolean) {
    setClosedGroups((current) => ({ ...current, [groupId]: !currentlyClosed }));
  }

  const activeHref = activeNavigationHref(pathname, searchParams, groups.flatMap(group => group.items.map(item => item.href)));
  const activeNavKey = groups.flatMap(group => group.items.map(item => ({group: group.id, href: item.href})))
    .find(item => item.href === activeHref);
  const activeGroupId = groups.find((group) => group.href === pathname)?.id ?? activeNavKey?.group ?? null;

  return (
    <div className={cn("flex h-dvh w-[var(--sb-sidebar-width)] flex-col border-r border-white/10 bg-[var(--sb-green-950)] text-white", mobile ? "w-full" : "")}>
      <div className="border-b border-white/10 px-3 py-3">
        <Link href={brandHref} prefetch={false} onClick={onNavigate} className="flex min-w-0 flex-1 items-center gap-3 rounded-[var(--sb-control-radius)] p-1 hover:bg-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sb-control-radius)] bg-white/12 text-white ring-1 ring-white/10">
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
            const hasAttention = visibleItems.some(item => item.hasAttention);
            const groupClosed = closedGroups[group.id] ?? group.id !== activeGroupId;
            return (
              <div key={group.id}>
                  <div className={cn("mb-1 flex w-full items-center rounded-[var(--sb-control-radius)] font-medium leading-none text-white/60 hover:bg-white/8 hover:text-white", activeGroupId === group.id && group.href ? "bg-white/8 text-white" : "", mobile ? "min-h-11 text-[11px]" : "min-h-9 text-[10px]")}>
                    {group.href ? (
                      <Link href={group.href} prefetch={false} onClick={onNavigate} className="flex min-h-[inherit] min-w-0 flex-1 items-center px-2">
                        <span className={mobile ? "text-[11px]" : "text-[10px]"}>{group.label}</span>
                      </Link>
                    ) : (
                      <button type="button" className="flex min-h-[inherit] min-w-0 flex-1 items-center px-2 text-left" onClick={() => toggleGroup(group.id, groupClosed)} aria-expanded={!groupClosed}>
                        <span className={mobile ? "text-[11px]" : "text-[10px]"}>{group.label}</span>
                      </button>
                    )}
                    <button type="button" className={cn("flex items-center justify-center rounded-[var(--sb-control-radius)] hover:bg-white/10", mobile ? "min-h-11 min-w-11" : "min-h-9 min-w-9")} onClick={() => toggleGroup(group.id, groupClosed)} aria-expanded={!groupClosed} aria-label={`${groupClosed ? "Expand" : "Collapse"} ${group.label}`}>
                      <ChevronDown className={cn("h-3 w-3 transition-transform", groupClosed ? "-rotate-90" : "")} />
                    </button>
                    {hasAttention && groupClosed ? <span className="mr-2 size-1.5 shrink-0 rounded-full bg-amber-400" role="img" aria-label="Pending update" /> : null}
                  </div>
                <div className={cn("space-y-0.5", groupClosed ? "hidden" : "")}>
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = activeNavKey?.group === group.id && activeNavKey.href === item.href;
                    return (
                      <Link
                        key={`${group.id}-${item.href}`}
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        prefetch={false}
                        onClick={onNavigate}
                        className={cn(
                          cn("flex items-center gap-2 rounded-[var(--sb-control-radius)] px-2 font-medium transition-colors", mobile ? "min-h-11" : "min-h-9"),
                          "text-xs",
                          active ? "bg-[var(--sb-green-100)] text-[var(--sb-green-950)] ring-1 ring-white/10" : "text-white/72 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <Icon className={cn("size-4 shrink-0", active ? "text-[var(--sb-green-950)]" : "text-white/55")} />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {item.hasAttention ? <span className={cn("size-1.5 shrink-0 rounded-full", active ? "bg-[var(--sb-green-900)]" : "bg-amber-300")} role="img" aria-label="Pending update" title="Pending update"/> : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </nav>

      <div className="border-t border-white/10 px-3 py-2 text-[10px] text-white/70">{APP_RELEASE_NOTE}</div>
    </div>
  );
}
