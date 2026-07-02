"use client";

import Link from "next/link";
import { Bell, ListTodo, Megaphone, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type TopBarActivity = Awaited<ReturnType<typeof import("@/server/queries/topbar").getTopBarActivity>>;

export function TopBarActivityMenu({ data }: { data: TopBarActivity }) {
  const [open, setOpen] = useState(false);
  const count = data.pendingApprovals.length + data.assignedActivities.length + data.notifications.length + data.announcements.length;
  const formatTime = (value: string) => new Date(value).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label="Open workspace updates">
        <Bell className="h-5 w-5" />
        {count ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" /> : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="border-b p-3">
            <p className="text-sm font-semibold">Workspace Updates</p>
            <p className="text-xs text-muted-foreground">Notifications, recent activity, assigned actions, and pending actions.</p>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto p-3">
            <section className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">My Pending Actions</p>
              {data.pendingApprovals.map((item) => (
                <Link key={item.id} href={`/documents/${item.id}`} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-sm hover:bg-secondary">
                  <ListTodo className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{item.document_no} - {item.title}</span>
                </Link>
              ))}
            </section>
            <section className="space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">My Notifications</p>
              {data.notifications.map((notification) => (
                <Link key={notification.id} href={notification.action_url ?? "#"} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-sm hover:bg-secondary">
                  <ShieldAlert className="mt-0.5 h-4 w-4 text-primary" />
                  <span><span className="block">{notification.title}</span>{notification.message ? <span className="block text-xs text-muted-foreground">{notification.message}</span> : null}</span>
                </Link>
              ))}
            </section>
            {data.assignedActivities.length ? (
              <section className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Recent Activity</p>
                {data.assignedActivities.map((activity) => (
                  <div key={activity.id} className="rounded-md p-2 text-sm">
                    <p>{activity.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatTime(activity.created_at)}</p>
                  </div>
                ))}
              </section>
            ) : null}
            {data.announcements.length ? (
              <section className="space-y-1">
                <p className="text-xs font-semibold uppercase text-muted-foreground">Company Announcements</p>
                {data.announcements.map((notification) => (
                  <div key={notification.id} className="flex gap-2 rounded-md p-2 text-sm">
                    <Megaphone className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span>{notification.title}</span>
                  </div>
                ))}
              </section>
            ) : null}
            {!count ? <p className="p-6 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
