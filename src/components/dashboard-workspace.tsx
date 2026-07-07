"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, Clock3, PackageCheck, ReceiptText, RotateCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
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
    <Link href={href} className="flex min-h-16 items-center gap-3 rounded-lg border bg-white p-3 shadow-sm transition-colors hover:border-primary/30">
      <div className={`flex h-9 w-9 items-center justify-center rounded-md ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.04em] text-muted-foreground">{label}</p>
        <p className="mt-1 text-lg font-semibold leading-none">{value}</p>
      </div>
    </Link>
  );
}

function CompactPanel({ title, children, action }: { title: string; children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <section className="rounded-lg border bg-card p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-semibold">{title}</h2>
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

export function DashboardWorkspace({ summary }: { summary: DashboardSummary }) {
  const today = new Date().toISOString().slice(0, 10);
  const metrics = [
    { href: "/purchase-requests?status=admin_review", label: "Pending PRs", value: formatNumber(summary.pendingApprovals.length), icon: ClipboardCheck, tone: summary.pendingApprovals.length ? "amber" as const : "green" as const },
    { href: "/stock-balance?status=low_stock", label: "Low Stock Items", value: formatNumber(summary.lowStockCount), icon: AlertTriangle, tone: summary.lowStockCount ? "red" as const : "green" as const },
    { href: `/production/jobs?from=${today}&to=${today}`, label: "Active Production", value: formatNumber(summary.today.production), icon: Boxes, tone: "blue" as const },
    { href: "/goods-receivings", label: "Goods Receiving", value: formatNumber(summary.today.goodsReceiving), icon: PackageCheck, tone: "neutral" as const },
  ];
  const pendingActions = summary.pendingApprovals.slice(0, 5);
  const stuckRequests = summary.urgentRequests.slice(0, 4);

  return (
    <div className="space-y-3">
      <div className="px-4 pt-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => <MetricCard key={metric.label} {...metric} />)}
        </div>
      </div>

      <WorkspaceGrid
        className="pt-0"
        rightRail={
          <>
            <CompactPanel title="Quick Actions">
              <div className="grid gap-2">
                <Button asChild className="justify-start">
                  <Link href="/purchase-requests/new"><Zap className="h-3.5 w-3.5" /> Create Purchase Request</Link>
                </Button>
                <Button asChild variant="secondary" className="justify-start">
                  <Link href="/stock-wastage/new"><AlertTriangle className="h-3.5 w-3.5" /> Record Stock Wastage</Link>
                </Button>
                <Button asChild variant="outline" className="justify-start">
                  <Link href="/production/jobs/new"><Boxes className="h-3.5 w-3.5" /> New Production Job</Link>
                </Button>
              </div>
            </CompactPanel>

            <CompactPanel title="Recent Activity">
              <div className="space-y-2">
                {summary.recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="rounded-md border bg-white px-3 py-2 text-xs">
                    <p className="line-clamp-2 font-medium">{activity.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                ))}
                {!summary.recentActivities.length ? <p className="rounded-md border bg-white p-3 text-xs text-muted-foreground">No recent activity.</p> : null}
              </div>
            </CompactPanel>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <CompactPanel title="Today's Attention" action={{ href: "/documents?status=pending_approval", label: "Review" }}>
              {pendingActions.length ? (
                <div className="divide-y rounded-lg border bg-white">
                  {pendingActions.map((document) => (
                    <Link key={document.id} href={document.href ?? "/documents"} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold">{document.document_no}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[document.step ?? document.title ?? "Pending review", document.branch_name, document.age_label].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">{document.step ?? "In Review"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="No pending actions" description="Nothing needs your review right now." />
              )}
            </CompactPanel>
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <CompactPanel title="Procurement Queue" action={{ href: "/purchase-requests?priority=urgent", label: "View Queue" }}>
              {stuckRequests.length ? (
                <div className="divide-y rounded-lg border bg-white">
                  {stuckRequests.map((request) => (
                    <Link key={request.id} href={`/purchase-requests/${request.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 text-xs hover:bg-slate-50">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-xs font-semibold">{request.request_no}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{request.needed_by_date ? `Needed by ${request.needed_by_date}` : "Needed date not set"}</p>
                      </div>
                      <span className="shrink-0 rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-800">{request.priority ?? "Urgent"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Clock3} title="No stuck PRs" description="Urgent and critical PRs will appear here when they need attention." />
              )}
            </CompactPanel>

            <CompactPanel title="Production Load" action={{ href: "/production/jobs", label: "Open" }}>
              <div className="grid gap-2 sm:grid-cols-2">
                <MetricCard href="/production/jobs" label="Jobs Today" value={formatNumber(summary.today.production)} icon={Boxes} />
                <MetricCard href="/goods-receivings" label="Receiving Today" value={formatNumber(summary.today.goodsReceiving)} icon={PackageCheck} />
              </div>
            </CompactPanel>
          </div>

          <CompactPanel title="Stock Exceptions" action={{ href: "/stock-balance?status=low_stock", label: "Open Stock" }}>
            <div className="grid gap-2 sm:grid-cols-3">
              <MetricCard href="/stock-balance?status=low_stock" label="Low Stock" value={formatNumber(summary.lowStockCount)} icon={AlertTriangle} tone={summary.lowStockCount ? "red" : "green"} />
              <MetricCard href="/reports" label="Payables" value={formatCurrency(summary.financeForecast.upcomingPayables)} icon={ReceiptText} />
              <MetricCard href="/goods-receivings" label="Not Invoiced" value={formatNumber(summary.financeForecast.receivingNotInvoiced)} icon={RotateCw} tone="amber" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Finance and stock signals improve as PO, GRN, and supplier invoice data grows.</p>
            <span className="sr-only">Prepared future analytics widgets: {futureAnalyticsWidgets.join(", ")}</span>
          </CompactPanel>
        </div>
      </WorkspaceGrid>
    </div>
  );
}
