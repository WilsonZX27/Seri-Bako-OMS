"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  FileText,
  Home,
  Menu,
  PackageCheck,
  ReceiptText,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { getVisibleNavGroups } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type MobileTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
};

function has(permissionMap: Record<string, boolean>, permission: string) {
  return permissionMap[permission] === true;
}

function roleTabs(role: UserRole, permissionMap: Record<string, boolean>): MobileTab[] {
  const tabs: MobileTab[] = [{ href: "/dashboard", label: "Home", icon: Home, permission: "dashboard.view" }];

  if (role === "outlet_staff") {
    const canCreateDailyRecord = has(permissionMap, "outlet_daily_record.create");
    tabs.push(
      { href: "/outlet-daily-records", label: "Daily", icon: ClipboardList, permission: "outlet_daily_record.view" },
      canCreateDailyRecord
        ? { href: "/outlet-daily-records/new", label: "New record", icon: ClipboardCheck }
        : { href: "/activity", label: "Activity", icon: Activity, permission: "dashboard.view" },
      canCreateDailyRecord
        ? { href: "/activity", label: "Activity", icon: Activity, permission: "dashboard.view" }
        : { href: "/account", label: "Profile", icon: UserRound },
    );
    return tabs;
  }

  if (role === "kitchen") {
    tabs.push(
      { href: "/production/jobs", label: "Production", icon: Factory, permission: "production.view" },
      { href: "/purchase-requests", label: "Requests", icon: FileText, permission: "purchase_request.read" },
      { href: "/goods-receivings", label: "Receive", icon: PackageCheck, permission: "goods_receiving.read" },
    );
    return tabs;
  }

  if (role === "purchasing") {
    tabs.push(
      { href: "/purchase-requests", label: "Requests", icon: FileText, permission: "purchase_request.read" },
      { href: "/purchase-orders", label: "Orders", icon: ShoppingCart, permission: "purchase_order.read" },
      { href: "/goods-receivings", label: "Receive", icon: PackageCheck, permission: "goods_receiving.read" },
    );
    return tabs;
  }

  if (role === "finance") {
    tabs.push(
      { href: "/purchase-requests", label: "Requests", icon: FileText, permission: "purchase_request.read" },
      { href: "/supplier-invoices", label: "Invoices", icon: ReceiptText, permission: "supplier_invoice.view" },
      { href: "/stock-balance", label: "Stock", icon: Boxes, permission: "stock_balance.read" },
    );
    return tabs;
  }

  tabs.push(
    { href: "/purchase-requests", label: "Requests", icon: FileText, permission: "purchase_request.read" },
    { href: "/goods-receivings", label: "Receive", icon: PackageCheck, permission: "goods_receiving.read" },
    { href: "/stock-counts", label: "Count", icon: CheckCircle2, permission: "stock_count.read" },
  );
  return tabs;
}

function isCurrentPath(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileAppNavigation({
  role,
  permissionMap,
  companyName,
}: {
  role: UserRole;
  permissionMap: Record<string, boolean>;
  companyName: string;
}) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const groups = useMemo(() => getVisibleNavGroups(role, permissionMap), [permissionMap, role]);
  const tabs = useMemo(() => {
    const preferred = roleTabs(role, permissionMap).filter((tab) => !tab.permission || has(permissionMap, tab.permission));
    const seen = new Set(preferred.map((tab) => tab.href));
    for (const item of groups.flatMap((group) => group.items)) {
      if (preferred.length >= 4) break;
      if (seen.has(item.href)) continue;
      preferred.push({ href: item.href, label: item.label, icon: item.icon });
      seen.add(item.href);
    }
    return preferred.slice(0, 4);
  }, [groups, permissionMap, role]);

  useEffect(() => setMoreOpen(false), [pathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    dialogRef.current?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMoreOpen(false);
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("a, button, [tabindex]:not([tabindex='-1'])"))
        .filter((element) => !element.hasAttribute("disabled"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [moreOpen]);

  return (
    <>
      <nav
        data-mobile-app-nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] border-t border-[var(--sb-border)] bg-[var(--sb-surface)] pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="grid min-h-[var(--sb-mobile-nav-height)] grid-cols-5">
          {tabs.map((tab) => {
            const active = isCurrentPath(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-[var(--sb-text-muted)]",
                  "active:bg-[var(--sb-surface-muted)]",
                  active && "bg-[var(--sb-green-100)] text-[var(--sb-green-900)]",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />
                <span className="max-w-full truncate">{tab.label}</span>
              </Link>
            );
          })}
          <button
            ref={triggerRef}
            type="button"
            className="relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-[var(--sb-text-muted)] active:bg-[var(--sb-surface-muted)]"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            onClick={() => setMoreOpen(true)}
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen ? (
        <div className="fixed inset-0 z-[var(--sb-z-dialog)] md:hidden">
          <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" aria-label="Close navigation" onClick={() => setMoreOpen(false)} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="sb-popover-surface absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <header className="flex min-h-14 items-center justify-between border-b border-[var(--sb-border-soft)] px-4">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-sm font-semibold text-[var(--sb-green-950)]">{companyName}</h2>
                <p className="text-xs text-[var(--sb-text-muted)]">All permitted workspaces</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMoreOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              {groups.map((group) => (
                <section key={group.id} className="mb-4 last:mb-0">
                  <h3 className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--sb-text-muted)]">{group.label}</h3>
                  <div className="divide-y divide-[var(--sb-border-soft)] border-y border-[var(--sb-border-soft)]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isCurrentPath(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-center gap-3 px-2 text-[13px] font-medium",
                            active ? "bg-[var(--sb-green-100)] text-[var(--sb-green-950)]" : "bg-white text-[var(--sb-text)] active:bg-[var(--sb-surface-muted)]",
                          )}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
              <Link href="/account" className="mt-2 flex min-h-12 items-center gap-3 border-y border-[var(--sb-border-soft)] px-2 text-[13px] font-medium">
                <UserRound className="h-4.5 w-4.5" aria-hidden="true" />
                My Profile
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
