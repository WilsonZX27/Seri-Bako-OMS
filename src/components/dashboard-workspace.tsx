"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CalendarCheck, CheckCircle2, PackageCheck, ReceiptText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import type { LucideIcon } from "lucide-react";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function MetricCard({ href, label, value, icon: Icon, tone = "neutral" }: { href: string; label: string; value: string | number; icon: LucideIcon; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const toneClass = {
    neutral: "text-slate-600 bg-slate-50",
    green: "text-emerald-700 bg-emerald-50",
    amber: "text-amber-700 bg-amber-50",
    red: "text-red-700 bg-red-50",
    blue: "text-blue-700 bg-blue-50",
  }[tone];

  return (
    <Link href={href} className="flex min-h-20 items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-colors hover:border-primary/30">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
      </div>
    </Link>
  );
}

function CompactPanel({ title, children, action }: { title: string; children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function quickActionsForRole(role: UserRole) {
  const admin = ["super_admin", "operations_admin", "admin"].includes(role);
  if (admin) {
    return [
      { href: "/data-onboarding", label: "Data Onboarding" },
      { href: "/staffs", label: "Staff" },
      { href: "/purchase-requests?status=in_review", label: "Approvals" },
    ];
  }
  if (role === "purchasing") return [
    { href: "/purchase-requests?status=purchasing_review", label: "Review PR" },
    { href: "/purchase-orders", label: "Open PO" },
    { href: "/suppliers", label: "Suppliers" },
  ];
  if (role === "manager") return [
    { href: "/purchase-requests?status=pending_approval", label: "Manager Approval" },
    { href: "/reports", label: "Reports" },
  ];
  if (role === "finance") return [
    { href: "/reports", label: "Reports" },
    { href: "/documents", label: "Documents" },
  ];
  return [
    { href: "/purchase-requests/new", label: "Create PR" },
    { href: "/goods-receivings", label: "Receiving" },
    { href: "/stock-counts", label: "Stock Count" },
  ];
}

export function DashboardWorkspace({ summary, role }: { summary: DashboardSummary; role: UserRole }) {
  const metrics = [
    { href: "/purchase-requests?status=in_review", label: "Pending approvals", value: formatNumber(summary.pendingApprovals.length), icon: CheckCircle2, tone: summary.pendingApprovals.length ? "amber" as const : "green" as const },
    { href: "/purchase-requests?priority=urgent", label: "Urgent PR", value: formatNumber(summary.urgentRequests.length), icon: TriangleAlert, tone: summary.urgentRequests.length ? "red" as const : "green" as const },
    { href: "/low-stock", label: "Low stock", value: formatNumber(summary.lowStockCount), icon: AlertTriangle, tone: summary.lowStockCount ? "amber" as const : "green" as const },
    { href: "/goods-receivings", label: "Today receiving", value: formatNumber(summary.today.goodsReceiving), icon: PackageCheck, tone: "blue" as const },
    { href: "/stock-counts", label: "Stock issues", value: formatNumber(summary.today.stockCountDue), icon: CalendarCheck, tone: summary.today.stockCountDue ? "amber" as const : "neutral" as const },
  ];
  const quickActions = quickActionsForRole(role);

  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 md:grid-cols-5">
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4 lg:grid-cols-2">
          <CompactPanel title="My Pending Actions" action={{ href: "/purchase-requests?status=in_review", label: "Open" }}>
            <div className="grid gap-2">
              <Link href="/purchase-requests?status=in_review" className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm hover:bg-secondary">
                <span>Workflow approvals</span>
                <Badge variant={summary.pendingApprovals.length ? "warning" : "success"}>{formatNumber(summary.pendingApprovals.length)}</Badge>
              </Link>
              <Link href="/purchase-requests?priority=urgent" className="flex items-center justify-between rounded-md border bg-white px-3 py-2 text-sm hover:bg-secondary">
                <span>Urgent procurement</span>
                <Badge variant={summary.urgentRequests.length ? "danger" : "success"}>{formatNumber(summary.urgentRequests.length)}</Badge>
              </Link>
            </div>
          </CompactPanel>

          <CompactPanel title="Recent Operational Movement" action={{ href: "/activity", label: "View" }}>
            <div className="space-y-2">
              {summary.recentActivities.slice(0, 4).map((activity) => (
                <div key={activity.id} className="rounded-md border bg-white px-3 py-2 text-sm">
                  <p className="line-clamp-1">{activity.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}</p>
                </div>
              ))}
              {!summary.recentActivities.length ? <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">No recent activity.</p> : null}
            </div>
          </CompactPanel>

          <CompactPanel title="Today's Operations Summary" action={{ href: "/daily-operations", label: "Open" }}>
            <div className="grid gap-2 sm:grid-cols-2">
              <MetricCard href="/goods-receivings" label="Receiving today" value={formatNumber(summary.today.goodsReceiving)} icon={PackageCheck} />
              <MetricCard href="/production/jobs" label="Production today" value={formatNumber(summary.today.production)} icon={Boxes} />
            </div>
          </CompactPanel>

          <CompactPanel title="Finance Foundation">
            <div className="grid gap-2 sm:grid-cols-3">
              <MetricCard href="/reports" label="Payables" value={formatCurrency(summary.financeForecast.upcomingPayables)} icon={ReceiptText} />
              <MetricCard href="/purchase-orders" label="PO value" value={formatCurrency(summary.financeForecast.pendingPoValue)} icon={ReceiptText} />
              <MetricCard href="/goods-receivings" label="Not invoiced" value={formatNumber(summary.financeForecast.receivingNotInvoiced)} icon={PackageCheck} tone="amber" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Finance forecast will improve as PO, GRN, and supplier invoice data grows.</p>
          </CompactPanel>
        </div>

        <div className="space-y-4">
          <CompactPanel title="Quick Actions">
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <Button key={action.href} asChild variant="outline" className="justify-start">
                  <Link href={action.href}>{action.label}</Link>
                </Button>
              ))}
            </div>
          </CompactPanel>

          <CompactPanel title="Notifications">
            <div className="space-y-2">
              {summary.notifications.slice(0, 4).map((notification) => (
                <div key={notification.id} className="rounded-md border bg-white px-3 py-2 text-sm">
                  <p className="font-medium">{notification.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                </div>
              ))}
              {!summary.notifications.length ? <p className="rounded-md border bg-white p-3 text-sm text-muted-foreground">No new notifications.</p> : null}
            </div>
          </CompactPanel>

          {["super_admin", "operations_admin", "admin"].includes(role) ? (
            <CompactPanel title="Readiness">
              <div className="space-y-2 text-sm">
                <Link href="/data-onboarding" className="flex items-center gap-2 rounded-md border bg-white px-3 py-2 hover:bg-secondary">
                  <Boxes className="h-4 w-4 text-primary" />
                  Data onboarding and setup checks
                </Link>
              </div>
            </CompactPanel>
          ) : null}
        </div>
      </div>
    </div>
  );
}
