"use client";

import Link from "next/link";
import { Bell, CheckCircle2, ListTodo } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type TopBarActivity = Awaited<ReturnType<typeof import("@/server/queries/topbar").getTopBarActivity>>;

export function TopBarActivityMenu({ data }: { data: TopBarActivity }) {
  const [open, setOpen] = useState(false);
  const count = data.pendingApprovals.length + data.activities.length + data.notifications.length;

  return (
    <div className="relative">
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen((value) => !value)} aria-label="Open notifications">
        <Bell className="h-5 w-5" />
        {count ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" /> : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-lg border bg-card shadow-lg">
          <div className="border-b p-3">
            <p className="text-sm font-semibold">Workspace updates</p>
            <p className="text-xs text-muted-foreground">Approvals, recent activity, and reminders.</p>
          </div>
          <div className="max-h-96 overflow-y-auto p-2">
            <p className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">To do</p>
            {data.pendingApprovals.map((item) => (
              <Link key={item.id} href={`/documents/${item.id}`} onClick={() => setOpen(false)} className="flex gap-2 rounded-md p-2 text-sm hover:bg-secondary">
                <ListTodo className="mt-0.5 h-4 w-4 text-primary" />
                <span>{item.document_no} - {item.title}</span>
              </Link>
            ))}
            <p className="mt-2 px-2 py-1 text-xs font-semibold uppercase text-muted-foreground">Activity</p>
            {data.activities.map((activity) => (
              <div key={activity.id} className="flex gap-2 rounded-md p-2 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <span>{activity.message}</span>
              </div>
            ))}
            {!count ? <p className="p-6 text-center text-sm text-muted-foreground">No new updates.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
