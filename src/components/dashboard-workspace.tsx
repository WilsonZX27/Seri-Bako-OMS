"use client";

import Link from "next/link";
import { AlertTriangle, Bell, Boxes, CalendarCheck, CheckCircle2, ClipboardCheck, Factory, PackageCheck, RotateCcw, ScanLine, Truck, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { WorkspaceQuickInsights, type WorkspaceInsight } from "@/components/workspace-panels";
import { formatNumber } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { LucideIcon } from "lucide-react";

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

function QuickToolCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: LucideIcon }) {
  return (
    <Link href={href} className="block h-full rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-[var(--sb-muted)]">
      <div className="flex h-full gap-3">
        <div className="sb-icon-tile">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function AttentionCard({ href, title, value, description, icon: Icon, tone = "secondary" }: { href: string; title: string; value: string | number; description: string; icon: LucideIcon; tone?: "secondary" | "warning" | "danger" | "success" }) {
  return (
    <Link href={href} className="flex min-h-28 items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/30 hover:bg-[var(--sb-muted)]">
      <div className="sb-icon-tile">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <Badge variant={tone}>{value}</Badge>
        </div>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">{description}</p>
      </div>
    </Link>
  );
}

export function DashboardWorkspace({ summary, role }: { summary: DashboardSummary; role: UserRole }) {
  const [layout, setLayout] = useState<LayoutState>({ order: defaultOrder, hidden: [] });
  const dashboardInsights: WorkspaceInsight[] = [
    { label: "Active Items", value: formatNumber(summary.totalItems), icon: Boxes, theme: "green" },
    { label: "Suppliers", value: formatNumber(summary.totalSuppliers), icon: Truck, theme: "blue" },
    { label: "Low Stock Alerts", value: formatNumber(summary.lowStockCount), icon: AlertTriangle, theme: summary.lowStockCount ? "amber" : "green" },
    { label: "Pending Approvals", value: formatNumber(summary.pendingApprovals.length), icon: CheckCircle2, theme: "purple" },
  ];

  useEffect(() => {
    setLayout(loadLayout());
  }, []);

  function save(next: LayoutState) {
    setLayout(next);
    window.localStorage.setItem(storageKey, JSON.stringify(next));
  }

  return (
    <div className="space-y-5 p-5">
      <WorkspaceQuickInsights insights={dashboardInsights} action={{ href: "/documents?approval_status=pending", label: "Review approvals" }} />

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
        </div>
      </div>

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

      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div>
          <p className="sb-section-label">Quick Actions</p>
          <h2 className="mt-1 text-lg font-semibold">Frequent actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fast branch-first work for daily operations.</p>
        </div>
        <div className="grid items-stretch gap-3 md:grid-cols-2 xl:grid-cols-4">
          <QuickToolCard href="/stock-counts/scan" title="Stock Count" description="Count stock by branch with search or camera scan." icon={ClipboardCheck} />
          <QuickToolCard href="/goods-receivings/scan" title="Scan Receiving" description="Prepare receiving lines from delivered items." icon={PackageCheck} />
          <QuickToolCard href="/stock-wastage/new" title="Report Wastage" description="Record damaged, expired, missing, or claimable stock." icon={TriangleAlert} />
          <QuickToolCard href="/stock-transfers/new" title="Transfer Stock" description="Move stock between branches with default stores." icon={ScanLine} />
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
          <p className="mt-1 text-sm text-muted-foreground">Compact shortcuts for the decisions most likely to block daily work.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <AttentionCard href="/low-stock" title="Low Stock" value={formatNumber(summary.lowStockCount)} description="Items below safety stock." icon={AlertTriangle} tone={summary.lowStockCount ? "warning" : "success"} />
          <AttentionCard href="/purchase-requests?priority=urgent" title="Urgent PRs" value={formatNumber(summary.urgentRequests.length)} description="Critical or urgent requests." icon={TriangleAlert} tone={summary.urgentRequests.length ? "danger" : "success"} />
          <AttentionCard href="/documents?approval_status=pending" title="Approvals" value={formatNumber(summary.pendingApprovals.length)} description="Documents waiting for review." icon={ClipboardCheck} tone={summary.pendingApprovals.length ? "warning" : "success"} />
          <AttentionCard href="/purchase-orders" title="Purchase Orders" value={formatNumber(summary.purchaseOrders.length)} description="Recent supplier order activity." icon={PackageCheck} tone="secondary" />
        </div>
      </section>
    </div>
  );
}
