"use client";

import Link from "next/link";
import { activeNavigationHref } from "@/lib/active-navigation";
import { useNavigationAttention } from "@/components/layout/navigation-attention";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Boxes,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Menu,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingCart,
  LogOut,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { getVisibleNavGroups } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { GlobalSearch } from "@/components/search/global-search";
import { cn } from "@/lib/utils";
import { signOut } from "@/server/actions/auth";
import type { UserRole } from "@/types/database";

type MobileTab = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission?: string;
  hasAttention?: boolean;
};



function has(permissionMap: Record<string, boolean>, permission: string) {
  return permissionMap[permission] === true;
}

function roleTabs(role: UserRole): MobileTab[] {
  const tabs: MobileTab[] = [{ href: "/dashboard", label: "Home", icon: Home, permission: "dashboard.view" }];

  if (role === "outlet_staff" || role === "outlet_supervisor") {
    tabs.push(
      { href: "/stock-counts", label: "Count", icon: CheckCircle2, permission: "stock_count.read" },
      { href: "/asset-management", label: "Asset", icon: Boxes, permission: "assets.view" },
      { href: "/outlet-daily-records", label: "Daily", icon: ClipboardList, permission: "outlet_daily_record.view" },
    );
    return tabs;
  }

  if (role === "kitchen") {
    tabs.push(
      { href: "/asset-management?view=checklist", label: "Checklist", icon: ClipboardCheck, permission: "assets.view" },
      { href: "/attendance/my-schedule", label: "Schedule", icon: CalendarDays, permission: "schedule.read" },
      { href: "/attendance/payslips", label: "Payslips", icon: ReceiptText, permission: "dashboard.view" },
    );
    return tabs;
  }

  if (role === "chef") {
    tabs.push(
      { href: "/purchase-requests", label: "Request", icon: FileText, permission: "purchase_request.read" },
      { href: "/goods-receivings", label: "Receive", icon: PackageCheck, permission: "goods_receiving.read" },
      { href: "/asset-management", label: "Asset", icon: Boxes, permission: "assets.view" },
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
  const path = href.split("?", 1)[0];
  if (path === "/dashboard") return pathname === path;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function MobileAppNavigation({
  role,
  permissionMap,
  companyName,
  attentionHrefs: suppliedAttentionHrefs,
}: {
  role: UserRole;
  permissionMap: Record<string, boolean>;
  companyName: string;
  attentionHrefs?: string[];
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const sharedAttentionHrefs = useNavigationAttention();
  const attentionHrefs = suppliedAttentionHrefs ?? sharedAttentionHrefs;
  const groups = useMemo(() => getVisibleNavGroups(role, permissionMap, attentionHrefs), [attentionHrefs, permissionMap, role]);
  const activeMoreHref = activeNavigationHref(pathname, searchParams, groups.flatMap(group => group.items.map(item => item.href)));
  const tabs = useMemo(() => {
    const preferred = roleTabs(role).filter((tab) => !tab.permission || has(permissionMap, tab.permission)).map((tab) => ({...tab,hasAttention:attentionHrefs.includes(tab.href)}));
    const seen = new Set(preferred.map((tab) => tab.href.split("?", 1)[0]));
    for (const item of groups.flatMap((group) => group.items)) {
      if (preferred.length >= 4) break;
      if (seen.has(item.href.split("?", 1)[0])) continue;
      preferred.push({ href: item.href, label: item.label, icon: item.icon, hasAttention: item.hasAttention });
      seen.add(item.href.split("?", 1)[0]);
    }
    return preferred.slice(0, 4);
  }, [attentionHrefs, groups, permissionMap, role]);

  useEffect(() => setMoreOpen(false), [pathname]);

  // iPadOS Safari can expose a desktop-sized viewport and a Macintosh user
  // agent even when the device is still touch-first. Keep the shell in the
  // tablet navigation mode on those devices instead of making the user
  // manually request the mobile site.
  useEffect(() => {
    const root = document.documentElement;
    const updateTouchTablet = () => {
      const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const touchPoints = navigator.maxTouchPoints ?? 0;
      const shortestScreenEdge = Math.min(window.screen.width, window.screen.height);
      const desktopIpadUserAgent = /macintosh/i.test(navigator.userAgent) && touchPoints > 1;
      const touchTablet = touchPoints > 1 && shortestScreenEdge >= 600 && (desktopIpadUserAgent || coarsePointer);
      if (touchTablet) root.dataset.touchTablet = "true";
      else delete root.dataset.touchTablet;
    };

    updateTouchTablet();
    window.addEventListener("resize", updateTouchTablet);
    window.addEventListener("orientationchange", updateTouchTablet);
    return () => {
      window.removeEventListener("resize", updateTouchTablet);
      window.removeEventListener("orientationchange", updateTouchTablet);
      delete root.dataset.touchTablet;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const isFocusedTask = /\/(?:new|edit)$/.test(pathname);
    if (isFocusedTask) root.dataset.mobileTaskPage = "true";
    else delete root.dataset.mobileTaskPage;
    return () => {
      delete root.dataset.mobileTaskPage;
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const viewport = window.visualViewport;
    const compactShellQuery = window.matchMedia("(max-width: 1279px)");
    const isCompactShell = () => compactShellQuery.matches || root.dataset.touchTablet === "true";
    let stableViewportHeight = Math.max(
      window.innerHeight,
      document.documentElement.clientHeight,
      viewport?.height ?? 0,
    );
    let frame = 0;

    const isEditable = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return false;
      if (active instanceof HTMLTextAreaElement) return !active.disabled && !active.readOnly;
      if (active instanceof HTMLInputElement) return !active.disabled && !active.readOnly;
      return active.isContentEditable;
    };

    const updateKeyboardState = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const editable = isEditable();
        const layoutHeight = Math.max(window.innerHeight, document.documentElement.clientHeight);
        const visualHeight = viewport?.height ?? layoutHeight;

        // Hide fixed app chrome immediately when an editable control receives
        // focus. Some Android/iOS browser modes overlay the keyboard without
        // resizing visualViewport, so waiting for a viewport delta leaves the
        // bottom nav/action rail floating over the focused field.
        if (isCompactShell() && editable) root.dataset.mobileEditableFocus = "true";
        else delete root.dataset.mobileEditableFocus;

        // Android Chrome may resize both innerHeight and the visual viewport
        // when the keyboard opens. Keep the last non-keyboard height so the
        // reduced viewport can still be identified reliably.
        if (!editable || visualHeight >= stableViewportHeight - 32) {
          stableViewportHeight = Math.max(layoutHeight, visualHeight);
        }

        const viewportDelta = stableViewportHeight - visualHeight;
        const keyboardOpen = isCompactShell() && editable && (viewportDelta > 120 || visualHeight < stableViewportHeight * 0.75);
        if (keyboardOpen) {
          const keyboardInset = Math.max(0, viewportDelta - (viewport?.offsetTop ?? 0));
          root.dataset.mobileKeyboardOpen = "true";
          root.style.setProperty("--sb-virtual-keyboard-inset", `${keyboardInset}px`);
        } else {
          delete root.dataset.mobileKeyboardOpen;
          root.style.removeProperty("--sb-virtual-keyboard-inset");
        }
      });
    };

    document.addEventListener("focusin", updateKeyboardState);
    document.addEventListener("focusout", updateKeyboardState);
    viewport?.addEventListener("resize", updateKeyboardState);
    viewport?.addEventListener("scroll", updateKeyboardState);
    compactShellQuery.addEventListener("change", updateKeyboardState);
    updateKeyboardState();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", updateKeyboardState);
      document.removeEventListener("focusout", updateKeyboardState);
      viewport?.removeEventListener("resize", updateKeyboardState);
      viewport?.removeEventListener("scroll", updateKeyboardState);
      compactShellQuery.removeEventListener("change", updateKeyboardState);
      delete root.dataset.mobileKeyboardOpen;
      delete root.dataset.mobileEditableFocus;
      root.style.removeProperty("--sb-virtual-keyboard-inset");
    };
  }, []);

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
        data-mobile-bottom-nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] border-t border-[var(--sb-border)] bg-[var(--sb-surface)] pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_10px_rgb(6_44_31_/_0.16)] xl:hidden"
      >
        <div className="mx-auto grid min-h-[var(--sb-mobile-nav-height)] max-w-3xl" style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}>
          {tabs.map((tab) => {
            const active = isCurrentPath(pathname, tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-medium text-[var(--sb-text-muted)]",
                  "active:bg-[var(--sb-surface-muted)]",
                  active && "bg-[var(--sb-green-100)] text-[var(--sb-green-900)]",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.8} aria-hidden="true" />
                {tab.hasAttention ? <span className="absolute left-1/2 top-1.5 ml-2 size-1.5 rounded-full bg-amber-500" role="img" aria-label="Pending update"/> : null}
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

      {moreOpen ? createPortal(
        <div className="fixed inset-0 z-[var(--sb-z-dialog)] xl:hidden">
          <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" aria-label="Close navigation" onClick={() => setMoreOpen(false)} />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="sb-popover-surface sb-mobile-navigation-drawer absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden pb-[env(safe-area-inset-bottom)]"
          >
            <header className="flex min-h-14 items-center justify-between border-b border-[var(--sb-border-soft)] px-4">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-sm font-semibold text-[var(--sb-green-950)]">{companyName}</h2>
                <p className="text-xs text-[var(--sb-text-muted)]">Choose a workspace</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close navigation" onClick={() => setMoreOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </header>
            <div className="sb-mobile-navigation-groups min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
              <section className="mb-4 space-y-2">
                <Button type="button" variant="outline" className="w-full justify-start gap-3" onClick={() => { setMoreOpen(false); setSearchOpen(true); }}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  Search OMS
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/account" prefetch={false} className="flex min-h-12 items-center justify-center gap-2 rounded-md border px-2 text-sm font-medium text-[var(--sb-text)] active:bg-[var(--sb-surface-muted)]">
                    <UserRound className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">My Profile</span>
                  </Link>
                  <Link href="/attendance/confirmations" prefetch={false} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-2 rounded-md border px-2 text-sm font-normal text-[var(--sb-text)] active:bg-[var(--sb-surface-muted)]">
                    <CheckCircle2 className="h-4.5 w-4.5 shrink-0" aria-hidden="true" /><span>My attendance</span>
                  </Link>
                  <Link href="/attendance/payslips" prefetch={false} onClick={() => setMoreOpen(false)} className="flex min-h-12 items-center gap-2 rounded-md border px-2 text-sm font-normal text-[var(--sb-text)] active:bg-[var(--sb-surface-muted)]">
                    <ReceiptText className="h-4.5 w-4.5 shrink-0" aria-hidden="true" /><span>My payslips</span>
                  </Link>
                  <form action={signOut}>
                    <SubmitButton type="submit" variant="destructive" pendingLabel="Signing out..." className="min-h-12 w-full justify-center gap-2 bg-[var(--sb-danger)] text-sm text-white hover:bg-[var(--sb-danger)]">
                      <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                      <span>Logout</span>
                    </SubmitButton>
                  </form>
                </div>
              </section>
              {groups.map((group) => (
                <section key={group.id} className="sb-mobile-navigation-group mb-4 last:mb-0">
                  <h3 className="px-2 pb-1.5 text-[11px] font-semibold text-[var(--sb-text-muted)]">{group.label}</h3>
                  <div className="divide-y divide-[var(--sb-border-soft)] border-y border-[var(--sb-border-soft)]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = activeMoreHref === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          prefetch={false}
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
            </div>
          </div>
        </div>, document.body
      ) : null}
      <GlobalSearch permissionMap={permissionMap} mobile open={searchOpen} onOpenChange={setSearchOpen} hideTrigger />
    </>
  );
}
