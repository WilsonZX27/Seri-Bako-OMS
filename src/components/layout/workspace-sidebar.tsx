"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Factory, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVisibleNavGroups, searchableNavItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
};

const prefKey = "seri-bako-sidebar-collapsed-v1";

export function WorkspaceSidebar({
  role,
  mobile = false,
  companyName = "Seri Bako",
  companyLogoUrl,
  brandHref = "/dashboard",
  onNavigate,
  navCounts = {},
  userName = "Signed in",
  userRoleLabel = "User",
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState("");
  const groups = useMemo(() => getVisibleNavGroups(role), [role]);
  const navMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return searchableNavItems
      .filter((item) => `${item.label} ${item.group} ${(item.keywords ?? []).join(" ")}`.toLowerCase().includes(term))
      .slice(0, 6);
  }, [query]);
  const compact = collapsed && !mobile;

  useEffect(() => {
    if (mobile) return;
    setCollapsed(window.localStorage.getItem(prefKey) === "true");
  }, [mobile]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    window.localStorage.setItem(prefKey, String(next));
  }

  return (
    <div className={cn("flex h-dvh flex-col border-r bg-[var(--sb-primary-dark)] text-white transition-[width] duration-200", compact ? "w-[76px]" : "w-[244px]", mobile ? "w-full" : "")}>
      <div className="flex h-14 items-center gap-3 border-b border-white/10 px-3">
        <Link href={brandHref} onClick={onNavigate} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 hover:bg-white/10", compact ? "justify-center" : "")} title={compact ? companyName : undefined}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--sb-accent)] text-white">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain p-1" />
            ) : (
              <Factory className="h-4 w-4" />
            )}
          </div>
          {!compact ? (
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight">{companyName}</p>
              <p className="text-[10px] uppercase tracking-[0.12em] text-white/55">OMS Platform</p>
            </div>
          ) : null}
        </Link>
        {!mobile ? (
          <Button type="button" variant="ghost" size="icon" className="hidden text-white hover:bg-white/10 hover:text-white lg:inline-flex" onClick={toggleCollapsed} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}>
            {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {!compact ? (
          <div className="mb-3 px-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/45" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" className="h-8 border-white/15 bg-white/10 pl-8 text-xs text-white placeholder:text-white/45" />
            </div>
            {navMatches.length ? (
              <div className="mt-2 space-y-1 rounded-md bg-white/10 p-1">
                {navMatches.map((item) => (
                  <Link key={item.href} href={item.href} onClick={onNavigate} className="block rounded px-2 py-1.5 text-xs text-white/80 hover:bg-white/10 hover:text-white">
                    {item.label}
                    <span className="ml-1 text-white/45">{item.group}</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="space-y-3">
          {groups.map((group) => {
            const visibleItems = group.items;
            return (
              <div key={group.id}>
                {!compact ? <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/38">{group.label}</p> : null}
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href || pathname.startsWith(`${item.href.split("?")[0]}/`) || pathname === item.href.split("?")[0];
                    const count = item.badgeKey ? navCounts[item.badgeKey] : undefined;
                    return (
                      <Link
                        key={`${group.id}-${item.href}`}
                        href={item.href}
                        onClick={onNavigate}
                        title={compact ? item.label : undefined}
                        className={cn(
                          "flex h-8 items-center gap-2 rounded-md px-2 text-[12px] font-medium transition-colors",
                          compact ? "justify-center px-0" : "",
                          active ? "bg-white/10 text-white ring-1 ring-white/10" : "text-white/72 hover:bg-white/8 hover:text-white",
                        )}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0", active ? "text-[var(--sb-accent)]" : "text-white/55")} />
                        {!compact ? (
                          <>
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {typeof count === "number" && count > 0 ? (
                              <span className={cn("ml-2 inline-flex min-w-5 justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none", item.attention ? "bg-[var(--sb-accent)] text-[var(--sb-primary-dark)]" : "bg-white/12 text-white/70")}>
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

      {!mobile && !compact ? (
        <div className="border-t border-white/10 p-3">
          <div className="mb-3 flex min-w-0 items-center gap-2 rounded-md bg-white/5 p-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--sb-accent)] text-[10px] font-bold text-white">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold leading-tight">{userName}</p>
              <p className="truncate text-[11px] text-white/55">{userRoleLabel}</p>
            </div>
          </div>
          <div className="text-[11px] leading-4 text-white/45">
            <div>Seri Bako OMS</div>
            <div>v{APP_VERSION}</div>
            <div>{APP_SPRINT}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
