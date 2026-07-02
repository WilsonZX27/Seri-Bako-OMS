"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Factory, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getVisibleNavGroups, searchableNavItems } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type WorkspaceSidebarProps = {
  role: UserRole;
  mobile?: boolean;
  companyName?: string;
  companyLogoUrl?: string | null;
  brandHref?: string;
  onNavigate?: () => void;
};

const prefKey = "seri-bako-sidebar-collapsed-v1";

export function WorkspaceSidebar({
  role,
  mobile = false,
  companyName = "Seri Bako",
  companyLogoUrl,
  brandHref = "/dashboard",
  onNavigate,
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
    <div className={cn("flex h-full flex-col border-r bg-[var(--sb-primary-dark)] text-white transition-[width] duration-200", compact ? "w-[76px]" : "w-72", mobile ? "w-full" : "")}>
      <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
        <Link href={brandHref} onClick={onNavigate} className={cn("flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 hover:bg-white/10", compact ? "justify-center" : "")} title={compact ? companyName : undefined}>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-white text-[var(--sb-primary-dark)]">
            {companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogoUrl} alt={`${companyName} logo`} className="h-full w-full object-contain p-1" />
            ) : (
              <Factory className="h-5 w-5" />
            )}
          </div>
          {!compact ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{companyName}</p>
              <p className="text-xs text-white/65">Operations workspace</p>
            </div>
          ) : null}
        </Link>
        {!mobile ? (
          <Button type="button" variant="ghost" size="icon" className="hidden text-white hover:bg-white/10 hover:text-white lg:inline-flex" onClick={toggleCollapsed} aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}>
            {compact ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto p-3">
        {!compact ? (
          <div className="mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu" className="border-white/15 bg-white/10 pl-9 text-white placeholder:text-white/45" />
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
        <div className="space-y-1">
          {groups.map((group) => {
            const item = group.items[0];
            const Icon = group.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={group.id}
                href={item.href}
                onClick={onNavigate}
                title={compact ? group.label : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                  compact ? "justify-center px-0" : "",
                  active ? "bg-[var(--sb-accent)] text-[var(--sb-primary-dark)]" : "text-white/78 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!compact ? <span className="truncate">{group.label}</span> : null}
              </Link>
            );
          })}
        </div>
      </nav>

      {!mobile && !compact ? (
        <div className="border-t border-white/10 p-4">
          <div className="rounded-md bg-white/10 p-3 text-xs leading-relaxed text-white/70">
            Daily tools are grouped by category so staff can get to common work without sorting through every ERP page.
            <div className="mt-2 text-white/45">
              <div>v0.1.0</div>
              <div>Sprint 7.3.2</div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
