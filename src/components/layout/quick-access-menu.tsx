"use client";

import Link from "next/link";
import { ClipboardCheck, ClipboardList, Gauge, LayoutGrid, PackageCheck, ScrollText, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type QuickAccessMenuProps = { permissionMap: Record<string, boolean> };

const actions = [
  { href: "/dashboard", label: "Today", hint: "What needs attention", icon: Gauge, permission: "dashboard.view" },
  { href: "/stock-counts/new", label: "Count stock", hint: "Start a stock count", icon: ClipboardCheck, permission: "stock_count.read" },
  { href: "/purchase-requests/new", label: "Request items", hint: "Create a purchase request", icon: ClipboardList, permission: "purchase_request.read" },
  { href: "/goods-receivings", label: "Receive delivery", hint: "Continue receiving", icon: PackageCheck, permission: "goods_receiving.read" },
  { href: "/outlet-daily-records/new", label: "Record today", hint: "Enter outlet quantities", icon: ScrollText, permission: "outlet_daily_record.view" },
] as const;

export function QuickAccessMenu({ permissionMap }: QuickAccessMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const visibleActions = actions.filter((action) => permissionMap[action.permission] === true || action.href === "/dashboard");

  function close() {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";
    dialog?.querySelector<HTMLElement>("a, button")?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>("a, button, input, select, textarea, [tabindex]:not([tabindex='-1'])"))
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
  }, [open]);

  return (
    <div className="relative xl:hidden">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open quick access"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <LayoutGrid className="h-5 w-5" aria-hidden="true" />
      </Button>
      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-[var(--sb-z-backdrop)] cursor-default" aria-label="Close quick access" onClick={close} />
          <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Quick access" className="sb-popover-surface fixed right-3 top-[calc(var(--sb-topbar-height)+0.5rem)] z-[var(--sb-z-dialog)] max-h-[calc(100dvh-var(--sb-topbar-height)-1rem)] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto p-2 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--sb-border-soft)] px-2 pb-2">
              <div>
                <p className="text-sm font-semibold">Quick access</p>
                <p className="text-xs text-[var(--sb-text-muted)]">Common tasks for this role</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close quick access" onClick={close}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-1 pt-2">
              {visibleActions.map(({ href, label, hint, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-12 items-center gap-3 px-2 py-2 hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-surface-muted)]") }>
                  <span className="sb-icon-tile h-8 w-8"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium">{label}</span><span className="block truncate text-xs text-[var(--sb-text-muted)]">{hint}</span></span>
                </Link>
              ))}
            </div>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="mt-1 flex min-h-[var(--sb-control-height)] items-center justify-center border-t border-[var(--sb-border-soft)] px-2 pt-2 text-xs font-semibold text-[var(--sb-green-700)]">Open dashboard</Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
