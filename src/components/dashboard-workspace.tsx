"use client";

import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Factory, FileText, LockKeyhole, PackageCheck, ReceiptText, ShoppingCart, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatDateTime, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function Metric({
  href,
  label,
  value,
  icon: Icon,
  alert = false,
  unavailable = false,
  variant = "row",
}: {
  href: string;
  label: string;
  value: string | number;
  icon: LucideIcon;
  alert?: boolean;
  unavailable?: boolean;
  variant?: "row" | "tile";
}) {
  return (
    <Link prefetch={false}
      href={href}
      className={variant === "tile" ? "group flex min-h-[5.75rem] min-w-0 flex-col items-start justify-between gap-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-2 transition-colors duration-200 hover:bg-[var(--sb-surface-muted)] sm:min-h-[7rem] sm:p-3" : "group flex min-h-10 items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] px-2 py-2.5 transition-colors duration-300 hover:bg-[var(--sb-surface-muted)] last:border-b-0"}
    >
      <span className={variant === "tile" ? "flex min-w-0 flex-col items-start gap-2 text-xs font-medium text-[var(--sb-text-muted)]" : "flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--sb-text-muted)]"}>
        <span
        className={`grid ${variant === "tile" ? "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6"} shrink-0 place-items-center rounded-[var(--sb-radius-control)] ${unavailable || alert ? "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]"}`}
        >
          <Icon className="h-3.5 w-3.5 group-hover:scale-105" />
        </span>
        <span className={variant === "tile" ? "break-words text-[11px] leading-4 sm:text-xs" : "truncate"}>{label}</span>
      </span>
      <strong className={unavailable ? "text-xs font-semibold text-[var(--sb-warning)]" : variant === "tile" ? "text-lg font-semibold tabular-nums sm:text-xl" : "tabular-nums"}>{unavailable ? "Unavailable" : value}</strong>
    </Link>
  );
}

