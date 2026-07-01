"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Boxes, CalendarCheck, CheckCircle2, ClipboardCheck, ClipboardList, EyeOff, Factory, FileText, PackageCheck, PackageSearch, RotateCcw, ScanLine, Settings, ShoppingCart, TriangleAlert, Truck, Users } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { formatNumber } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

const defaultOrder = [
  "low-stock",
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

function roleAllowed(roles: UserRole[] | "all", role: UserRole) {
  return roles === "all" || roles.includes(role);
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

  const roleList = (...values: UserRole[]) => values;
  const quickTools: Array<{ href: string; title: string; description: string; icon: LucideIcon; roles: UserRole[] | "all" }> = [
    { href: "/stock-counts/scan", title: "Stock Count", description: "Scan or type barcodes for daily counts.", icon: ClipboardCheck, roles: roleList("admin", "kitchen") },
    { href: "/goods-receivings/scan", title: "Scan Receiving", description: "Prepare receiving lines from scanned items.", icon: PackageCheck, roles: roleList("admin", "kitchen", "purchasing") },
    { href: "/stock-wastage/new", title: "Report Wastage", description: "Record branch wastage quickly.", icon: TriangleAlert, roles: roleList("admin", "kitchen") },
    { href: "/stock-transfers/new", title: "Transfer Stock", description: "Move stock between branches.", icon: ScanLine, roles: roleList("admin", "kitchen") },
    { href: "/items", title: "Find Item", description: "Search items, images, and barcodes.", icon: PackageSearch, roles: roleList("admin", "kitchen", "purchasing") },
    { href: "/recipes", title: "Recipes", description: "Open recipe and costing records.", icon: Factory, roles: roleList("admin", "kitchen") },
    { href: "/purchase-requests/new", title: "Create Purchase Request", description: "Request ingredients or packaging.", icon: ClipboardList, roles: roleList("admin", "kitchen", "purchasing") },
    { href: "/purchase-requests", title: "Review PR", description: "Check requests waiting for action.", icon: CheckCircle2, roles: roleList("admin", "purchasing", "finance") },
    { href: "/purchase-orders", title: "Purchase Orders", description: "Review supplier order status.", icon: ShoppingCart, roles: roleList("admin", "purchasing", "finance") },
    { href: "/documents", title: "Documents", description: "Open approvals and document history.", icon: FileText, roles: "all" as const },
    { href: "/reports", title: "Reports", description: "Stock and purchasing summaries.", icon: FileText, roles: roleList("admin", "finance", "purchasing") },
    { href: "/staffs", title: "Staffs", description: "Invite and manage staff access.", icon: Users, roles: roleList("admin") },
    { href: "/settings", title: "Settings", description: "Company, branches, roles, and numbering.", icon: Settings, roles: roleList("admin") },
    { href: "/imports/items", title: "Import Data", description: "Download templates and preview imports.", icon: Boxes, roles: roleList("admin") },
  ].filter((tool) => roleAllowed(tool.roles, role));

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
      <section className="space-y-3">
        <div>
          <p className="sb-section-label">Quick tools</p>
          <h2 className="mt-1 text-lg font-semibold">Choose what you need to do now</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {quickTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.href} href={tool.href} className="group rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-[var(--sb-muted)]">
                <div className="flex items-start gap-3">
                  <div className="sb-icon-tile">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold">{tool.title}</p>
                    <p className="mt-1 text-sm leading-5 text-muted-foreground">{tool.description}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
        {!quickTools.length ? (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">No quick tools are assigned to this role yet. Please contact an Admin if you need access.</CardContent>
          </Card>
        ) : null}
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Active item records" value={summary.totalItems} icon={Boxes} />
        <StatCard label="Supplier records" value={summary.totalSuppliers} icon={Truck} tone="accent" />
        <StatCard label="Low stock alerts" value={summary.lowStockCount} icon={AlertTriangle} tone="warning" />
        <StatCard label="Pending approvals" value={summary.pendingApprovals.length} icon={CheckCircle2} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Workspace layout is saved for this user.</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => save({ order: defaultOrder, hidden: [] })}>
          <RotateCcw className="h-4 w-4" />
          Reset widgets
        </Button>
        {layout.hidden.length ? <span className="text-xs text-muted-foreground">Hidden: {layout.hidden.join(", ")}</span> : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {layout.order.filter((id) => id !== "quick-actions" && !layout.hidden.includes(id)).map((id) => (
          <div key={id}>{widgets[id] ?? <Card><CardContent className="p-5"><FileText className="h-4 w-4" /></CardContent></Card>}</div>
        ))}
      </div>
    </div>
  );
}
