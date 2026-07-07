"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, Clock3, PackageCheck, ReceiptText, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
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

const futureAnalyticsWidgets = [
  "weekly_supply_volume",
  "predicted_weekly_purchase_spend",
  "highest_wastage_item",
  "most_purchased_item",
  "supplier_payable_aging",
  "top_unpaid_suppliers",
] as const;

export function DashboardWorkspace({ summary, role }: { summary: DashboardSummary; role: UserRole }) {
  const today = new Date().toISOString().slice(0, 10);
  const metrics = [
    { href: "/documents?status=pending_approval", label: "Pending approvals", value: formatNumber(summary.pendingApprovals.length), icon: CheckCircle2, tone: summary.pendingApprovals.length ? "amber" as const : "green" as const },
    { href: "/purchase-requests?priority=urgent", label: "Urgent PR", value: formatNumber(summary.urgentRequests.length), icon: TriangleAlert, tone: summary.urgentRequests.length ? "red" as const : "green" as const },
    { href: "/stock-balance?status=low_stock", label: "Low stock", value: formatNumber(summary.lowStockCount), icon: AlertTriangle, tone: summary.lowStockCount ? "amber" as const : "green" as const },
    { href: `/production/jobs?from=${today}&to=${today}`, label: "Production today", value: formatNumber(summary.today.production), icon: Boxes, tone: "blue" as const },
  ];
  const pendingActions = summary.pendingApprovals.slice(0, 5);
  const stuckRequests = summary.urgentRequests.slice(0, 4);

  return (
    <div className="space-y-4">
      <div className="px-5 pt-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
      </div>

      <WorkspaceGrid
        className="pt-0"
        rightRail={
          <>
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
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <CompactPanel title="Pending Actions" action={{ href: "/documents?status=pending_approval", label: "Review" }}>
              {pendingActions.length ? (
                <div className="divide-y rounded-lg border bg-white">
                  {pendingActions.map((document) => (
                    <Link key={document.id} href={document.href ?? "/documents"} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold">{document.document_no}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[document.step ?? document.title ?? "Pending review", document.branch_name, document.age_label].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">{document.step ?? "In Review"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="No pending actions" description="Nothing needs your review right now." />
              )}
            </CompactPanel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <CompactPanel title="Stuck or Urgent PRs" action={{ href: "/purchase-requests?priority=urgent", label: "Open PRs" }}>
              {stuckRequests.length ? (
                <div className="divide-y rounded-lg border bg-white">
                  {stuckRequests.map((request) => (
                    <Link key={request.id} href={`/purchase-requests/${request.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm font-semibold">{request.request_no}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{request.needed_by_date ? `Needed by ${request.needed_by_date}` : "Needed date not set"}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-800">{request.priority ?? "Urgent"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Clock3} title="No stuck PRs" description="Urgent and critical PRs will appear here when they need attention." />
              )}
            </CompactPanel>

            <CompactPanel title="Today's Flow" action={{ href: "/daily-operations", label: "Open" }}>
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricCard href="/goods-receivings" label="Receiving today" value={formatNumber(summary.today.goodsReceiving)} icon={PackageCheck} />
                <MetricCard href="/production/jobs" label="Production today" value={formatNumber(summary.today.production)} icon={Boxes} />
              </div>
            </CompactPanel>
          </div>

          <CompactPanel title="Finance Forecast">
            <div className="grid gap-2 sm:grid-cols-3">
              <MetricCard href="/reports" label="Payables" value={formatCurrency(summary.financeForecast.upcomingPayables)} icon={ReceiptText} />
              <MetricCard href="/purchase-orders" label="PO value" value={formatCurrency(summary.financeForecast.pendingPoValue)} icon={ReceiptText} />
              <MetricCard href="/goods-receivings" label="Not invoiced" value={formatNumber(summary.financeForecast.receivingNotInvoiced)} icon={PackageCheck} tone="amber" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Finance forecast will improve as PO, GRN, and supplier invoice data grows.</p>
            <span className="sr-only">Prepared future analytics widgets: {futureAnalyticsWidgets.join(", ")}</span>
          </CompactPanel>
        </div>
      </WorkspaceGrid>
    </div>
  );
}
