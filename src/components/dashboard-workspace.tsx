"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, Clock3, PackageCheck, ReceiptText, RotateCw, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function MetricCard({ href, label, value, icon: Icon, tone = "neutral" }: { href: string; label: string; value: string | number; icon: LucideIcon; tone?: "neutral" | "green" | "amber" | "red" | "blue" }) {
  const toneClass = {
    neutral: "text-[var(--sb-neutral-text)] bg-[var(--sb-neutral-bg)]",
    green: "text-[var(--sb-success)] bg-[var(--sb-success-bg)]",
    amber: "text-[var(--sb-warning)] bg-[var(--sb-warning-bg)]",
    red: "text-[var(--sb-danger)] bg-[var(--sb-danger-bg)]",
    blue: "text-[var(--sb-info)] bg-[var(--sb-info-bg)]",
  }[tone];

  return (
    <Link href={href} className="flex min-h-12 items-center justify-between gap-3 rounded-[2px] border border-[var(--sb-border-soft)] bg-white px-3 py-2 transition-colors hover:border-[var(--sb-amber-300)]">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </div>
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="shrink-0 text-right text-lg font-semibold leading-none tabular-nums text-[var(--sb-text)]">{value}</p>
    </Link>
  );
}

function CompactPanel({ title, children, action }: { title: string; children: React.ReactNode; action?: { href: string; label: string } }) {
  return (
    <section className="rounded-[2px] border border-[var(--sb-border-soft)] bg-card p-3">
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold">{title}</h2>
        {action ? (
          <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-[11px]">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function alertAgingHref(row: NonNullable<DashboardSummary["payablesAttention"]>["rows"][number], reportDate: string) {
  if (row.alert_severity === "data_quality") return "/supplier-invoices/aging?bucket=missing_due_date";
  if (row.alert_severity === "critical") return "/supplier-invoices/aging?bucket=overdue_90_plus";
  if (row.alert_severity === "overdue") return "/supplier-invoices/aging?overdue=1";
  if (row.alert_severity === "due_today") return "/supplier-invoices/aging?bucket=due_today";
  return `/supplier-invoices/aging?due_from=${shiftDate(reportDate, 1)}&due_to=${shiftDate(reportDate, 7)}`;
}

export function DashboardWorkspace({ summary }: { summary: DashboardSummary }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const metrics = [
    { href: "/purchase-requests?status=admin_review", label: "Pending PRs", value: formatNumber(summary.pendingApprovals.length), icon: ClipboardCheck, tone: summary.pendingApprovals.length ? ("amber" as const) : ("green" as const) },
    { href: "/stock-balance?status=low_stock", label: "Low Stock Items", value: formatNumber(summary.lowStockCount), icon: AlertTriangle, tone: summary.lowStockCount ? ("red" as const) : ("green" as const) },
    { href: `/production/jobs?from=${today}&to=${today}`, label: "Active Production", value: formatNumber(summary.today.production), icon: Boxes, tone: "blue" as const },
    { href: "/goods-receivings", label: "Goods Receiving", value: formatNumber(summary.today.goodsReceiving), icon: PackageCheck, tone: "neutral" as const },
  ];
  const pendingActions = summary.pendingApprovals.slice(0, 3);
  const stuckRequests = summary.urgentRequests.slice(0, 3);
  const payablesAttention = summary.payablesAttention;
  const operationsControl = summary.operationsControl;

  return (
    <div className="min-h-0">
      <WorkspaceGrid
        className="gap-4 p-4 pb-4 xl:grid-cols-[minmax(0,1fr)_280px]"
        rightRailClassName="space-y-2 xl:max-h-none xl:overflow-visible xl:pr-0"
        rightRail={
          <>
            <ConsoleSection title="Quick Actions">
              <div className="grid gap-2">
                <Button asChild size="sm" className="h-9 justify-start px-3 text-xs">
                  <Link href="/purchase-requests/new"><Zap className="h-3.5 w-3.5" /> Create Purchase Request</Link>
                </Button>
                <Button asChild variant="secondary" size="sm" className="h-9 justify-start px-3 text-xs">
                  <Link href="/stock-wastage/new"><AlertTriangle className="h-3.5 w-3.5" /> Record Stock Wastage</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="h-9 justify-start px-3 text-xs">
                  <Link href="/production/jobs/new"><Boxes className="h-3.5 w-3.5" /> New Production Job</Link>
                </Button>
              </div>
            </ConsoleSection>

            <ConsoleSection title="Control Center Notes">
              <div className="space-y-1 text-[11px] text-muted-foreground"><p>Outlet signals use completed or reviewed records where applicable.</p><p>Low confidence means staff records are incomplete.</p><p>Planning values are references, not production orders.</p><p>AP summaries are read-only.</p></div>
            </ConsoleSection>

            <ConsoleSection title="Recent Activity">
              <div className="space-y-2">
                {summary.recentActivities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="text-[11px]">
                    <p className="line-clamp-1 font-medium">{activity.message}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(activity.created_at).toLocaleString("en-MY", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                ))}
                {!summary.recentActivities.length ? <p className="text-[11px] text-muted-foreground">No recent activity.</p> : null}
                <Button asChild variant="ghost" size="sm" className="h-6 w-full text-[11px]">
                  <Link href="/activity">Show more</Link>
                </Button>
              </div>
            </ConsoleSection>

            {payablesAttention ? <ConsoleSection title="Payables Attention">
              <div className="space-y-2 text-[11px]">
                <p><span className="text-muted-foreground">As of</span><br /><strong>{payablesAttention.report_date}</strong></p>
                <p className="flex justify-between gap-2"><span>Attention amount</span><strong>{formatCurrency(payablesAttention.total_attention_amount)}</strong></p>
                <p><span className="text-muted-foreground">Highest exposure</span><br /><strong>{payablesAttention.highest_exposure_supplier ?? "None"}</strong></p>
                <p><span className="text-muted-foreground">Oldest overdue</span><br /><strong>{payablesAttention.oldest_overdue_invoice ?? "None"}</strong></p>
                <Button asChild size="sm" className="w-full"><Link href="/supplier-invoices/aging">Open AP Aging</Link></Button>
                <Button asChild variant="outline" size="sm" className="w-full"><Link href="/supplier-invoices/cash-flow">Open Cash Flow Forecast</Link></Button>
                <p className="text-muted-foreground">Missing due dates rank first, followed by 91+ day critical balances, overdue invoices, due today, then due within seven days.</p>
              </div>
            </ConsoleSection> : null}
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-semibold leading-tight">Operations Dashboard</h1>
              <p className="text-xs text-muted-foreground">
                {now.toLocaleString("en-MY", { dateStyle: "full", timeStyle: "medium" })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {metrics.slice(0, 3).map((metric) => <MetricCard key={metric.label} {...metric} />)}
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <CompactPanel title="Today's Attention" action={{ href: "/documents?status=pending_approval", label: "Review" }}>
              {pendingActions.length ? (
                <div className="divide-y rounded-[2px] border bg-white">
                  {pendingActions.slice(0, 2).map((document) => (
                    <Link key={document.id} href={document.href ?? "/documents"} className="block px-2 py-1.5 text-[11px] hover:bg-[var(--sb-surface-muted)]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-mono text-[11px] font-semibold">{document.document_no}</p>
                        <span className="shrink-0 rounded-[2px] bg-[var(--sb-warning-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sb-warning)]">{document.step ?? "In Review"}</span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">{[document.branch_name, document.age_label].filter(Boolean).join(" - ")}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="No pending actions" description="Nothing needs your review right now." />
              )}
            </CompactPanel>

            <CompactPanel title="Procurement Queue" action={{ href: "/purchase-requests?priority=urgent", label: "View Queue" }}>
              {stuckRequests.length ? (
                <div className="divide-y rounded-[2px] border bg-white">
                  {stuckRequests.map((request) => (
                    <Link key={request.id} href={`/purchase-requests/${request.id}`} className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[11px] hover:bg-[var(--sb-surface-muted)]">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-[11px] font-semibold">{request.request_no}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{request.needed_by_date ? `Needed by ${request.needed_by_date}` : "Needed date not set"}</p>
                      </div>
                      <span className="shrink-0 rounded-[2px] bg-[var(--sb-danger-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sb-danger)]">{request.priority ?? "Urgent"}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Clock3} title="No stuck PRs" description="Urgent and critical PRs will appear here when they need attention." />
              )}
            </CompactPanel>

            <CompactPanel title="Today’s Operations" action={{ href: "/production/jobs", label: "Open" }}>
              <div className="grid gap-2">
                <MetricCard href="/production/jobs" label="Jobs Today" value={formatNumber(summary.today.production)} icon={Boxes} />
                <MetricCard href="/goods-receivings" label="Receiving Today" value={formatNumber(summary.today.goodsReceiving)} icon={PackageCheck} />
              </div>
            </CompactPanel>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <CompactPanel title="Outlet Record Health" action={{ href: "/outlet-daily-records", label: "Open records" }}>
              {operationsControl?.outlet ? <div className="grid gap-2 sm:grid-cols-3"><MetricCard href="/outlet-daily-records" label="Today" value={formatNumber(operationsControl.outlet.today_records)} icon={PackageCheck} /><MetricCard href="/outlet-daily-records?status=draft" label="Missing evening" value={formatNumber(operationsControl.outlet.missing_evening)} icon={Clock3} tone={operationsControl.outlet.missing_evening ? "amber" : "green"} /><MetricCard href="/outlet-daily-records?status=evening_completed" label="Needs review" value={formatNumber(operationsControl.outlet.needs_review)} icon={ClipboardCheck} tone={operationsControl.outlet.needs_review ? "amber" : "green"} /></div> : <p className="text-xs text-muted-foreground">Outlet record health is unavailable right now.</p>}
            </CompactPanel>

            <CompactPanel title="Demand Confidence" action={{ href: "/reports/demand-trends", label: "Open trends" }}>
              {operationsControl?.demand ? <div className="grid gap-2 sm:grid-cols-3"><MetricCard href="/reports/demand-trends" label="7-day coverage" value={`${formatNumber(operationsControl.demand.coverage.completed)} / ${formatNumber(operationsControl.demand.coverage.expected)}`} icon={CheckCircle2} tone={operationsControl.demand.coverage.confidence === "Low" ? "red" : operationsControl.demand.coverage.confidence === "Medium" ? "amber" : "green"} /><MetricCard href="/reports/demand-trends" label="Confidence" value={operationsControl.demand.coverage.confidence} icon={AlertTriangle} tone={operationsControl.demand.coverage.confidence === "Low" ? "red" : operationsControl.demand.coverage.confidence === "Medium" ? "amber" : "green"} /><MetricCard href="/reports/demand-trends" label="Incomplete" value={formatNumber(operationsControl.demand.coverage.incomplete)} icon={Clock3} tone={operationsControl.demand.coverage.incomplete ? "amber" : "green"} /></div> : <p className="text-xs text-muted-foreground">Demand confidence is unavailable right now.</p>}
            </CompactPanel>

            <CompactPanel title="Wastage and Variance" action={{ href: "/production/variance", label: "Open variance" }}>
              {operationsControl?.variance && operationsControl.demand ? <div className="space-y-2"><div className="grid gap-2 sm:grid-cols-3"><MetricCard href="/production/variance?signal=over_supplied" label="Over-supply" value={formatNumber(operationsControl.variance.over_supplied)} icon={AlertTriangle} tone={operationsControl.variance.over_supplied ? "amber" : "green"} /><MetricCard href="/production/variance?signal=under_supplied" label="Under-supply" value={formatNumber(operationsControl.variance.under_supplied)} icon={AlertTriangle} tone={operationsControl.variance.under_supplied ? "red" : "green"} /><MetricCard href="/production/variance" label="High wastage" value={formatNumber(operationsControl.variance.high_wastage)} icon={RotateCw} tone={operationsControl.variance.high_wastage ? "amber" : "green"} /></div><p className="text-[11px] text-muted-foreground">Top wastage: {operationsControl.demand.top_wastage_products.map((row) => row.name).join(", ") || "None"}</p></div> : <p className="text-xs text-muted-foreground">Variance signals are unavailable right now.</p>}
            </CompactPanel>

            <CompactPanel title="Production Planning Reference" action={{ href: "/production/planning", label: "Open planning" }}>
              {operationsControl?.planning ? <div className="grid gap-2 sm:grid-cols-3"><MetricCard href="/production/planning" label="High confidence" value={formatNumber(operationsControl.planning.high)} icon={CheckCircle2} tone="green" /><MetricCard href="/production/planning" label="Medium confidence" value={formatNumber(operationsControl.planning.medium)} icon={AlertTriangle} tone="amber" /><MetricCard href="/production/planning" label="Manual review" value={formatNumber(operationsControl.planning.manual)} icon={Clock3} tone={operationsControl.planning.manual ? "amber" : "green"} /></div> : <p className="text-xs text-muted-foreground">Planning reference is unavailable right now.</p>}
            </CompactPanel>
          </div>

          <CompactPanel title="Stock Exceptions" action={{ href: "/stock-balance?status=low_stock", label: "Open Stock" }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricCard href="/stock-balance?status=low_stock" label="Low Stock" value={formatNumber(summary.lowStockCount)} icon={AlertTriangle} tone={summary.lowStockCount ? "red" : "green"} />
              <MetricCard href="/goods-receivings" label="Not Invoiced" value={formatNumber(summary.financeForecast.receivingNotInvoiced)} icon={RotateCw} tone="amber" />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Finance and stock signals improve as PO, GRN, and supplier invoice data grows.</p>
          </CompactPanel>

          {summary.payablesAttentionUnavailable ? <CompactPanel title="Finance / Payables Attention" action={{ href: "/supplier-invoices/aging", label: "Retry AP Aging" }}><p className="text-xs text-muted-foreground">Payables attention is temporarily unavailable. The rest of the dashboard remains current.</p></CompactPanel> : null}

          {payablesAttention ? <CompactPanel title="Finance / Payables Attention" action={{ href: "/supplier-invoices/aging", label: "Open AP Aging" }}>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard href="/supplier-invoices/aging?bucket=overdue_90_plus" label={`Critical · ${payablesAttention.critical_count}`} value={formatCurrency(payablesAttention.critical_amount)} icon={AlertTriangle} tone={payablesAttention.critical_count ? "red" : "green"} />
              <MetricCard href="/supplier-invoices/aging?overdue=1" label={`Overdue · ${payablesAttention.overdue_count}`} value={formatCurrency(payablesAttention.overdue_amount)} icon={ReceiptText} tone={payablesAttention.overdue_count ? "red" : "green"} />
              <MetricCard href="/supplier-invoices/aging?bucket=due_today" label={`Due Today · ${payablesAttention.due_today_count}`} value={formatCurrency(payablesAttention.due_today_amount)} icon={Clock3} tone="amber" />
              <MetricCard href={`/supplier-invoices/aging?due_from=${shiftDate(payablesAttention.report_date, 1)}&due_to=${shiftDate(payablesAttention.report_date, 7)}`} label={`Due Next 7 · ${payablesAttention.due_next_7_count}`} value={formatCurrency(payablesAttention.due_next_7_amount)} icon={Clock3} tone="amber" />
              <MetricCard href="/supplier-invoices/aging?bucket=missing_due_date" label="Missing Due Date" value={formatNumber(payablesAttention.missing_due_date_count)} icon={AlertTriangle} tone={payablesAttention.missing_due_date_count ? "amber" : "green"} />
            </div>
            <div className="mt-2 divide-y border bg-white">
              {payablesAttention.rows.map((row) => <div key={row.id} className="flex items-center justify-between gap-3 px-2.5 py-2 text-[11px]">
                <Link href={`/supplier-invoices/${row.id}`} className="min-w-0 hover:underline"><span className="block truncate font-mono font-semibold">{row.invoice_no} · {row.alert_label}</span><span className="block truncate text-muted-foreground">{row.supplier_name} · {formatCurrency(row.outstanding)}</span></Link>
                <Link href={alertAgingHref(row, payablesAttention.report_date)} className="shrink-0 font-medium text-primary hover:underline">Aging</Link>
              </div>)}
              {!payablesAttention.rows.length ? <p className="p-3 text-xs text-muted-foreground">No supplier invoices need payment attention.</p> : null}
            </div>
          </CompactPanel> : null}
        </div>
      </WorkspaceGrid>
    </div>
  );
}
