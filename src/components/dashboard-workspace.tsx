"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Factory, FileText, PackageCheck, ReceiptText, ShoppingCart } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function Metric({ href, label, value, icon: Icon, alert = false }: { href: string; label: string; value: string | number; icon: LucideIcon; alert?: boolean }) {
  return <Link href={href} className="flex min-h-[var(--sb-control-height)] items-center justify-between gap-3 px-1 py-2 hover:bg-[var(--sb-surface-muted)]"><span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"><span className={`flex h-7 w-7 shrink-0 items-center justify-center border ${alert ? "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "border-[var(--sb-border-soft)] bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]"}`}><Icon className="h-4 w-4" /></span><span className="truncate">{label}</span></span><strong className="tabular-nums">{value}</strong></Link>;
}

function Panel({ title, empty, children, action }: { title: string; empty?: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return <section className="sb-dashboard-panel"><div className="mb-4 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold tracking-[-0.01em]">{title}</h2>{action ? <Button asChild variant="ghost" size="sm" className="px-2 text-[11px]"><Link href={action.href}>{action.label}</Link></Button> : null}</div>{children ?? <p className="text-xs text-muted-foreground">{empty}</p>}</section>;
}

function DashboardKpis({ summary, showFinance }: { summary: DashboardSummary; showFinance: boolean }) {
  const metrics = [
    { href: "/purchase-requests", label: "Waiting for review", value: summary.pendingApprovals.length, icon: ClipboardList, alert: summary.pendingApprovals.length > 0, note: summary.pendingApprovals.length ? "Needs your attention" : "Queue is clear" },
    { href: "/low-stock", label: "Stock attention", value: summary.lowStockCount, icon: AlertTriangle, alert: summary.lowStockCount > 0, note: summary.lowStockCount ? "Items below threshold" : "No low-stock items" },
    showFinance
      ? { href: "/supplier-invoices/aging", label: "Payables due", value: formatCurrency(summary.payablesAttention ? summary.payablesAttention.overdue_amount + summary.payablesAttention.critical_amount : 0), icon: ReceiptText, alert: Boolean(summary.payablesAttention?.overdue_count || summary.payablesAttention?.critical_count), note: "Overdue and critical" }
      : { href: "/purchase-requests?priority=urgent", label: "Urgent requests", value: summary.urgentRequests.length, icon: Clock3, alert: summary.urgentRequests.length > 0, note: summary.urgentRequests.length ? "Priority queue" : "No urgent requests" },
    { href: "/goods-receivings", label: "Receiving follow-up", value: summary.financeForecast.receivingNotInvoiced, icon: PackageCheck, alert: summary.financeForecast.receivingNotInvoiced > 0, note: summary.financeForecast.receivingNotInvoiced ? "Not invoiced yet" : "All caught up" },
  ];

  return <section aria-labelledby="today-at-a-glance-title"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-green-700)]">Today at a glance</p><h2 id="today-at-a-glance-title" className="mt-1 text-xl font-semibold tracking-[-0.025em]">Your operating picture</h2></div><span className="hidden text-[11px] text-[var(--sb-text-muted)] sm:block">Select a metric to open its queue</span></div><div className="sb-dashboard-kpi-grid">{metrics.map(({ href, label, value, icon: Icon, alert, note }) => <Link key={href} href={href} className="sb-dashboard-kpi"><div className="flex items-start justify-between gap-3"><span className={`grid h-8 w-8 place-items-center border ${alert ? "border-[var(--sb-danger)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : "border-[var(--sb-border-soft)] bg-[var(--sb-green-100)] text-[var(--sb-green-900)]"}`}><Icon className="h-4 w-4" aria-hidden="true" /></span><span className="text-[11px] font-medium text-[var(--sb-text-muted)]">Open queue <span aria-hidden="true">↗</span></span></div><p className="mt-4 text-xs font-medium text-[var(--sb-text-muted)]">{label}</p><strong className="mt-1 block text-xl font-semibold tracking-[-0.03em] tabular-nums">{value}</strong><p className={`mt-2 text-xs font-medium ${alert ? "text-[var(--sb-danger)]" : "text-[var(--sb-success)]"}`}>{note}</p></Link>)}</div></section>;
}

