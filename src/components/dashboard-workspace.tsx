"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Boxes, CalendarCheck, CheckCircle2, EyeOff, Factory, FileText, PackageCheck, RotateCcw, Truck } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PriorityBadge } from "@/components/priority-badge";
import { StatCard } from "@/components/ui/stat-card";
import { formatNumber } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

const defaultOrder = [
  "low-stock",
  "urgent-procurement",
  "pending-approvals",
  "purchase-requests",
  "purchase-orders",
  "receiving-today",
  "stock-count-due",
  "production-today",
  "deliveries-today",
  "recent-documents",
  "recent-activities",
  "notifications",
];

const storageKey = "seri-bako-dashboard-layout-v1";

type LayoutState = {
  order: string[];
  hidden: string[];
};

function loadLayout(): LayoutState {
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? "") as LayoutState;
  } catch {
    return { order: defaultOrder, hidden: [] };
  }
}

function Widget({ id, title, description, children, onHide, onMove }: { id: string; title: string; description?: string; children: ReactNode; onHide: (id: string) => void; onMove: (id: string, direction: -1 | 1) => void }) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => onMove(id, -1)}>Up</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => onMove(id, 1)}>Down</Button>
          <Button type="button" variant="ghost" size="icon" onClick={() => onHide(id)} aria-label={`Hide ${title}`}>
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function DashboardWorkspace({ summary, role }: { summary: DashboardSummary; role: UserRole }) {
  const [layout, setLayout] = useState<LayoutState>({ order: defaultOrder, hidden: [] });

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  function save(next: LayoutState) {
    setLayout(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function hide(id: string) {
    save({ ...layout, hidden: [...new Set([...layout.hidden, id])] });
  }

  function move(id: string, direction: -1 | 1) {
    const order = [...layout.order];
    const index = order.indexOf(id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    save({ ...layout, order });
  }

  const widgets: Record<string, ReactNode> = {
    "quick-actions": (
      <Widget id="quick-actions" title="Quick Actions" description="Common operations" onHide={hide} onMove={move}>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="secondary"><Link href="/purchase-requests/new">Create Purchase Request</Link></Button>
          <Button asChild variant="secondary"><Link href="/stock-count/scan">Open Stock Count</Link></Button>
          <Button asChild variant="secondary"><Link href="/goods-receiving/scan">Scan Receiving</Link></Button>
          <Button asChild variant="secondary"><Link href="/items">Find Item</Link></Button>
        </div>
      </Widget>
    ),
    "low-stock": (
      <Widget id="low-stock" title="Low Stock" description="Items below safety stock" onHide={hide} onMove={move}>
        <div className="space-y-2">
          {summary.lowStockItems.map((item) => (
            <div key={item.item_id} className="flex justify-between rounded-md border p-3">
              <div><p className="text-sm font-medium">{item.item_name}</p><p className="text-xs text-muted-foreground">{item.item_code}</p></div>
              <Badge variant="warning">{formatNumber(item.shortage_quantity)} {item.base_unit}</Badge>
            </div>
          ))}
        </div>
      </Widget>
    ),
    "urgent-procurement": (
      <Widget id="urgent-procurement" title="Urgent Procurement" description="Critical and urgent PRs needing attention" onHide={hide} onMove={move}>
        <div className="space-y-2">
          {summary.urgentRequests.map((pr) => (
            <Link key={pr.id} href={`/purchase-requests/${pr.id}`} className="flex items-center justify-between rounded-md border p-3 text-sm hover:bg-secondary">
              <div>
                <p className="font-medium">{pr.request_no}</p>
                <p className="text-xs text-muted-foreground">{pr.needed_by_date ? `Needed by ${pr.needed_by_date}` : pr.status}</p>
              </div>
              <PriorityBadge priority={pr.priority} />
            </Link>
          ))}
          {!summary.urgentRequests.length ? <p className="rounded-md border p-4 text-sm text-muted-foreground">No urgent procurement requests right now.</p> : null}
        </div>
      </Widget>
    ),
    "pending-approvals": (
      <Widget id="pending-approvals" title="Pending Approvals" onHide={hide} onMove={move}>
        <div className="space-y-2">{summary.pendingApprovals.map((doc) => <Link key={doc.id} href={`/documents/${doc.id}`} className="block rounded-md border p-3 text-sm hover:bg-secondary">{doc.document_no} - {doc.title}</Link>)}</div>
      </Widget>
    ),
    "purchase-requests": (
      <Widget id="purchase-requests" title="Purchase Requests" onHide={hide} onMove={move}>
        <div className="space-y-2">{summary.purchaseRequests.map((pr) => <Link key={pr.id} href={`/purchase-requests/${pr.id}`} className="flex justify-between rounded-md border p-3 text-sm hover:bg-secondary"><span>{pr.request_no}</span><Badge variant="secondary">{pr.status}</Badge></Link>)}</div>
      </Widget>
    ),
    "purchase-orders": (
      <Widget id="purchase-orders" title="Purchase Orders" onHide={hide} onMove={move}>
        <div className="space-y-2">{summary.purchaseOrders.map((po) => <Link key={po.id} href={`/purchase-orders/${po.id}`} className="flex justify-between rounded-md border p-3 text-sm hover:bg-secondary"><span>{po.po_no}</span><Badge variant="secondary">{po.status}</Badge></Link>)}</div>
      </Widget>
    ),
    "recent-documents": (
      <Widget id="recent-documents" title="Recent Documents" onHide={hide} onMove={move}>
        <div className="space-y-2">{summary.recentDocuments.map((doc) => <Link key={doc.id} href={`/documents/${doc.id}`} className="block rounded-md border p-3 text-sm hover:bg-secondary">{doc.document_no} - {doc.document_type.replaceAll("_", " ")}</Link>)}</div>
      </Widget>
    ),
    "recent-activities": (
      <Widget id="recent-activities" title="Recent Activities" onHide={hide} onMove={move}>
        <div className="space-y-2">{summary.recentActivities.map((activity) => <div key={activity.id} className="rounded-md border p-3 text-sm">{activity.message}</div>)}</div>
      </Widget>
    ),
    "notifications": (
      <Widget id="notifications" title="Notifications" onHide={hide} onMove={move}>
        <div className="space-y-2">{summary.notifications.map((notification) => <div key={notification.id} className="rounded-md border p-3 text-sm"><p className="font-medium">{notification.title}</p><p className="text-muted-foreground">{notification.message}</p></div>)}</div>
      </Widget>
    ),
    "receiving-today": <StatCard label="Goods Receiving Today" value={summary.today.goodsReceiving} icon={PackageCheck} tone="accent" />,
    "stock-count-due": <StatCard label="Stock Count Due" value={summary.today.stockCountDue} icon={CalendarCheck} tone="warning" />,
    "production-today": <StatCard label="Today's Production" value={summary.today.production} icon={Factory} />,
    "deliveries-today": <StatCard label="Today's Deliveries" value={summary.today.deliveries} icon={Truck} tone="accent" />,
  };

  return (
    <div className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div>
          <p className="sb-section-label">Dashboard</p>
          <h2 className="mt-1 text-lg font-semibold">Today&apos;s operating picture</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "admin" ? (
            <Button asChild variant="outline">
              <Link href="/data-onboarding">Data Onboarding</Link>
            </Button>
          ) : null}
          <Button asChild variant="secondary"><Link href="/quick-tools">Open Quick Tools</Link></Button>
        </div>
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <p className="sb-section-label">Master Data</p>
          <h2 className="mt-1 text-lg font-semibold">System readiness</h2>
          <p className="mt-1 text-sm text-muted-foreground">Reference records that keep operations moving cleanly.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Active item records" value={summary.totalItems} icon={Boxes} />
          <StatCard label="Supplier records" value={summary.totalSuppliers} icon={Truck} tone="accent" />
          <StatCard label="Low stock alerts" value={summary.lowStockCount} icon={AlertTriangle} tone="warning" />
          <StatCard label="Pending approvals" value={summary.pendingApprovals.length} icon={CheckCircle2} />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-[var(--sb-muted)] p-4">
        <div>
          <p className="sb-section-label">Operation Today</p>
          <h2 className="mt-1 text-lg font-semibold">What needs handling today</h2>
          <p className="mt-1 text-sm text-muted-foreground">Live activity counters for receiving, counts, production, and deliveries.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Goods Receiving Today" value={summary.today.goodsReceiving} icon={PackageCheck} tone="accent" />
          <StatCard label="Stock Count Due" value={summary.today.stockCountDue} icon={CalendarCheck} tone="warning" />
          <StatCard label="Today's Production" value={summary.today.production} icon={Factory} />
          <StatCard label="Today's Deliveries" value={summary.today.deliveries} icon={Truck} tone="accent" />
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Workspace layout is saved for this user.</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => save({ order: defaultOrder, hidden: [] })}>
          <RotateCcw className="h-4 w-4" />
          Reset widgets
        </Button>
        {layout.hidden.length ? <span className="text-xs text-muted-foreground">Hidden: {layout.hidden.join(", ")}</span> : null}
      </div>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <p className="sb-section-label">Attention Needed</p>
          <h2 className="mt-1 text-lg font-semibold">Warnings and approvals</h2>
          <p className="mt-1 text-sm text-muted-foreground">Items that need a decision before they become an operational problem.</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {["low-stock", "urgent-procurement", "pending-approvals", "purchase-requests", "purchase-orders"]
            .filter((id) => !layout.hidden.includes(id))
            .map((id) => <div key={id}>{widgets[id]}</div>)}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <p className="sb-section-label">Recent Activity</p>
          <h2 className="mt-1 text-lg font-semibold">Latest movement</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recent documents, activity, and notifications across the workspace.</p>
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {["recent-documents", "recent-activities", "notifications"]
            .filter((id) => !layout.hidden.includes(id))
            .map((id) => <div key={id}>{widgets[id] ?? <Card><CardContent className="p-5"><FileText className="h-4 w-4" /></CardContent></Card>}</div>)}
        </div>
      </section>
    </div>
  );
}
