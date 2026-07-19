"use client";

import Link from "next/link";
import { AlertTriangle, Boxes, CheckCircle2, ClipboardCheck, Clock3, Factory, PackageCheck, ReceiptText, ShoppingCart } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function Metric({ href, label, value, icon: Icon, alert = false }: { href: string; label: string; value: string | number; icon: LucideIcon; alert?: boolean }) {
  return <Link href={href} className="flex min-h-12 items-center justify-between gap-3 rounded-[2px] border border-[var(--sb-border-soft)] bg-white px-3 py-2 hover:border-[var(--sb-amber-300)]"><span className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] ${alert ? "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]"}`}><Icon className="h-4 w-4" /></span><span className="truncate">{label}</span></span><strong className="tabular-nums">{value}</strong></Link>;
}

function Panel({ title, empty, children, action }: { title: string; empty?: string; children?: React.ReactNode; action?: { href: string; label: string } }) {
  return <section className="rounded-[2px] border border-[var(--sb-border-soft)] bg-card p-3"><div className="mb-2.5 flex items-center justify-between gap-2"><h2 className="text-xs font-semibold">{title}</h2>{action ? <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-[11px]"><Link href={action.href}>{action.label}</Link></Button> : null}</div>{children ?? <p className="text-xs text-muted-foreground">{empty}</p>}</section>;
}

const roleCopy: Record<string, { title: string; description: string }> = {
  super_admin: { title: "Owner Workdesk", description: "Company-wide approvals, operational exceptions, and near-term obligations." },
  finance: { title: "Finance Workdesk", description: "Company-wide finance reviews, payables, and operational follow-up." },
  manager: { title: "Manager Workdesk", description: "Assigned-branch reviews, receiving, production, and stock exceptions." },
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
    ? [{ href: summary.outletToday?.id ? `/outlet-daily-records/${summary.outletToday.id}` : "/outlet-daily-records/new", label: outletAction }]
    : isKitchen
      ? [{ href: "/purchase-requests/new", label: "Create Purchase Request" }, { href: "/production/jobs/new", label: "New Production Job" }]
      : isPurchasing
        ? [{ href: "/purchase-requests?status=admin_review", label: "Review approved PRs" }, { href: "/purchase-orders", label: "Prepare or send PO" }]
        : isFinance
          ? [{ href: "/purchase-requests?status=finance_review", label: "Review Purchase Requests" }, { href: "/supplier-invoices", label: "Review Invoices" }]
          : isManager
            ? [{ href: "/purchase-requests?status=manager_review", label: "Review Purchase Requests" }, { href: "/goods-receivings", label: "Check Receiving" }]
            : [{ href: "/purchase-requests", label: "Open approval pipeline" }, { href: "/supplier-invoices/aging", label: "Open AP Aging" }];

  return <WorkspaceGrid className="gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_280px]" rightRailClassName="space-y-2" rightRail={<>
    <ConsoleSection title={isOutlet ? "Next Task" : "Direct Actions"}><div className="grid gap-2">{quickActions.map((action, index) => <Button key={action.href} asChild size="sm" variant={index ? "outline" : "default"} data-mobile-primary-action={index === 0 ? true : undefined} className="min-h-10 justify-start whitespace-normal text-left text-xs"><Link href={action.href}>{action.label}</Link></Button>)}</div></ConsoleSection>
    <ConsoleSection title="Today"><div className="space-y-2 text-[11px]"><p><span className="text-muted-foreground">Role</span><br /><strong>{summary.roleLabel}</strong></p><p><span className="text-muted-foreground">Data scope</span><br /><strong>{summary.scopeLabel}</strong></p><p><span className="text-muted-foreground">Updated</span><br /><strong>{now.toLocaleString("en-MY", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kuala_Lumpur" })}</strong></p></div></ConsoleSection>
    {summary.notifications.length ? <ConsoleSection title="Alerts"><div className="space-y-2">{summary.notifications.slice(0, 3).map((note) => <p key={note.id} className="text-[11px]"><strong className="block">{note.title}</strong><span className="text-muted-foreground">{note.message}</span></p>)}</div></ConsoleSection> : null}
  </>}>
    <div className="space-y-4"><header><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-semibold">{copy.title}</h1><span className="rounded-[2px] bg-[var(--sb-neutral-bg)] px-2 py-1 text-[10px] font-medium text-muted-foreground">{summary.scopeLabel}</span></div><p className="mt-1 text-xs text-muted-foreground">{copy.description}</p></header>

      {isOutlet ? <Panel title="Today’s completion"><div className="space-y-3"><div className="flex items-center gap-3 rounded-[2px] border bg-white p-3">{outletComplete ? <CheckCircle2 className="h-5 w-5 text-[var(--sb-success)]" /> : <Clock3 className="h-5 w-5 text-[var(--sb-warning)]" />}<div><p className="text-sm font-semibold">{outletComplete ? "Today’s record is complete" : outletStatus ? "Evening update is still required" : "Morning receive has not started"}</p><p className="text-xs text-muted-foreground">Only your assigned outlet’s record is shown.</p></div></div><Button asChild className="min-h-11 w-full sm:w-auto"><Link href={summary.outletToday?.id ? `/outlet-daily-records/${summary.outletToday.id}` : "/outlet-daily-records/new"}>{outletAction}</Link></Button></div></Panel> : null}

      {!isOutlet ? <div className="grid gap-4 lg:grid-cols-2"><Panel title={isKitchen ? "Purchase request progress" : "Actions awaiting you"} empty={isKitchen ? "No active purchase requests need your attention." : "No reviews or transitions require your action."} action={{ href: "/purchase-requests", label: "Open PRs" }}>{summary.pendingApprovals.length ? <div className="divide-y rounded-[2px] border bg-white">{summary.pendingApprovals.map((row) => <Link key={row.id} href={row.href} className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[var(--sb-surface-muted)]"><span className="min-w-0"><strong className="block truncate font-mono">{row.document_no}</strong><span className="text-muted-foreground">{row.step}{row.branch_name ? ` · ${row.branch_name}` : ""}</span></span><span className="shrink-0 text-[11px] text-muted-foreground">{row.age_label}</span></Link>)}</div> : undefined}</Panel>
      <Panel title={isPurchasing ? "Purchasing pipeline" : isKitchen ? "Production and receiving" : "Operational pipeline"}><div className="grid gap-2 sm:grid-cols-2"><Metric href="/purchase-orders" label={isPurchasing ? "PO preparation / sending" : "Recent purchase orders"} value={summary.purchaseOrders.length} icon={ShoppingCart} /><Metric href="/goods-receivings" label="Receiving follow-up" value={summary.financeForecast.receivingNotInvoiced} icon={PackageCheck} alert={summary.financeForecast.receivingNotInvoiced > 0} />{summary.productionSummary ? <Metric href="/production/jobs" label={isKitchen ? "Production pending" : "Production exceptions"} value={summary.productionSummary.pendingApproval + summary.productionSummary.ingredientShortages} icon={Factory} alert={summary.productionSummary.ingredientShortages > 0} /> : null}{isPurchasing ? <Metric href="/suppliers" label="Supplier / item readiness" value={summary.totalSuppliers + summary.totalItems} icon={Boxes} /> : null}</div></Panel></div> : null}

      {(showOperations || isKitchen || isPurchasing) ? <Panel title={isKitchen ? "Raw-material exceptions" : "Exceptions requiring follow-up"} empty="No urgent operational exceptions are visible in your scope." action={{ href: "/stock-balance?status=low_stock", label: "Open stock" }}><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Metric href="/stock-balance?status=low_stock" label="Low stock" value={summary.lowStockCount} icon={AlertTriangle} alert={summary.lowStockCount > 0} />{showOperations && summary.operationsControl?.outlet ? <Metric href="/outlet-daily-records?status=draft" label="Outlet completion issues" value={summary.operationsControl.outlet.missing_evening + summary.operationsControl.outlet.needs_review} icon={ClipboardCheck} alert /> : null}<Metric href="/purchase-requests?priority=urgent" label="Urgent requests" value={summary.urgentRequests.length} icon={Clock3} alert={summary.urgentRequests.length > 0} /></div></Panel> : null}

      {showFinance ? <Panel title="Payables and cash obligations" empty={summary.payablesAttentionUnavailable ? "Payables attention is temporarily unavailable; operational queues remain current." : "All current supplier invoices are up to date."} action={{ href: "/supplier-invoices/aging", label: "Open AP Aging" }}>{summary.payablesAttention ? <><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"><Metric href="/supplier-invoices/aging?overdue=1" label="Overdue AP" value={formatCurrency(summary.payablesAttention.overdue_amount + summary.payablesAttention.critical_amount)} icon={ReceiptText} alert={summary.payablesAttention.overdue_count + summary.payablesAttention.critical_count > 0} /><Metric href="/supplier-invoices/aging?bucket=missing_due_date" label="Missing due date" value={formatNumber(summary.payablesAttention.missing_due_date_count)} icon={AlertTriangle} alert={summary.payablesAttention.missing_due_date_count > 0} /><Metric href="/supplier-invoices/cash-flow" label="Due soon" value={formatCurrency(summary.payablesAttention.due_today_amount + summary.payablesAttention.due_next_7_amount)} icon={Clock3} /></div><div className="mt-3 flex flex-wrap gap-2"><Button asChild size="sm"><Link href="/supplier-invoices">Review Invoice</Link></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices/cash-flow">View Cash Flow</Link></Button></div></> : undefined}</Panel> : null}
    </div>
  </WorkspaceGrid>;
}
