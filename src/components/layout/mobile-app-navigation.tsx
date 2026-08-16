"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Download,
  FileText,
  Home,
  Menu,
  PackageCheck,
  ReceiptText,
  Search,
  ShoppingCart,
  TriangleAlert,
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
};

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
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
      { href: "/stock-counts", label: "Count", icon: CheckCircle2, permission: "stock_count.read" },
      { href: "/stock-balance", label: "Stock", icon: Boxes, permission: "stock_balance.read" },
      { href: "/stock-wastage", label: "Wastage", icon: TriangleAlert, permission: "stock_wastage.read" },
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
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
    const standalone = window.matchMedia("(display-mode: standalone)");
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
    const updateStandalone = () => setIsStandalone(standalone.matches || navigatorWithStandalone.standalone === true);
    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallPrompt(null);
      setIsStandalone(true);
      setInstallHelpOpen(false);
    };

    setIsAppleMobile(/iphone|ipad|ipod/i.test(navigator.userAgent));
    updateStandalone();
    standalone.addEventListener("change", updateStandalone);
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      standalone.removeEventListener("change", updateStandalone);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function openFullscreenApp() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallPrompt(null);
      return;
    }
    setMoreOpen(false);
    setInstallHelpOpen(true);
  }

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
    const mobileQuery = window.matchMedia("(max-width: 767px)");
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

        // Android Chrome may resize both innerHeight and the visual viewport
        // when the keyboard opens. Keep the last non-keyboard height so the
        // reduced viewport can still be identified reliably.
        if (!editable || visualHeight >= stableViewportHeight - 32) {
          stableViewportHeight = Math.max(layoutHeight, visualHeight);
        }

        const viewportDelta = stableViewportHeight - visualHeight;
        const keyboardOpen = mobileQuery.matches && editable && (viewportDelta > 120 || visualHeight < stableViewportHeight * 0.75);
        if (keyboardOpen) root.dataset.mobileKeyboardOpen = "true";
        else delete root.dataset.mobileKeyboardOpen;
      });
    };

    document.addEventListener("focusin", updateKeyboardState);
    document.addEventListener("focusout", updateKeyboardState);
    viewport?.addEventListener("resize", updateKeyboardState);
    viewport?.addEventListener("scroll", updateKeyboardState);
    mobileQuery.addEventListener("change", updateKeyboardState);
    updateKeyboardState();

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", updateKeyboardState);
      document.removeEventListener("focusout", updateKeyboardState);
      viewport?.removeEventListener("resize", updateKeyboardState);
      viewport?.removeEventListener("scroll", updateKeyboardState);
      mobileQuery.removeEventListener("change", updateKeyboardState);
      delete root.dataset.mobileKeyboardOpen;
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
        <div className="mx-auto grid min-h-[var(--sb-mobile-nav-height)] max-w-3xl grid-cols-5">
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
        <div className="fixed inset-0 z-[var(--sb-z-dialog)] xl:hidden">
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
              <section className="mb-4 space-y-2">
                <Button type="button" variant="outline" className="w-full justify-start gap-3" onClick={() => { setMoreOpen(false); setSearchOpen(true); }}>
                  <Search className="h-5 w-5" aria-hidden="true" />
                  Search OMS
                </Button>
                <div className="divide-y divide-[var(--sb-border-soft)] border-y border-[var(--sb-border-soft)]">
                  {!isStandalone ? (
                    <button
                      type="button"
                      data-install-oms-app
                      className="flex min-h-12 w-full items-center gap-3 px-2 text-left text-[13px] font-medium text-[var(--sb-text)] active:bg-[var(--sb-surface-muted)]"
                      onClick={openFullscreenApp}
                    >
                      <Download className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1">Install full-screen app</span>
                    </button>
                  ) : null}
                  <Link href="/account" prefetch={false} className="flex min-h-12 items-center gap-3 px-2 text-[13px] font-medium text-[var(--sb-text)] active:bg-[var(--sb-surface-muted)]">
                    <UserRound className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">My Profile</span>
                  </Link>
                  <form action={signOut}>
                    <SubmitButton type="submit" variant="ghost" pendingLabel="Signing out..." className="flex min-h-12 w-full items-center justify-start gap-3 rounded-none px-2 text-left text-[13px] font-medium text-[var(--sb-danger)] active:bg-[var(--sb-surface-muted)]">
                      <LogOut className="h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                      <span>Logout</span>
                    </SubmitButton>
                  </form>
                </div>
              </section>
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
        </div>
      ) : null}
      {installHelpOpen ? (
        <div className="fixed inset-0 z-[var(--sb-z-dialog)] xl:hidden">
          <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" aria-label="Close install guide" onClick={() => setInstallHelpOpen(false)} />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="sb-popover-surface absolute inset-x-0 bottom-0 px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--sb-text-muted)]">Full-screen workspace</p>
                <h2 id="install-app-title" className="mt-1 text-lg font-semibold text-[var(--sb-green-950)]">Add Seri Bako OMS to your Home Screen</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close install guide" onClick={() => setInstallHelpOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <ol className="mt-5 grid gap-3 text-sm text-[var(--sb-text)]">
              <li className="grid grid-cols-[1.75rem_1fr] gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sb-green-100)] font-semibold text-[var(--sb-green-900)]">1</span><span>{isAppleMobile ? "Tap the Share button in Safari." : "Open this page in your browser menu."}</span></li>
              <li className="grid grid-cols-[1.75rem_1fr] gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sb-green-100)] font-semibold text-[var(--sb-green-900)]">2</span><span>Select <strong>Add to Home Screen</strong> or <strong>Install app</strong>.</span></li>
              <li className="grid grid-cols-[1.75rem_1fr] gap-3"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--sb-green-100)] font-semibold text-[var(--sb-green-900)]">3</span><span>Open the new Seri Bako icon for the full-screen experience.</span></li>
            </ol>
            <Button type="button" className="mt-5 w-full" onClick={() => setInstallHelpOpen(false)}>Got it</Button>
          </section>
        </div>
      ) : null}
      <GlobalSearch permissionMap={permissionMap} mobile open={searchOpen} onOpenChange={setSearchOpen} hideTrigger />
    </>
  );
}
