"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Factory, FileText, PackageCheck, ReceiptText, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function Metric({ href, label, value, icon: Icon, alert = false }: { href: string; label: string; value: string | number; icon: LucideIcon; alert?: boolean }) {
  return <Link href={href} className="flex min-h-12 items-center justify-between gap-3 rounded-[2px] border border-[var(--sb-border-soft)] bg-white px-3 py-2 hover:border-[var(--sb-green-300)]"><span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] ${alert ? "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]"}`}><Icon className="h-4 w-4" /></span><span className="truncate">{label}</span></span><strong className="tabular-nums">{value}</strong></Link>;
}

function Panel({ title, empty, children, action }: { title: string; empty?: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return <section className="rounded-[2px] border border-[var(--sb-border-soft)] bg-card p-3"><div className="mb-2.5 flex items-center justify-between gap-2"><h2 className="text-xs font-semibold">{title}</h2>{action ? <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]"><Link href={action.href}>{action.label}</Link></Button> : null}</div>{children ?? <p className="text-xs text-muted-foreground">{empty}</p>}</section>;
}

function MobileQuickActions({ actions }: { actions: { href: string; label: string; icon: LucideIcon }[] }) {
  return (
    <section className="md:hidden" aria-labelledby="mobile-quick-actions-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="mobile-quick-actions-title" className="text-xs font-semibold">Quick actions</h2>
        <span className="text-[11px] text-[var(--sb-text-muted)]">Based on your role</span>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] overflow-hidden rounded-[var(--sb-radius-panel)] border border-[var(--sb-border-soft)] bg-white">
        {actions.slice(0, 3).map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href} className="flex min-h-[4.75rem] min-w-0 flex-col items-center justify-center gap-1.5 px-2 py-2 text-center text-[11px] font-semibold text-[var(--sb-green-950)] active:bg-[var(--sb-surface-muted)]">
              <span className="grid h-8 w-8 place-items-center rounded-[var(--sb-radius-control)] bg-[var(--sb-green-100)] text-[var(--sb-green-900)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="line-clamp-2 leading-4">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
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

  const quickActions = isOutlet
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
  const primaryAction = quickActions[0];

  const workspaceContext = <>
    <p className="text-xs text-[var(--sb-text-muted)]">Welcome, {summary.userName}</p>
    <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <span className="text-base font-semibold text-[var(--sb-text)] sm:text-lg">{summary.roleLabel}</span>
      <span aria-hidden="true" className="text-[var(--sb-text-muted)]">·</span>
      <span className="min-w-0 text-sm text-[var(--sb-text-muted)]">{summary.branchLabel}</span>
    </div>
  </>;

  const desktopWorkspaceContext = (
    <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-[var(--sb-text-muted)]">
      <span>Welcome, {summary.userName}</span>
      <span aria-hidden="true">·</span>
      <span>{summary.roleLabel}</span>
      <span aria-hidden="true">·</span>
      <span className="min-w-0 font-medium text-[var(--sb-text)]">{summary.branchLabel}</span>
    </p>
  );

  return <WorkspaceGrid hideMobileConsole className="gap-4 p-3 pb-24 sm:p-4 sm:pb-24 md:pb-4 xl:grid-cols-[minmax(0,1fr)_280px]" rightRailClassName="space-y-2" rightRail={<>
    <ConsoleSection title="Actions"><div className="grid gap-2">{quickActions.map((action, index) => <Button key={action.href} asChild size="sm" variant={index === 0 ? "default" : "outline"} className="w-full"><Link href={action.href}>{action.label}</Link></Button>)}</div></ConsoleSection>
    <ConsoleSection title="Today"><div className="space-y-2 text-[11px]"><p><span className="text-muted-foreground">Role</span><br /><strong>{summary.roleLabel}</strong></p><p><span className="text-muted-foreground">Data scope</span><br /><strong>{summary.scopeLabel}</strong></p><p><span className="text-muted-foreground">Updated</span><br /><strong>{now.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" })}</strong></p></div></ConsoleSection>
    {summary.notifications.length ? <ConsoleSection title="Alerts"><div className="space-y-2">{summary.notifications.slice(0, 3).map((note) => <Link key={note.id} href={note.action_url ?? "/activity"} className="block text-[11px] hover:underline"><strong className="block">{note.title}</strong><span className="text-muted-foreground">{note.message}</span></Link>)}</div></ConsoleSection> : null}
  </>}>
    <div className="space-y-4"><header className="hidden flex-col gap-3 md:flex md:flex-row md:items-start md:justify-between"><div className="min-w-0"><h1 className="text-lg font-semibold tracking-[-0.01em] text-[var(--sb-text)]">{copy.title}</h1><div className="mt-1">{desktopWorkspaceContext}</div><p className="mt-2 text-xs text-muted-foreground">{copy.description}</p></div><Button asChild size="sm" className="hidden w-full shrink-0 sm:inline-flex sm:w-auto xl:hidden"><Link href={primaryAction.href}>{primaryAction.label}</Link></Button></header>

      <div className="border-b border-[var(--sb-border-soft)] pb-3 md:hidden">
        {workspaceContext}
      </div>

      <MobileQuickActions actions={quickActions} />

      {isOutlet ? <Panel title="Today’s completion"><div className="flex items-center gap-3 rounded-[2px] border bg-white p-3">{outletComplete ? <CheckCircle2 className="h-5 w-5 text-[var(--sb-success)]" /> : <Clock3 className="h-5 w-5 text-[var(--sb-warning)]" />}<div><p className="text-sm font-semibold">{outletComplete ? "Today’s record is complete" : outletStatus ? "Evening update is still required" : "Morning receive has not started"}</p><p className="text-xs text-muted-foreground">Only your assigned outlet’s record is shown.</p></div></div></Panel> : null}

      {!isOutlet ? <div className="grid gap-4 lg:grid-cols-2"><Panel title={isKitchen ? "Purchase request progress" : "Actions awaiting you"} empty={isKitchen ? "No active purchase requests need your attention." : "No reviews or transitions require your action."} action={{ href: "/purchase-requests", label: "Open PRs" }}>{summary.pendingApprovals.length ? <div className="divide-y rounded-[2px] border bg-white">{summary.pendingApprovals.map((row) => <Link key={row.id} href={row.href} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[var(--sb-surface-muted)]"><span className="min-w-0"><strong className="block truncate font-mono">{row.document_no}</strong><span className="text-muted-foreground">{row.step}{row.branch_name ? ` · ${row.branch_name}` : ""}</span></span><span className="shrink-0 text-[11px] text-muted-foreground">{row.age_label}</span></Link>)}</div> : undefined}</Panel>
      <Panel title={isPurchasing ? "Purchasing pipeline" : isKitchen ? "Production and receiving" : "Operational pipeline"}><div className="grid gap-2 sm:grid-cols-2"><Metric href="/purchase-orders" label={isPurchasing ? "PO preparation / sending" : "Recent purchase orders"} value={summary.purchaseOrders.length} icon={ShoppingCart} /><Metric href={isKitchen ? "/goods-receivings?date=today" : "/goods-receivings"} label={isKitchen ? "Receiving today" : "Receiving follow-up"} value={isKitchen ? summary.today.goodsReceiving : summary.financeForecast.receivingNotInvoiced} icon={PackageCheck} alert={(isKitchen ? summary.today.goodsReceiving : summary.financeForecast.receivingNotInvoiced) > 0} />{summary.productionSummary ? <Metric href="/production/jobs" label={isKitchen ? "Production pending" : "Production exceptions"} value={summary.productionSummary.pendingApproval + summary.productionSummary.ingredientShortages} icon={Factory} alert={summary.productionSummary.ingredientShortages > 0} /> : null}{isPurchasing ? <Metric href="/administration/master-data-cleanup" label="Master-data follow-up" value="Review" icon={Boxes} /> : null}</div></Panel></div> : null}

      {(showOperations || isKitchen || isPurchasing) ? <Panel title={isKitchen ? "Raw-material exceptions" : "Exceptions requiring follow-up"} empty="No urgent operational exceptions are visible in your scope." action={{ href: "/low-stock", label: "Open stock" }}><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Metric href="/low-stock" label="Low stock" value={summary.lowStockCount} icon={AlertTriangle} alert={summary.lowStockCount > 0} />{showOperations && summary.operationsControl?.outlet ? <Metric href="/outlet-daily-records?status=draft" label="Outlet completion issues" value={summary.operationsControl.outlet.missing_evening + summary.operationsControl.outlet.needs_review} icon={ClipboardCheck} alert /> : null}{(isOwner || isManager || isKitchen) ? <Metric href="/stock-wastage?status=submitted" label="Wastage attention" value={summary.wastageAttention} icon={AlertTriangle} alert={summary.wastageAttention > 0} /> : <Metric href="/purchase-requests?priority=urgent" label="Urgent requests" value={summary.urgentRequests.length} icon={Clock3} alert={summary.urgentRequests.length > 0} />}</div></Panel> : null}

      {showFinance ? <Panel title="Payables and cash obligations" empty={summary.payablesAttentionUnavailable ? "Payables attention is temporarily unavailable; operational queues remain current." : "All current supplier invoices are up to date."} action={{ href: "/supplier-invoices/aging", label: "Open AP Aging" }}>{summary.payablesAttention ? <><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Metric href="/supplier-invoices/aging?overdue=1" label="Overdue AP" value={formatCurrency(summary.payablesAttention.overdue_amount + summary.payablesAttention.critical_amount)} icon={ReceiptText} alert={summary.payablesAttention.overdue_count + summary.payablesAttention.critical_count > 0} /><Metric href="/supplier-invoices/aging?bucket=missing_due_date" label="Missing due date" value={formatNumber(summary.payablesAttention.missing_due_date_count)} icon={AlertTriangle} alert={summary.payablesAttention.missing_due_date_count > 0} /><Metric href="/supplier-invoices/cash-flow" label="Due soon" value={formatCurrency(summary.payablesAttention.due_today_amount + summary.payablesAttention.due_next_7_amount)} icon={Clock3} /></div><div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/supplier-invoices">Review Invoice</Link></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices/cash-flow">View Cash Flow</Link></Button></div></> : undefined}</Panel> : null}
    </div>
  </WorkspaceGrid>;
}
