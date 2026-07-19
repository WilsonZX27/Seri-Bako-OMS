"use client";

import Link from "next/link";
import { Bell, ListTodo, Megaphone, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type TopBarActivity = Awaited<ReturnType<typeof import("@/server/queries/topbar").getTopBarActivity>>;
const seenKey = "seri-bako-workspace-updates-seen-v1";

export function TopBarActivityMenu({ data }: { data: TopBarActivity }) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingApprovals = data.pendingApprovals ?? [];
  const notifications = data.notifications ?? [];
  const announcements = data.announcements ?? [];
  const assignedActivities = data.assignedActivities ?? [];
  const pendingCount = pendingApprovals.length;
  const notificationCount = notifications.length + announcements.length;
  const recentCount = assignedActivities.length;
  const unreadCount = seen ? 0 : notificationCount + recentCount;
  const count = pendingCount + unreadCount;
  const badgeLabel = count > 99 ? "99+" : String(count);
  const formatTime = (value: string) => new Date(value).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });

  useEffect(() => {
    setSeen(window.sessionStorage.getItem(seenKey) === "true");
  }, []);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function markVisibleUpdatesSeen() {
    setSeen(true);
    window.sessionStorage.setItem(seenKey, "true");
  }

  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) markVisibleUpdatesSeen();
      return next;
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <Button type="button" variant="ghost" size="icon" onClick={toggleOpen} aria-label={count ? `Open workspace updates, ${count} unread or pending` : "Open workspace updates"}>
        <Bell className="h-5 w-5" />
        {count ? (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-semibold leading-none text-white">
            {badgeLabel}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div data-topbar-activity-menu className="fixed right-4 top-12 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[2px] border bg-card shadow-sm">
          <div className="border-b p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">Workspace Updates</p>
                <p className="text-xs text-muted-foreground">Notifications, recent activity, assigned actions, and pending actions.</p>
              </div>
              {unreadCount > 0 ? (
                <Button type="button" variant="outline" size="sm" onClick={markVisibleUpdatesSeen}>Mark as read</Button>
              ) : null}
            </div>
          </div>
          <div className="max-h-96 divide-y overflow-y-auto">
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">My Pending Actions</p>
                {pendingCount ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{pendingCount}</span> : null}
              </div>
              {pendingApprovals.map((item) => (
                <Link key={item.id} href={item.href} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-xs hover:bg-secondary">
                  <ListTodo className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item.document_no} - {item.title}</span>
                </Link>
              ))}
              {!pendingApprovals.length ? <p className="rounded-md p-2 text-sm text-muted-foreground">No pending actions.</p> : null}
            </section>
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">My Notifications</p>
                {notificationCount ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{notificationCount}</span> : null}
              </div>
              {notifications.map((notification) => (
                <Link key={notification.id} href={notification.action_url ?? "#"} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-xs hover:bg-secondary">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
                  <span><span className="block">{notification.title}</span>{notification.message ? <span className="block text-xs text-muted-foreground">{notification.message}</span> : null}</span>
                </Link>
              ))}
              {announcements.map((notification) => (
                <div key={notification.id} className="flex gap-2 rounded-md p-2 text-xs">
                  <Megaphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <span>{notification.title}</span>
                </div>
              ))}
              {!notificationCount ? <p className="rounded-md p-2 text-sm text-muted-foreground">No new notifications.</p> : null}
            </section>
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Recent Activity</p>
                {recentCount ? <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">{recentCount}</span> : null}
              </div>
              {assignedActivities.map((activity) => (
                <div key={activity.id} className="rounded-md p-2 text-xs">
                  <p>{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTime(activity.created_at)}</p>
                </div>
              ))}
              {!assignedActivities.length ? <p className="rounded-md p-2 text-sm text-muted-foreground">No recent activity.</p> : null}
              <Link href="/activity" onClick={() => setOpen(false)} className="inline-flex min-h-8 items-center text-xs font-semibold text-primary underline underline-offset-2">Show more</Link>
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
