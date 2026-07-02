"use client";

import Link from "next/link";
import { Bell, ListTodo, Megaphone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type TopBarActivity = Awaited<ReturnType<typeof import("@/server/queries/topbar").getTopBarActivity>>;

export function TopBarActivityMenu({ data }: { data: TopBarActivity }) {
  const [open, setOpen] = useState(false);
  const pendingCount = data.pendingApprovals.length;
  const notificationCount = data.notifications.length + data.announcements.length;
  const recentCount = data.assignedActivities.length;
  const count = pendingCount + notificationCount + recentCount;
  const badgeLabel = count > 99 ? "99+" : String(count);
  const formatTime = (value: string) => new Date(value).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label={count ? `Open workspace updates, ${count} unread or pending` : "Open workspace updates"}>
        <Bell className="h-5 w-5" />
        {count ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white shadow-sm">
            {badgeLabel}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="border-b p-3">
            <p className="text-sm font-semibold">Workspace Updates</p>
            <p className="text-xs text-muted-foreground">Notifications, recent activity, assigned actions, and pending actions.</p>
          </div>
          <div className="max-h-96 divide-y overflow-y-auto">
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">My Pending Actions</p>
                {pendingCount ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{pendingCount}</span> : null}
              </div>
              {data.pendingApprovals.map((item) => (
                <Link key={item.id} href={`/documents/${item.id}`} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-sm hover:bg-secondary">
                  <ListTodo className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item.document_no} - {item.title}</span>
                </Link>
              ))}
              {!data.pendingApprovals.length ? <p className="rounded-md p-2 text-sm text-muted-foreground">No pending actions.</p> : null}
            </section>
            <section className="space-y-1 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase text-muted-foreground">My Notifications</p>
                {notificationCount ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">{notificationCount}</span> : null}
              </div>
              {data.notifications.map((notification) => (
                <Link key={notification.id} href={notification.action_url ?? "#"} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-sm hover:bg-secondary">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
                  <span><span className="block">{notification.title}</span>{notification.message ? <span className="block text-xs text-muted-foreground">{notification.message}</span> : null}</span>
                </Link>
              ))}
              {data.announcements.map((notification) => (
                <div key={notification.id} className="flex gap-2 rounded-md p-2 text-sm">
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
              {data.assignedActivities.map((activity) => (
                <div key={activity.id} className="rounded-md p-2 text-sm">
                  <p>{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatTime(activity.created_at)}</p>
                </div>
              ))}
              {!data.assignedActivities.length ? <p className="rounded-md p-2 text-sm text-muted-foreground">No recent activity.</p> : null}
            </section>
          </div>
        </div>
      ) : null}
    </div>
  );
}
