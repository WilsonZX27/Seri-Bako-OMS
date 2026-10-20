"use client";

import Link from "next/link";
import { ArrowRight, Bell, ClipboardCheck, Factory, ListTodo, Megaphone, Package, ReceiptText, ShieldAlert, ShoppingCart, TriangleAlert, Wrench } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";

type TopBarActivity = Awaited<ReturnType<typeof import("@/server/queries/topbar").getTopBarActivity>>;
const seenKey = "seri-bako-workspace-updates-seen-v2";

function actionIcon(href: string) {
  if (href.includes("maintenance")) return Wrench;
  if (href.includes("purchase-requests")) return ClipboardCheck;
  if (href.includes("purchase-orders")) return ShoppingCart;
  if (href.includes("supplier-invoices")) return ReceiptText;
  if (href.includes("compliance")) return ShieldAlert;
  if (href.includes("production")) return Factory;
  if (href.includes("stock-") || href.includes("goods-receivings")) return Package;
  return ListTodo;
}

export function TopBarActivityMenu({ data, canOpenActivity = true }: { data: TopBarActivity; canOpenActivity?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState<string[] | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const pendingApprovals = data.pendingApprovals ?? [];
  const showPendingActions = pathname !== "/dashboard";
  const notifications = data.notifications ?? [];
  const announcements = data.announcements ?? [];
  const assignedActivities = data.assignedActivities ?? [];
  const pendingActionsAvailable = data.availability?.pendingActions !== false;
  const notificationsAvailable = data.availability?.notifications !== false;
  const pendingCount = showPendingActions ? pendingApprovals.length : 0;
  const notificationCount = notifications.length + announcements.length;
  const recentCount = assignedActivities.length;
  const visibleUpdateIds = [...notifications, ...announcements, ...assignedActivities].map((item) => item.id);
  const unreadNotificationCount = seenIds === null ? 0 : [...notifications, ...announcements].filter((item) => !seenIds.includes(item.id)).length;
  const unreadCount = seenIds === null ? 0 : visibleUpdateIds.filter((id) => !seenIds.includes(id)).length;
  const count = pendingCount + unreadCount;
  const badgeLabel = count > 99 ? "99+" : String(count);
  const formatTime = (value: string) => formatDateTime(value);

  useEffect(() => {
    let stored: unknown = [];
    try {
      stored = JSON.parse(window.sessionStorage.getItem(seenKey) ?? "[]");
    } catch {
      // An invalid browser value should leave current updates visible.
    }
    setSeenIds(Array.isArray(stored) ? stored.filter((id): id is string => typeof id === "string") : []);
  }, []);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    function close() {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function markVisibleUpdatesSeen() {
    const next = [...new Set([...(seenIds ?? []), ...visibleUpdateIds])];
    setSeenIds(next);
    window.sessionStorage.setItem(seenKey, JSON.stringify(next));
  }

  function markUpdateSeen(id: string) {
    const next = [...new Set([...(seenIds ?? []), id])];
    setSeenIds(next);
    window.sessionStorage.setItem(seenKey, JSON.stringify(next));
  }

  function toggleOpen() {
    setOpen((value) => !value);
  }

  return (
    <div ref={rootRef} className="relative">
      <Button ref={triggerRef} type="button" variant="ghost" size="icon" onClick={toggleOpen} aria-label={count ? `Open workspace updates, ${count} unread or pending` : "Open workspace updates"} aria-haspopup="dialog" aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {count ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--sb-danger)] px-1 text-[9px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div ref={menuRef} data-topbar-activity-menu role="dialog" aria-label="Workspace Updates" className="sb-popover-surface sb-workspace-updates fixed right-4 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[var(--sb-panel-radius)]">
          <div className="border-b p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Workspace Updates</p>
                <p className="text-xs text-muted-foreground">Notifications and recent activity.</p>
              </div>
              {unreadCount > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={markVisibleUpdatesSeen}>Mark as read</Button>
              ) : null}
            </div>
          </div>
          <div className="max-h-[calc(100dvh-3.5rem)] divide-y overflow-y-auto">
            {showPendingActions ? <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">My Pending Actions</p>
                {pendingCount ? <span className="rounded-full bg-[var(--sb-warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sb-warning)]">{pendingCount}</span> : null}
              </div>
              {pendingApprovals.map((item) => { const Icon = actionIcon(item.href); return (
                <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-xs hover:bg-secondary">
                  <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{item.document_no} - {item.title}</span>
                </Link>
              ); })}
              {!pendingActionsAvailable ? <p className="flex gap-2 rounded-md bg-[var(--sb-warning-bg)] p-2 text-sm text-[var(--sb-warning-text)]"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Pending actions are temporarily unavailable. Open the relevant workspace before assuming the queue is clear.</span></p> : null}
              {pendingActionsAvailable && !pendingApprovals.length ? <p className="rounded-md p-2 text-sm text-muted-foreground">No pending actions.</p> : null}
            </section> : null}
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">My Notifications</p>
                {unreadNotificationCount ? <span className="rounded-full bg-[var(--sb-warning-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sb-warning)]">{unreadNotificationCount}</span> : null}
              </div>
              {notifications.map((notification) => { const Icon = actionIcon(notification.action_url ?? ""); return (
                <Link key={notification.id} href={notification.action_url ?? "/activity"} onClick={() => { markUpdateSeen(notification.id); setOpen(false); }} className="flex gap-2 rounded-[var(--sb-control-radius)] p-2 text-xs hover:bg-secondary">
                  <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span><span className="block">{notification.title}</span>{notification.message ? <span className="block text-xs text-muted-foreground">{notification.message}</span> : null}</span>
                </Link>
              ); })}
              {announcements.map((notification) => (
                <div key={notification.id} className="flex gap-2 rounded-md p-2 text-xs">
                  <Megaphone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{notification.title}</span>
                </div>
              ))}
              {!notificationsAvailable ? <p className="flex gap-2 rounded-md bg-[var(--sb-warning-bg)] p-2 text-sm text-[var(--sb-warning-text)]"><TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /><span>Notifications are temporarily unavailable. Try again before assuming there are no updates.</span></p> : null}
              {notificationsAvailable && !notificationCount ? <p className="rounded-md p-2 text-sm text-muted-foreground">No new notifications.</p> : null}
            </section>
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Activity Log</p>
                {recentCount ? <span className="rounded-full bg-[var(--sb-neutral-bg)] px-2 py-0.5 text-xs font-medium text-[var(--sb-neutral-text)]">{recentCount}</span> : null}
              </div>
              {assignedActivities.map((activity) => (
                <div key={activity.id} className="rounded-md p-2 text-xs">
                  <p>{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTime(activity.created_at)}</p>
                </div>
              ))}
              {canOpenActivity ? <Button asChild variant="outline" className="w-full"><Link href="/activity" data-activity-log-action onClick={() => setOpen(false)}>Open full activity log<ArrowRight aria-hidden="true" className="size-4 shrink-0" /></Link></Button> : null}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