function QueueVisuals({ summary, showFinance }: { summary: DashboardSummary; showFinance: boolean }) {
  const items = [
    { label: "Review", value: summary.pendingApprovals.length, href: "/purchase-requests", color: "#0B4A35" },
    { label: "Stock", value: summary.lowStockCount, href: "/low-stock", color: "#B42318" },
    showFinance
      ? { label: "Overdue", value: (summary.payablesAttention?.overdue_count ?? 0) + (summary.payablesAttention?.critical_count ?? 0), href: "/supplier-invoices/aging", color: "#8A948E" }
      : { label: "Urgent", value: summary.urgentRequests.length, href: "/purchase-requests?priority=urgent", color: "#8A948E" },
    { label: "Receiving", value: summary.financeForecast.receivingNotInvoiced, href: "/goods-receivings", color: "#A9C7B9" },
  ];
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const max = Math.max(...items.map((item) => item.value), 1);

  return <section className="sb-dashboard-visuals" aria-labelledby="queue-visuals-title">
    <div className="flex items-start justify-between gap-3"><div><p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-green-700)]">Signals</p><h2 id="queue-visuals-title" className="mt-1 text-lg font-semibold tracking-[-0.02em]">Where work is accumulating</h2></div><span className="text-[11px] text-[var(--sb-text-muted)]">Live queue mix</span></div>
    <div className="sb-dashboard-visual-grid">
      <div className="sb-dashboard-chart-block"><div className="sb-dashboard-donut"><svg viewBox="0 0 120 120" role="img" aria-label={`Queue mix with ${total} open items`}><circle cx="60" cy="60" r={radius} fill="none" stroke="var(--sb-surface-muted)" strokeWidth="14" />{total ? items.map((item) => { const segment = (item.value / total) * circumference; const currentOffset = offset; offset += segment; return <circle key={item.label} cx="60" cy="60" r={radius} fill="none" stroke={item.color} strokeWidth="14" strokeDasharray={`${segment} ${circumference - segment}`} strokeDashoffset={-currentOffset} transform="rotate(-90 60 60)" />; }) : null}</svg><div className="sb-dashboard-donut__label"><strong>{total}</strong><span>open items</span></div></div><div className="sb-dashboard-legend">{items.map((item) => <Link key={item.label} href={item.href} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 shrink-0" style={{ backgroundColor: item.color }} />{item.label}</span><strong className="tabular-nums">{item.value}</strong></Link>)}</div></div>
      <div className="sb-dashboard-bars"><p className="mb-3 text-xs font-semibold text-[var(--sb-text-muted)]">Queue volume</p>{items.map((item) => <Link key={item.label} href={item.href} className="block"><div className="mb-1 flex items-center justify-between gap-2 text-xs"><span>{item.label}</span><strong className="tabular-nums">{item.value}</strong></div><div className="h-2 bg-[var(--sb-surface-muted)]"><span className="block h-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: item.color }} /></div></Link>)}</div>
    </div>
  </section>;
}

const roleCopy: Record<string, { title: string; description: string }> = {
  super_admin: { title: "Owner Workdesk", description: "Company-wide approvals, operational exceptions, and near-term obligations." },
  finance: { title: "Finance Workdesk", description: "Company-wide finance reviews, payables, and operational follow-up." },
  manager: { title: "Manager Workdesk", description: "Company-wide operational reviews, completion queues, and stock exceptions." },
  purchasing: { title: "Purchasing Workdesk", description: "Company-wide purchasing actions, supplier follow-up, and document readiness." },
  kitchen: { title: "Kitchen Workdesk", description: "Central Kitchen requests, expected receiving, raw-material stock, and production tasks." },
  outlet_staff: { title: "Outlet Today", description: "Complete today’s receiving, wastage, and remaining-stock record." },
};

export function DashboardWorkspace({ summary, renderedAt }: { summary: DashboardSummary; renderedAt: string }) {
  const [now, setNow] = useState(() => new Date(renderedAt));
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 60_000); return () => window.clearInterval(timer); }, []);
  const role = summary.role;
  const copy = roleCopy[role] ?? roleCopy.outlet_staff;
  const isOwner = role === "super_admin";
  const isFinance = role === "finance";
  const isManager = role === "manager";
  const isPurchasing = role === "purchasing";
  const isKitchen = role === "kitchen";
  const isOutlet = role === "outlet_staff";
  const showFinance = isOwner || isFinance;
  const showOperations = isOwner || isFinance || isManager;
  const outletStatus = summary.outletToday?.status ?? null;
  const outletComplete = outletStatus === "reviewed" || outletStatus === "evening_completed";
  const outletAction = !outletStatus ? "Start daily record" : outletComplete ? "Review today’s record" : "Complete daily record";

  const actions = isOutlet
    ? [
        { href: summary.outletToday?.id ? `/outlet-daily-records/${summary.outletToday.id}` : "/outlet-daily-records/new", label: outletAction, icon: ClipboardCheck },
        { href: "/outlet-daily-records", label: "Daily records", icon: ClipboardList },
        { href: "/activity", label: "Recent activity", icon: Clock3 },
      ]
    : isKitchen
      ? [
          { href: "/purchase-requests/new", label: "Create request", icon: FileText },
          { href: "/production/jobs/new", label: "New production job", icon: Factory },
          { href: "/goods-receivings", label: "Receive goods", icon: PackageCheck },
        ]
      : isPurchasing
        ? [
            { href: "/purchase-requests?status=admin_review", label: "Review PRs", icon: FileText },
            { href: "/purchase-orders", label: "Prepare PO", icon: ShoppingCart },
            { href: "/goods-receivings", label: "Receive goods", icon: PackageCheck },
          ]
        : isFinance
          ? [
              { href: "/purchase-requests?status=finance_review", label: "Review PRs", icon: FileText },
              { href: "/supplier-invoices", label: "Review invoices", icon: ReceiptText },
              { href: "/stock-balance", label: "Check stock", icon: Boxes },
            ]
          : isManager
            ? [
                { href: "/purchase-requests?status=manager_review", label: "Review PRs", icon: FileText },
                { href: "/goods-receivings", label: "Check receiving", icon: PackageCheck },
                { href: "/stock-counts", label: "Stock count", icon: CheckCircle2 },
              ]
            : [
                { href: "/purchase-requests", label: "Approval pipeline", icon: FileText },
                { href: "/supplier-invoices/aging", label: "AP aging", icon: ReceiptText },
                { href: "/stock-counts", label: "Stock count", icon: CheckCircle2 },
              ];
  const workspaceContext = <>
    <p className="text-xs text-[var(--sb-text-muted)]">Welcome, {summary.userName}</p>
    <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-base font-semibold text-[var(--sb-text)] sm:text-lg">{summary.roleLabel}</span>
      <span aria-hidden="true" className="text-[var(--sb-text-muted)]">|</span>
      <span className="min-w-0 text-sm text-[var(--sb-text-muted)]">{summary.branchLabel}</span>
    </div>
  </>;

  const desktopWorkspaceContext = (
    <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-[var(--sb-text-muted)]">
      <span>Welcome, {summary.userName}</span>
      <span aria-hidden="true">|</span>
      <span>{summary.roleLabel}</span>
      <span aria-hidden="true">|</span>
      <span className="min-w-0 font-medium text-[var(--sb-text)]">{summary.branchLabel}</span>
    </p>
  );

  return <WorkspaceGrid className="gap-4 p-3 pb-24 sm:p-4 sm:pb-24 xl:pb-4 xl:grid-cols-[minmax(0,1fr)_280px]" rightRailClassName="space-y-2" rightRail={<>
    <ConsoleSection title="Actions"><div className="grid gap-2 rounded-[var(--sb-panel-radius)]">{actions.slice(0, 3).map((action, index) => <Button key={action.href} asChild size="sm" variant={index === 0 ? "default" : "outline"} className="w-full rounded-[var(--sb-radius-control)]"><Link href={action.href} data-mobile-primary-action={index === 0 ? true : undefined}>{action.label}</Link></Button>)}</div></ConsoleSection>
    <ConsoleSection title="Today"><div className="space-y-2 text-[11px]"><p><span className="text-muted-foreground">Role</span><br /><strong>{summary.roleLabel}</strong></p><p><span className="text-muted-foreground">Data scope</span><br /><strong>{summary.scopeLabel}</strong></p><p><span className="text-muted-foreground">Updated</span><br /><strong>{now.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" })}</strong></p></div></ConsoleSection>
    {summary.notifications.length ? <ConsoleSection title="Alerts"><div className="space-y-2">{summary.notifications.slice(0, 3).map((note) => <Link key={note.id} href={note.action_url ?? "/activity"} className="block text-[11px] hover:underline"><strong className="block">{note.title}</strong><span className="text-muted-foreground">{note.message}</span></Link>)}</div></ConsoleSection> : null}
  </>}>
    <div className="sb-dashboard-content space-y-6"><header className="hidden flex-col gap-3 md:flex md:flex-row md:items-start md:justify-between"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--sb-text)]">{copy.title}</h1><div className="mt-1">{desktopWorkspaceContext}</div><p className="mt-2 max-w-xl text-sm text-muted-foreground">{copy.description}</p></div></header>

      <div className="border-b border-[var(--sb-border-soft)] pb-3 md:hidden">
        {workspaceContext}
      </div>

      <DashboardKpis summary={summary} showFinance={showFinance} />
      <QueueVisuals summary={summary} showFinance={showFinance} />

      {isOutlet ? <Panel title="Today’s completion"><div className="flex items-center gap-3 border bg-white p-3">{outletComplete ? <CheckCircle2 className="h-5 w-5 text-[var(--sb-success)]" /> : <Clock3 className="h-5 w-5 text-[var(--sb-warning)]" />}<div><p className="text-sm font-semibold">{outletComplete ? "Today’s record is complete" : outletStatus ? "Evening update is still required" : "Morning receive has not started"}</p><p className="text-xs text-muted-foreground">Only your assigned outlet’s record is shown.</p></div></div></Panel> : null}

      {!isOutlet ? <div className="grid gap-4 lg:grid-cols-2"><Panel title={isKitchen ? "Purchase request progress" : "Actions awaiting you"} empty={isKitchen ? "No active purchase requests need your attention." : "No reviews or transitions require your action."} action={{ href: "/purchase-requests", label: "Open PRs" }}>{summary.pendingApprovals.length ? <div className="divide-y border bg-white">{summary.pendingApprovals.map((row) => <Link key={row.id} href={row.href} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[var(--sb-surface-muted)]"><span className="min-w-0"><strong className="block truncate font-mono">{row.document_no}</strong><span className="text-muted-foreground">{row.step}{row.branch_name ? ` · ${row.branch_name}` : ""}</span></span><span className="shrink-0 text-[11px] text-muted-foreground">{row.age_label}</span></Link>)}</div> : undefined}</Panel>
      <Panel title={isPurchasing ? "Purchasing pipeline" : isKitchen ? "Production and receiving" : "Operational pipeline"}><div className="grid gap-2 sm:grid-cols-2"><Metric href="/purchase-orders" label={isPurchasing ? "PO preparation / sending" : "Recent purchase orders"} value={summary.purchaseOrders.length} icon={ShoppingCart} /><Metric href={isKitchen ? "/goods-receivings?date=today" : "/goods-receivings"} label={isKitchen ? "Receiving today" : "Receiving follow-up"} value={isKitchen ? summary.today.goodsReceiving : summary.financeForecast.receivingNotInvoiced} icon={PackageCheck} alert={(isKitchen ? summary.today.goodsReceiving : summary.financeForecast.receivingNotInvoiced) > 0} />{summary.productionSummary ? <Metric href="/production/jobs" label={isKitchen ? "Production pending" : "Production exceptions"} value={summary.productionSummary.pendingApproval + summary.productionSummary.ingredientShortages} icon={Factory} alert={summary.productionSummary.ingredientShortages > 0} /> : null}{isPurchasing ? <Metric href="/administration/master-data-cleanup" label="Master-data follow-up" value="Review" icon={Boxes} /> : null}</div></Panel></div> : null}

      {(showOperations || isKitchen || isPurchasing) ? <Panel title={isKitchen ? "Raw-material exceptions" : "Exceptions requiring follow-up"} empty="No urgent operational exceptions are visible in your scope." action={{ href: "/low-stock", label: "Open stock" }}><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Metric href="/low-stock" label="Low stock" value={summary.lowStockCount} icon={AlertTriangle} alert={summary.lowStockCount > 0} />{showOperations && summary.operationsControl?.outlet ? <Metric href="/outlet-daily-records?status=draft" label="Outlet completion issues" value={summary.operationsControl.outlet.missing_evening + summary.operationsControl.outlet.needs_review} icon={ClipboardCheck} alert /> : null}{(isOwner || isManager || isKitchen) ? <Metric href="/stock-wastage?status=submitted" label="Wastage attention" value={summary.wastageAttention} icon={AlertTriangle} alert={summary.wastageAttention > 0} /> : <Metric href="/purchase-requests?priority=urgent" label="Urgent requests" value={summary.urgentRequests.length} icon={Clock3} alert={summary.urgentRequests.length > 0} />}</div></Panel> : null}

      {showFinance ? <Panel title="Payables and cash obligations" empty={summary.payablesAttentionUnavailable ? "Payables attention is temporarily unavailable; operational queues remain current." : "All current supplier invoices are up to date."} action={{ href: "/supplier-invoices/aging", label: "Open AP Aging" }}>{summary.payablesAttention ? <><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Metric href="/supplier-invoices/aging?overdue=1" label="Overdue AP" value={formatCurrency(summary.payablesAttention.overdue_amount + summary.payablesAttention.critical_amount)} icon={ReceiptText} alert={summary.payablesAttention.overdue_count + summary.payablesAttention.critical_count > 0} /><Metric href="/supplier-invoices/aging?bucket=missing_due_date" label="Missing due date" value={formatNumber(summary.payablesAttention.missing_due_date_count)} icon={AlertTriangle} alert={summary.payablesAttention.missing_due_date_count > 0} /><Metric href="/supplier-invoices/cash-flow" label="Due soon" value={formatCurrency(summary.payablesAttention.due_today_amount + summary.payablesAttention.due_next_7_amount)} icon={Clock3} /></div><div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/supplier-invoices">Review Invoice</Link></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices/cash-flow">View Cash Flow</Link></Button></div></> : undefined}</Panel> : null}
    </div>
  </WorkspaceGrid>;
}