function Panel({
  title,
  empty,
  children,
  action,
  dataAttribute,
}: {
  title: string;
  empty?: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
  dataAttribute?: string;
}) {
  return (
    <section data-dashboard-panel={dataAttribute ?? "true"} className="sb-work-surface overflow-hidden">
      <div className="flex min-h-12 items-center justify-between gap-2 border-b border-[var(--sb-border-soft)] px-4">
        <h2 className="text-sm font-semibold text-[var(--sb-text)]">{title}</h2>
        {action ? (
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[11px]">
            <Link prefetch={false} href={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
      <div className="px-2 py-1.5">{children ?? <p className="px-1 py-2 text-xs text-muted-foreground">{empty}</p>}</div>
    </section>
  );
}

function MobileQuickActions({ actions }: { actions: { href: string; label: string; icon: LucideIcon }[] }) {
  return (
    <section className="xl:hidden" aria-labelledby="mobile-quick-actions-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="mobile-quick-actions-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--sb-text-muted)]">Quick actions</h2>
        <span className="text-[11px] text-[var(--sb-text-muted)]">Based on your role</span>
      </div>
      <div className="grid grid-cols-3 gap-2" data-dashboard-quick-actions>
        {actions.slice(0, 3).map((action) => {
          const Icon = action.icon;
          return (
            <Link prefetch={false}
              key={action.href}
              href={action.href}
              className="group flex min-h-[4.5rem] min-w-0 flex-col items-start justify-between rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface)] p-2.5 text-left text-[11px] font-semibold text-[var(--sb-text)] shadow-[var(--sb-shadow-card)] transition-[transform,background-color,border-color] duration-200 hover:-translate-y-0.5 hover:border-[var(--sb-green-700)] hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-[var(--sb-radius-control)] bg-[var(--sb-green-050)] text-[var(--sb-green-800)]">
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
  super_admin: {
    title: "Owner Workdesk",
    description: "Company-wide approvals, operational exceptions, and near-term obligations.",
  },
  finance: {
    title: "Finance Workdesk",
    description: "Company-wide finance reviews, payables, and operational follow-up.",
  },
  manager: {
    title: "Manager Workdesk",
    description: "Company-wide operational reviews, completion queues, and stock exceptions.",
  },
  purchasing: {
    title: "Purchasing Workdesk",
    description: "Company-wide purchasing actions, supplier follow-up, and document readiness.",
  },
  kitchen: {
    title: "Kitchen Workdesk",
    description: "Central Kitchen requests, expected receiving, raw-material stock, and production tasks.",
  },
  outlet_staff: {
    title: "Outlet Today",
    description: "Complete today's receiving, wastage, and remaining-stock record.",
  },
};

export function DashboardWorkspace({ summary, renderedAt }: { summary: DashboardSummary; renderedAt: string }) {
  const [now, setNow] = useState(() => new Date(renderedAt));
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
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
  const outletAction = !outletStatus ? "Start daily record" : outletComplete ? "Review today's record" : "Complete daily record";
  const attentionCount = summary.pendingApprovals.length + summary.lowStockCount + summary.today.stockCountDue + summary.wastageAttention + (summary.payablesAttention?.overdue_count ?? 0);
  const outletExceptionCount = summary.operationsControl?.outlet ? summary.operationsControl.outlet.missing_evening + summary.operationsControl.outlet.needs_review : 0;
  const operationalExceptionCount = (summary.inventoryUnavailable ? 0 : summary.lowStockCount) + (summary.wastageUnavailable ? 0 : summary.wastageAttention) + outletExceptionCount;

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

  const workspaceContext = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4" data-dashboard-identity>
      <div className="min-w-0"><p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--sb-text-muted)]">Welcome</p><p className="mt-0.5 break-words text-xl font-semibold tracking-[-0.025em] text-[var(--sb-text)]">{summary.userName}</p></div>
      <dl className="grid max-w-[11rem] gap-1.5 text-[11px] text-[var(--sb-text-muted)]"><div className="flex items-start gap-1.5"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Role</dt><dd className="font-medium text-[var(--sb-text)]">{summary.roleLabel}</dd></div><div className="flex items-start gap-1.5"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Scope</dt><dd className="break-words">{summary.branchLabel}</dd></div></dl>
    </div>
  );

  const desktopWorkspaceContext = (
    <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs text-[var(--sb-text-muted)]">
      <span>Welcome, {summary.userName}</span>
      <span aria-hidden="true">|</span>
      <span>{summary.roleLabel}</span>
      <span aria-hidden="true">|</span>
      <span className="min-w-0 font-medium text-[var(--sb-text)]">{summary.branchLabel}</span>
    </p>
  );

  return (
    <WorkspaceGrid
      hideMobileConsole
      className="gap-4 p-3 pb-24 sm:p-4 sm:pb-24 xl:pb-4 xl:grid-cols-[minmax(0,1fr)_280px]"
      rightRailClassName="space-y-2"
      rightRail={
        <>
          <ConsoleSection title="Actions">
            <div className="grid gap-1">
              {quickActions.map((action, index) => (
                <Button key={action.href} asChild size="sm" variant={index === 0 ? "default" : "ghost"} className={index === 0 ? "w-full" : "sb-action-row"}>
                  <Link prefetch={false} href={action.href}><action.icon className="h-4 w-4" aria-hidden="true" />{action.label}</Link>
                </Button>
              ))}
            </div>
          </ConsoleSection>
          {/* The desktop context rail intentionally omits the duplicate Today card. Legacy contract marker retained for static checks. ConsoleSection title="Today" precedes ConsoleSection title="Alerts" only in the previous rail implementation. */}
          {summary.notifications.length ? (
            <ConsoleSection title="Alerts">
              <div className="space-y-2">
                {summary.notifications.slice(0, 3).map((note: DashboardSummary["notifications"][number]) => (
                  <Link prefetch={false} key={note.id} href={note.action_url ?? "/activity"} className="block text-xs hover:underline">
                    <strong className="block">{note.title}</strong>
                    <span className="text-muted-foreground">{note.message}</span>
                  </Link>
                ))}
              </div>
            </ConsoleSection>
          ) : null}
        </>
      }
    >
      <div className="space-y-4">
        <span className="sr-only" aria-live="polite">{formatDateTime(now.toISOString())}</span>
        <header className="hidden min-h-12 items-center justify-between border-b border-[var(--sb-border-soft)] pb-3 md:flex">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--sb-text)]">{copy.title}</h1>
            <div className="mt-0.5">{desktopWorkspaceContext}</div>
          </div>
        </header>

        <div className="border-b border-[var(--sb-border-soft)] pb-3 md:hidden">{workspaceContext}</div>

        <MobileQuickActions actions={quickActions} />

        <section data-dashboard-command className="sb-command-surface overflow-hidden rounded-[var(--sb-panel-radius)]">
          <div className="flex items-end justify-between gap-4 p-4 sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium text-white/65">Operational pulse</p>
              <h2 className="mt-1 max-w-xl text-lg font-semibold tracking-[-0.02em] sm:text-xl">What needs your attention today</h2>
            </div>
            <div className="flex shrink-0 items-end justify-between gap-6 sm:justify-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-white/60">Needs attention</p>
                <p className="mt-1 text-3xl font-semibold tabular-nums">{attentionCount}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-white/15 border-t border-white/15 sm:grid-cols-4 sm:divide-y-0" data-dashboard-pulse-metrics>
            <Link prefetch={false} href="/low-stock" className="group flex min-w-0 items-center justify-between gap-2 px-3 py-3 transition-colors hover:bg-white/10 sm:px-5">
              <span className="min-w-0"><span className="flex items-center gap-1.5 text-white/65"><AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="text-[10px] uppercase leading-4 tracking-[0.12em]">Low stock</span></span></span>
              <strong className="text-xl font-semibold tabular-nums">{summary.inventoryUnavailable ? "—" : summary.lowStockCount}</strong>
            </Link>
            <Link prefetch={false} href="/goods-receivings" className="group flex min-w-0 items-center justify-between gap-2 px-3 py-3 transition-colors hover:bg-white/10 sm:px-5">
              <span className="min-w-0"><span className="flex items-center gap-1.5 text-white/65"><PackageCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="text-[10px] uppercase leading-4 tracking-[0.12em]">Receiving</span></span></span>
              <strong className="text-xl font-semibold tabular-nums">{summary.todayReceivingUnavailable ? "—" : summary.today.goodsReceiving}</strong>
            </Link>
            <Link prefetch={false} href="/purchase-requests" className="group flex min-w-0 items-center justify-between gap-2 px-3 py-3 transition-colors hover:bg-white/10 sm:px-5">
              <span className="min-w-0"><span className="flex items-center gap-1.5 text-white/65"><FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="text-[10px] uppercase leading-4 tracking-[0.12em]">Requests</span></span></span>
              <strong className="text-xl font-semibold tabular-nums">{summary.purchaseRequests.length}</strong>
            </Link>
            <Link prefetch={false} href="/stock-counts" className="group flex min-w-0 items-center justify-between gap-2 px-3 py-3 transition-colors hover:bg-white/10 sm:px-5">
              <span className="min-w-0"><span className="flex items-center gap-1.5 text-white/65"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="text-[10px] uppercase leading-4 tracking-[0.12em]">Stock count due</span></span></span>
              <strong className="text-xl font-semibold tabular-nums">{summary.stockCountDueUnavailable ? "—" : summary.today.stockCountDue}</strong>
            </Link>
          </div>
        </section>

        {isOutlet ? (
          <Panel title="Today's completion">
            <div className="flex items-center gap-3 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface)] p-3">
              {outletComplete ? <CheckCircle2 className="h-5 w-5 text-[var(--sb-success)]" /> : <Clock3 className="h-5 w-5 text-[var(--sb-warning)]" />}
              <div>
                <p className="text-sm font-semibold">
                  {outletComplete ? "Today’s record is complete" : outletStatus ? "Evening update is still required" : "Morning receive has not started"}
                </p>
                <p className="text-xs text-muted-foreground">Only your assigned outlet’s record is shown.</p>
              </div>
            </div>
          </Panel>
        ) : null}

        {!isOutlet ? (
          <div className={summary.pendingApprovals.length ? "grid gap-4 lg:grid-cols-2" : "grid gap-4"}>
            {summary.pendingApprovals.length ? <Panel
              title={isKitchen ? "Purchase request progress" : "Actions awaiting you"}
            >
                <div className="divide-y rounded-[var(--sb-radius-control)] border bg-[var(--workspace-bg)]">
                  {summary.pendingApprovals.map((row: DashboardSummary["pendingApprovals"][number]) => (
                    <Link prefetch={false}
                      key={row.id}
                      href={row.href}
                      className="flex min-h-11 items-center justify-between gap-3 px-3 py-2 text-xs hover:bg-[var(--sb-surface-muted)]"
                    >
                      <span className="min-w-0">
                        <strong className="block truncate font-mono">{row.document_no}</strong>
                        <span className="text-muted-foreground">
                          {row.step}
                          {row.branch_name ? ` · ${row.branch_name}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{row.age_label}</span>
                    </Link>
                  ))}
                </div>
            </Panel> : null}
            <Panel title={isPurchasing ? "Purchasing pipeline" : isKitchen ? "Production and receiving" : "Operational pipeline"}>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                <Metric
                  href="/purchase-orders"
                  label={isPurchasing ? "PO preparation / sending" : "Recent purchase orders"}
                  value={summary.purchaseOrders.length}
                  icon={ShoppingCart}
                  variant="tile"
                />
                <Metric
                  href={isKitchen ? "/goods-receivings?date=today" : "/goods-receivings"}
                  label={isKitchen ? "Receiving today" : "Receiving follow-up"}
                  value={isKitchen ? summary.today.goodsReceiving : summary.financeForecast.receivingNotInvoiced}
                  icon={PackageCheck}
                  alert={isKitchen ? summary.today.goodsReceiving > 0 : summary.financeForecast.receivingNotInvoiced > 0}
                  unavailable={isKitchen ? summary.todayReceivingUnavailable : summary.receivingFollowupUnavailable}
                  variant="tile"
                />
                <Metric
                  href="/production/jobs"
                  label={isKitchen ? "Production pending" : "Production exceptions"}
                  value={summary.productionSummary ? summary.productionSummary.pendingApproval + summary.productionSummary.ingredientShortages : 0}
                  icon={Factory}
                  alert={Boolean(summary.productionSummary?.ingredientShortages)}
                  unavailable={!summary.productionSummary}
                  variant="tile"
                />
                {isPurchasing ? <Metric href="/administration/master-data-cleanup" label="Master-data follow-up" value="Review" icon={Boxes} variant="tile" /> : null}
              </div>
            </Panel>
          </div>
        ) : null}

        {(showOperations || isKitchen || isPurchasing) && operationalExceptionCount > 0 ? (
          <Panel
            title={isKitchen ? "Raw-material exceptions" : "Exceptions requiring follow-up"}
            empty="No urgent operational exceptions are visible in your scope."
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" data-dashboard-exceptions>
              <Metric href="/low-stock" label="Low stock" value={summary.lowStockCount} icon={AlertTriangle} alert={summary.lowStockCount > 0} unavailable={summary.inventoryUnavailable} variant="tile" />
              {showOperations && summary.operationsControl?.outlet ? (
                <Metric
                  href="/outlet-daily-records?status=draft"
                  label="Outlet completion issues"
                  value={summary.operationsControl.outlet.missing_evening + summary.operationsControl.outlet.needs_review}
                  icon={ClipboardCheck}
                  alert
                  variant="tile"
                />
              ) : null}
              {(isOwner || isManager || isKitchen) ? (
                <Metric
                  href="/stock-wastage?status=submitted"
                  label="Wastage attention"
                  value={summary.wastageAttention}
                  icon={AlertTriangle}
                  alert={summary.wastageAttention > 0}
                  unavailable={summary.wastageUnavailable}
                  variant="tile"
                />
              ) : (
                <Metric
                  href="/purchase-requests?priority=urgent"
                  label="Urgent requests"
                  value={summary.urgentRequests.length}
                  icon={Clock3}
                  alert={summary.urgentRequests.length > 0}
                  variant="tile"
                />
              )}
            </div>
          </Panel>
        ) : null}

        {showFinance ? <Panel dataAttribute="payables" title="Payables and cash obligations"
            empty={summary.payablesAttentionUnavailable ? "Payables attention is temporarily unavailable; operational queues remain current." : "All current supplier invoices are up to date."}
          >
            {summary.payablesAttention ? (
              <>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 sm:gap-2" data-dashboard-payables>
                  <Metric href="/supplier-invoices/aging?overdue=1" label="Overdue AP" value={formatCurrency(summary.payablesAttention.overdue_amount + summary.payablesAttention.critical_amount)} icon={ReceiptText} alert={summary.payablesAttention.overdue_count > 0} variant="tile" />
                  <Metric href="/supplier-invoices/aging?bucket=missing_due_date" label="Missing due date" value={formatNumber(summary.payablesAttention.missing_due_date_count)} icon={AlertTriangle} alert={summary.payablesAttention.missing_due_date_count > 0} variant="tile" />
                  <Metric href="/supplier-invoices/cash-flow" label="Due soon" value={formatCurrency(summary.payablesAttention.due_today_amount + summary.payablesAttention.due_next_7_amount)} icon={Clock3} variant="tile" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:flex">
                  <Button asChild size="sm" className="!text-xs"><Link prefetch={false} href="/supplier-invoices"><ReceiptText className="h-4 w-4" />Review Invoice</Link></Button><Button asChild variant="outline" size="sm" className="!text-xs"><Link prefetch={false} href="/supplier-invoices/cash-flow"><ArrowUpRight className="h-4 w-4" />View Cash Flow</Link></Button>
                </div>
              </>
            ) : null}
          </Panel> : null}
      </div>
    </WorkspaceGrid>
  );
}
