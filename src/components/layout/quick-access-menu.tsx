"use client";

import Link from "next/link";
import { ClipboardCheck, ClipboardList, Gauge, LayoutGrid, PackageCheck, ScrollText, X } from "lucide-react";
import { useState } from "react";
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
  const visibleActions = actions.filter((action) => permissionMap[action.permission] === true || action.href === "/dashboard");

  return (
    <div className="relative xl:hidden">
      <Button
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
          <button type="button" className="fixed inset-0 z-[var(--sb-z-backdrop)] cursor-default" aria-label="Close quick access" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Quick access" className="sb-popover-surface absolute right-0 top-[calc(100%+0.5rem)] z-[var(--sb-z-dialog)] w-[min(21rem,calc(100vw-1.5rem))] p-2 shadow-lg">
            <div className="flex items-center justify-between border-b border-[var(--sb-border-soft)] px-2 pb-2">
              <div>
                <p className="text-sm font-semibold">Quick access</p>
                <p className="text-xs text-[var(--sb-text-muted)]">Common tasks for this role</p>
              </div>
              <Button type="button" variant="ghost" size="icon" aria-label="Close quick access" onClick={() => setOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="grid gap-1 pt-2">
              {visibleActions.map(({ href, label, hint, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setOpen(false)} className={cn("flex min-h-12 items-center gap-3 rounded-md px-2 py-2 hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-surface-muted)]") }>
                  <span className="sb-icon-tile h-8 w-8 rounded-md"><Icon className="h-4 w-4" aria-hidden="true" /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium">{label}</span><span className="block truncate text-xs text-[var(--sb-text-muted)]">{hint}</span></span>
                </Link>
              ))}
            </div>
            <Link href="/dashboard" onClick={() => setOpen(false)} className="mt-1 flex min-h-10 items-center justify-center border-t border-[var(--sb-border-soft)] px-2 pt-2 text-xs font-semibold text-[var(--sb-amber-700)]">Open dashboard</Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
