import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Boxes, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Factory, FileText, LockKeyhole, PackageCheck, ReceiptText, ShieldCheck, ShoppingCart, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

type DashboardSummary = Awaited<ReturnType<typeof import("@/server/queries/dashboard").getDashboardSummary>>;

function Metric({
  href,
  label,
  value,
  icon: Icon,
  alert = false,
  alertTone = "warning",
  unavailable = false,
  variant = "row",
  density = "default",
  className,
}: {
  href: string;
  label: string;
  value: string | number | null;
  icon: LucideIcon;
  alert?: boolean;
  alertTone?: "warning" | "critical";
  unavailable?: boolean;
  variant?: "row" | "tile";
  density?: "default" | "compact";
  className?: string;
}) {
  return (
    <Link prefetch={false}
      href={href}
      className={`${variant === "tile" ? density === "compact" ? "group grid min-h-[4.25rem] min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-2 gap-y-1 bg-[var(--sb-surface)] px-2 py-2.5 transition-colors duration-200 hover:bg-[var(--sb-surface-muted)] sm:min-h-[4.75rem] sm:px-3" : "group grid min-h-[5.25rem] min-w-0 grid-cols-[auto_minmax(0,1fr)] grid-rows-[auto_auto] items-center gap-x-2 gap-y-1.5 bg-[var(--sb-surface)] px-3 py-3 transition-colors duration-200 hover:bg-[var(--sb-surface-muted)]" : "group flex min-h-10 items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] px-2 py-2.5 transition-colors duration-300 hover:bg-[var(--sb-surface-muted)] last:border-b-0"} ${className ?? ""}`}
    >
      <span className={variant === "tile" ? "contents" : "flex min-w-0 items-center gap-2 text-xs font-medium text-[var(--sb-text-muted)]"}>
        <span
        className={`grid ${variant === "tile" ? density === "compact" ? "h-6 w-6 sm:h-7 sm:w-7" : "h-7 w-7 sm:h-8 sm:w-8" : "h-6 w-6"} shrink-0 place-items-center rounded-[var(--sb-radius-control)] ${unavailable ? "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : alert && alertTone === "critical" ? "bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]" : alert ? "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]"}`}
        >
          <Icon className="h-3.5 w-3.5 group-hover:scale-105" />
        </span>
        <span className={variant === "tile" ? "col-span-2 row-start-2 min-w-0 text-xs font-medium leading-4 text-[var(--sb-text-muted)]" : "truncate"}>{label}</span>
      </span>
      <strong
        className={unavailable ? "col-start-2 row-start-1 justify-self-end text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-warning)]" : variant === "tile" ? density === "compact" ? "col-start-2 row-start-1 min-w-0 justify-self-end whitespace-nowrap text-lg font-semibold tabular-nums sm:text-xl" : "col-start-2 row-start-1 justify-self-end text-xl font-semibold tabular-nums sm:text-2xl" : "tabular-nums"}
        aria-label={unavailable ? `${label} is temporarily unavailable` : undefined}
        title={unavailable ? `${label} is temporarily unavailable` : undefined}
      >
        {unavailable ? "Unavailable" : value}
      </strong>
    </Link>
  );
}

function Panel({
  title,
  empty,
  children,
  action,
  dataAttribute,
  tone = "default",
}: {
  title: string;
  empty?: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
  dataAttribute?: string;
  tone?: "default" | "danger";
}) {
  return (
    <section data-dashboard-panel={dataAttribute ?? "true"} className={cn("sb-work-surface overflow-hidden", tone === "danger" && "border-rose-200 bg-rose-50")}>
      <div className={cn("flex min-h-10 items-center justify-between gap-2 border-b border-[var(--sb-border-soft)] px-3", tone === "danger" ? "bg-rose-100" : "bg-[var(--sb-green-050)]")}>
        <h2 className="text-sm font-semibold text-[var(--sb-text)]">{title}</h2>
        {action ? (
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-[11px]">
            <Link prefetch={false} href={action.href}>{action.label}</Link>
          </Button>
        ) : null}
      </div>
      <div data-dashboard-panel-body>{children ?? <p className="px-3 py-3 text-xs text-muted-foreground">{empty}</p>}</div>
    </section>
  );
}

function QuickActionsCluster({ actions, className }: { actions: { href: string; label: string; icon: LucideIcon }[]; className?: string }) {
  return (
    <section className={className} aria-labelledby="dashboard-quick-actions-title">
      <div className="mb-2 flex items-center justify-between">
        <h2 id="dashboard-quick-actions-title" className="text-xs font-semibold text-[var(--sb-text-muted)]">Quick actions</h2>
      </div>
      <div className="grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface)]" data-dashboard-quick-actions>
        {actions.slice(0, 3).map((action) => {
          const Icon = action.icon;
          return (
            <Link prefetch={false}
              key={action.href}
              href={action.href}
              className="group flex min-h-14 min-w-0 items-center gap-2 p-2.5 text-left text-[11px] font-semibold text-[var(--sb-text)] transition-colors duration-200 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]"
            >
              <span className="grid h-7 w-7 place-items-center rounded-[var(--sb-radius-control)] bg-[var(--sb-green-050)] text-[var(--sb-green-800)]">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="line-clamp-2 min-w-0 leading-4">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function DashboardWorkspace({ summary }: { summary: DashboardSummary }) {
  const role = summary.role;
  const isOwner = role === "super_admin";
  const isFinance = role === "finance";
  const isManager = role === "manager";
  const isPurchasing = role === "purchasing";
  const isKitchen = role === "kitchen";
  const isOutlet = role === "outlet_staff" || role === "outlet_supervisor";
  const showFinance = isOwner || isFinance;
  const showOperations = isOwner || isFinance || isManager;
  const outletStatus = summary.outletToday?.status ?? null;
  const outletPosted = outletStatus === "reviewed";
  const outletReady = outletStatus === "evening_completed";
  const outletAction = !outletStatus
    ? "Start daily record"
    : outletPosted
      ? "View posted record"
      : outletReady
        ? "Edit ready record"
        : "Complete daily record";
  const attentionSourceLabels = {
    pending_approvals: "pending approvals",
    low_stock: "low stock",
    stock_count_due: "stock count",
    wastage: "wastage",
    overdue_payables: "payables",
  } as const;
  const unavailableAttentionLabels = summary.attentionSummary.unavailableSources.map((source) => attentionSourceLabels[source]);
  const pendingApprovalsHref = isFinance ? "/purchase-requests?status=finance_review" : isManager ? "/purchase-requests?status=manager_review" : isPurchasing ? "/purchase-requests?status=admin_review" : "/purchase-requests";
  const attentionSignals = [
    ...((isOwner || isFinance || isManager || isPurchasing || isKitchen) ? [{ key: "low_stock", label: "Low stock", value: summary.inventoryUnavailable ? null : summary.lowStockCount, href: "/low-stock", icon: AlertTriangle }] : []),
    { key: "pending_approvals", label: "Pending approvals", value: summary.attentionSummary.sources.pending_approvals, href: pendingApprovalsHref, icon: ClipboardCheck },
    { key: "stock_count_due", label: "Stock count due", value: summary.attentionSummary.sources.stock_count_due, href: "/stock-counts", icon: CheckCircle2 },
    ...(showFinance ? [{ key: "overdue_payables", label: "Overdue payables", value: summary.attentionSummary.sources.overdue_payables, href: "/supplier-invoices/aging?overdue=1", icon: ReceiptText }] : []),
  ];
  const todayWorkCount = attentionSignals.reduce((sum, signal) => sum + (signal.value ?? 0), 0);
  const outletExceptionCount = summary.operationsControl?.outlet?.missing_evening ?? 0;
  const operationalExceptionCount = (summary.wastageUnavailable ? 0 : summary.wastageAttention ?? 0) + outletExceptionCount + (summary.compliance?.issues ?? 0);
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

  const desktopActionRail = (
    <ConsoleSection title="Actions" kind="action">
      <div className="grid gap-2" data-dashboard-actions>
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return <Button key={action.href} asChild size="sm" variant={index === 0 ? "default" : "outline"} className="w-full justify-start gap-2">
            <Link prefetch={false} href={action.href}><Icon className="h-4 w-4" aria-hidden="true" />{action.label}</Link>
          </Button>;
        })}
      </div>
    </ConsoleSection>
  );

  const workspaceContext = (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4" data-dashboard-identity>
      <span className="sr-only">Welcome, {summary.userName} <span>|</span> {summary.roleLabel} <span>|</span> {summary.branchLabel}</span>
      <div className="min-w-0"><p className="text-[11px] font-medium text-[var(--sb-text-muted)]">Welcome</p><p data-dashboard-user-name className="mt-0.5 break-words text-xl font-semibold tracking-[-0.025em] text-[var(--sb-text)]">{summary.userName}</p></div>
      <dl className="grid max-w-[11rem] gap-1.5 text-[11px] text-[var(--sb-text-muted)]"><div className="flex items-start gap-1.5"><UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Role</dt><dd data-dashboard-role-label className="font-medium text-[var(--sb-text)]">{summary.roleLabel}</dd></div><div className="flex items-start gap-1.5"><LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" /><dt className="sr-only">Scope</dt><dd data-dashboard-scope-label className="break-words">{summary.branchLabel}</dd></div></dl>
    </div>
  );

  const desktopWorkspaceContext = (
    <dl className="flex min-w-0 max-w-[28rem] flex-wrap justify-end gap-x-4 gap-y-1.5 text-xs text-[var(--sb-text-muted)]">
      <div className="flex min-w-0 items-center gap-1.5">
        <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <dt className="sr-only">Role</dt>
        <dd data-dashboard-role-label className="truncate font-medium text-[var(--sb-text)]">{summary.roleLabel}</dd>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <dt className="sr-only">Scope</dt>
        <dd data-dashboard-scope-label className="truncate">{summary.branchLabel}</dd>
      </div>
    </dl>
  );

  return (
    <WorkspaceGrid
      hideMobileConsole
      tabletRailMode="context"
      rightRail={desktopActionRail}
      className="gap-4 p-3 pb-32 sm:p-4 sm:pb-24 xl:pb-4"
    >
      <div className="space-y-4">
        <header className="hidden min-h-12 w-full items-center justify-between gap-6 border-b border-[var(--sb-border-soft)] pb-3 md:flex">
          <div className="min-w-0" data-dashboard-identity>
              <span className="sr-only">Welcome, {summary.userName} <span>|</span> {summary.roleLabel} <span>|</span> {summary.branchLabel}</span>
              <p className="text-[11px] font-medium text-[var(--sb-text-muted)]">Welcome</p>
              <h1 data-dashboard-user-name className="mt-0.5 truncate text-xl font-semibold tracking-[-0.025em] text-[var(--sb-text)]">{summary.userName}</h1>
          </div>
          <div className="min-w-0">{desktopWorkspaceContext}</div>
        </header>

        <div className="border-b border-[var(--sb-border-soft)] pb-3 md:hidden">{workspaceContext}</div>

        {isOutlet ? (
          <div data-dashboard-layout className="grid w-full gap-4 xl:grid-cols-2 xl:items-start">
            <Panel title="Upcoming shifts" action={{ href: "/attendance", label: "View schedule" }}>
              <div className="divide-y divide-[var(--sb-border-soft)]">
                {summary.upcomingShifts.map((shift) => { const template=shift.shift_templates as {planned_start?:string;planned_end?:string;code?:string}|null; const start=template?.planned_start??shift.custom_start; const end=template?.planned_end??shift.custom_end; return <Link key={`${shift.work_date}-${shift.assignment_kind}`} href="/attendance" className="flex items-center justify-between gap-3 px-3 py-3 text-xs hover:bg-[var(--sb-surface-muted)]"><span><strong className="block text-sm">{shift.work_date}</strong><span className="mt-0.5 block text-muted-foreground">{template?.code??shift.assignment_kind.toUpperCase()}</span></span>{shift.assignment_kind==="shift"?<span className="font-semibold tabular-nums">{start?.slice(0,5)??"—"}–{end?.slice(0,5)??"—"}</span>:<StatusBadge status={shift.assignment_kind}/>}</Link> })}
                {!summary.upcomingShifts.length?<p className="px-3 py-4 text-xs text-muted-foreground">No published shift is available for the next seven days.</p>:null}
              </div>
            </Panel>
            <Panel title="Today's completion" dataAttribute="today">
              <Link
                prefetch={false}
                href={summary.outletToday?.id ? `/outlet-daily-records/${summary.outletToday.id}` : "/outlet-daily-records/new"}
                className="flex min-h-28 items-center gap-4 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface)] p-4 transition-colors hover:bg-[var(--sb-surface-muted)]"
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-[var(--sb-radius-control)] ${outletPosted ? "bg-[var(--sb-success-bg)] text-[var(--sb-success)]" : "bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]"}`}>
                  {outletPosted ? <CheckCircle2 className="h-5 w-5" /> : <Clock3 className="h-5 w-5" />}
                </span>
                <span className="min-w-0">
                  <strong className="block text-base font-semibold text-[var(--sb-text)]">
                    {outletPosted ? "Today’s record is posted" : outletReady ? "Today’s record is ready to post" : outletStatus ? "Evening update is still required" : "Morning receive has not started"}
                  </strong>
                  <span className="mt-1 block text-xs text-muted-foreground">{outletAction} for {summary.branchLabel}.</span>
                </span>
                <ArrowUpRight className="ml-auto h-4 w-4 shrink-0 text-[var(--sb-text-muted)]" aria-hidden="true" />
              </Link>
            </Panel>
            <QuickActionsCluster actions={quickActions} className="hidden xl:block" />
          </div>
        ) : (
        <div data-dashboard-layout className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-6">
        <section data-dashboard-command className="sb-work-surface overflow-hidden">
          <div className="flex items-start justify-between gap-4 px-3 py-3" data-dashboard-attention-summary>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Today&apos;s work</p>
              <h2
                data-dashboard-attention-value
                className="mt-0.5 max-w-xl text-base font-semibold leading-5 tracking-[-0.015em] sm:text-lg sm:leading-6"
                aria-label={summary.attentionSummary.state === "unavailable" ? `Work summary unavailable because ${unavailableAttentionLabels.join(", ")} data could not be loaded` : `${todayWorkCount} actions waiting`}
              >
                {summary.attentionSummary.state === "unavailable" ? "Some work queues are unavailable" : todayWorkCount > 0 ? <><span className="tabular-nums">{todayWorkCount}</span> actions waiting</> : "No work waiting"}
              </h2>
              {summary.attentionSummary.state === "unavailable" ? <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Unavailable: {unavailableAttentionLabels.join(", ")}</p> : null}
            </div>
          </div>
          <div className={`grid grid-cols-2 divide-x divide-y divide-[var(--sb-border-soft)] border-t border-[var(--sb-border-soft)] ${attentionSignals.length === 4 ? "sm:grid-cols-4" : attentionSignals.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`} data-dashboard-pulse-metrics aria-label="Today work breakdown">
            {attentionSignals.map((signal, index) => {
              const Icon = signal.icon;
              const unavailable = signal.value === null;
              const isLastOddPhoneSignal = attentionSignals.length % 2 === 1 && index === attentionSignals.length - 1;
              return <Link key={signal.key} prefetch={false} href={signal.href} className={`group flex min-h-12 min-w-0 items-center gap-2 px-3 py-2 transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${isLastOddPhoneSignal ? "col-span-2 sm:col-span-1" : ""}`}>
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[11px] font-medium leading-4 text-muted-foreground">{signal.label}</span>
                <strong className={unavailable ? "shrink-0 text-[10px] font-semibold text-muted-foreground" : "shrink-0 text-lg font-semibold tabular-nums"}>{unavailable ? "Unavailable" : signal.value}</strong>
              </Link>;
            })}
          </div>
        </section>

        <QuickActionsCluster actions={quickActions} className="hidden lg:block xl:hidden" />

        <Panel title={isKitchen ? "Purchase request progress" : "Actions awaiting you"} tone={summary.pendingApprovals.length ? "danger" : "default"}>
          {summary.pendingApprovals.length ? (
            <div className="divide-y divide-[var(--sb-border-soft)]">
              {summary.pendingApprovals.map((row: DashboardSummary["pendingApprovals"][number]) => {
                const isScheduleAction = row.id.startsWith("schedule-");
                const isOutletDailyAction = row.id.startsWith("outlet-daily-");
                return <Link prefetch={false}
                  key={row.id}
                  href={row.href}
                  className="grid min-h-14 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-2.5 text-xs hover:bg-[var(--sb-surface-muted)]"
                >
                  <strong className="min-w-0 truncate font-mono">{isOutletDailyAction ? `Outlet Daily · ${row.document_no}` : row.document_no}</strong>
                  <StatusBadge status={row.step.toLowerCase().replaceAll(" ", "_")} className="shrink-0" />
                  <span className="col-span-2 flex min-w-0 items-center gap-2 text-[11px] text-muted-foreground"><span className="shrink-0">{row.branch_name ?? "Unassigned"}</span><span>·</span><span className="shrink-0">{row.age_label}</span><span>·</span><span className="truncate">{isOutletDailyAction ? "Outlet Daily" : isScheduleAction ? "Schedule" : row.submitted_by_name ?? "—"}</span></span>
                  {isScheduleAction
                    ? <span className="col-span-2 text-[11px] font-medium text-[var(--sb-warning)]">Review and publish this outlet roster</span>
                    : isOutletDailyAction
                      ? <span className="col-span-2 text-[11px] font-medium text-[var(--sb-green-800)]">Review outlet quantities and post to lock editing</span>
                      : <span className="col-span-2 flex min-w-0 items-center justify-between gap-3 text-[11px] text-muted-foreground"><span className="truncate" title={row.supplier_names.join(", ")}>{row.supplier_names.join(", ") || "Supplier pending"}</span><span className="shrink-0 tabular-nums">{row.line_count} items · <strong className="font-medium text-foreground">{formatCurrency(row.estimated_total)}</strong></span></span>}
                </Link>
              })}
            </div>
          ) : (
            <p className="px-1 py-2 text-xs text-muted-foreground">You’re clear—no approvals or workflow actions are waiting in your current scope.</p>
          )}
        </Panel>
          </div>

          <div className="flex flex-col gap-4 lg:col-span-6" data-dashboard-secondary-column>
        {!isOutlet ? (
          <div className="order-2 space-y-4" data-dashboard-activity-group>
            <Panel title={isPurchasing ? "Purchasing pipeline" : isKitchen ? "Production and receiving" : "Operational pipeline"}>
              <div data-dashboard-pipeline className="grid grid-cols-2 gap-px bg-[var(--sb-border-soft)]">
                <Metric
                  href="/purchase-orders"
                  label={isPurchasing ? "PO preparation / sending" : "Recent purchase orders"}
                  value={summary.purchaseOrders.length}
                  icon={ShoppingCart}
                  unavailable={summary.coreSnapshotUnavailable}
                  variant="tile"
                  density="compact"
                />
                <Metric
                  href={isKitchen ? "/goods-receivings?date=today" : "/goods-receivings"}
                  label={isKitchen ? "Receiving today" : "Receiving follow-up"}
                  value={isKitchen ? summary.today.goodsReceiving : summary.financeForecast.receivingNotInvoiced}
                  icon={PackageCheck}
                  alert={isKitchen ? (summary.today.goodsReceiving ?? 0) > 0 : (summary.financeForecast.receivingNotInvoiced ?? 0) > 0}
                  unavailable={isKitchen ? summary.todayReceivingUnavailable : summary.receivingFollowupUnavailable}
                  variant="tile"
                  density="compact"
                />
                <Metric
                  href="/production/jobs"
                  label={isKitchen ? "Production pending" : "Production exceptions"}
                  value={summary.productionSummary ? summary.productionSummary.pendingApproval + summary.productionSummary.ingredientShortages : 0}
                  icon={Factory}
                  alert={Boolean(summary.productionSummary?.ingredientShortages)}
                  unavailable={!summary.productionSummary}
                  variant="tile"
                  density="compact"
                />
                {summary.compliance ? <Metric
                  href="/outlet-compliance"
                  label="Compliance issues"
                  value={summary.compliance.issues}
                  icon={ShieldCheck}
                  alert={(summary.compliance.issues ?? 0) > 0}
                  unavailable={summary.compliance.unavailable || summary.compliance.issues === null}
                  variant="tile"
                  density="compact"
                /> : null}
              </div>
            </Panel>
          </div>
        ) : null}

        {(showOperations || isKitchen || isPurchasing) && operationalExceptionCount > 0 ? <div className="order-1" data-dashboard-priority-group="exceptions">
          <Panel
            title={isKitchen ? "Raw-material exceptions" : "Exceptions requiring follow-up"}
            empty="No urgent operational exceptions are visible in your scope."
          >
            <div className="grid grid-cols-2 gap-px bg-[var(--sb-border-soft)]" data-dashboard-exceptions>
              {showOperations && summary.operationsControl?.outlet ? (
                <Metric
                  href="/outlet-daily-records"
                  label="Outlet completion issues"
                  value={summary.operationsControl.outlet.missing_evening}
                  icon={ClipboardCheck}
                  alert
                  variant="tile"
                  density="compact"
                />
              ) : null}
              {(isOwner || isManager || isKitchen) && !summary.wastageUnavailable && summary.wastageAttention !== null ? (
                <Metric
                  href="/stock-wastage?status=submitted"
                  label="Wastage attention"
                  value={summary.wastageAttention}
                  icon={AlertTriangle}
                  alert={(summary.wastageAttention ?? 0) > 0}
                  variant="tile"
                  density="compact"
                />
              ) : (
                <Metric
                  href="/purchase-requests?priority=urgent"
                  label="Urgent requests"
                  value={summary.urgentRequests.length}
                  icon={Clock3}
                  alert={summary.urgentRequests.length > 0}
                  variant="tile"
                  density="compact"
                />
              )}
            </div>
          </Panel>
        </div> : null}

        {showFinance ? <div className="order-3" data-dashboard-priority-group="payables"><Panel dataAttribute="payables" title="Payables and cash obligations"
            empty={summary.payablesAttentionUnavailable ? "Payables attention is temporarily unavailable; operational queues remain current." : "All current supplier invoices are up to date."}
          >
            {summary.payablesAttention ? (
              <>
                <div className="grid grid-cols-2 gap-px bg-[var(--sb-border-soft)]" data-dashboard-payables>
                  <Metric href="/supplier-invoices/aging?overdue=1" label="Overdue AP" value={formatCurrency(summary.payablesAttention.overdue_amount + summary.payablesAttention.critical_amount)} icon={ReceiptText} alert={summary.payablesAttention.overdue_count > 0} variant="tile" density="compact" />
                  <Metric href="/supplier-invoices/aging?bucket=missing_due_date" label="Missing due date" value={formatNumber(summary.payablesAttention.missing_due_date_count)} icon={AlertTriangle} alert={summary.payablesAttention.missing_due_date_count > 0} variant="tile" density="compact" />
                  <Metric href="/supplier-invoices/cash-flow" label="Due soon" value={formatCurrency(summary.payablesAttention.due_today_amount + summary.payablesAttention.due_next_7_amount)} icon={Clock3} variant="tile" density="compact" />
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-[var(--sb-border-soft)] px-3 py-2.5 sm:flex">
                  <Button asChild size="sm" className="!text-xs"><Link prefetch={false} href="/supplier-invoices"><ReceiptText className="h-4 w-4" />Review Invoice</Link></Button><Button asChild variant="outline" size="sm" className="!text-xs"><Link prefetch={false} href="/supplier-invoices/cash-flow"><ArrowUpRight className="h-4 w-4" />View Cash Flow</Link></Button>
                </div>
              </>
            ) : null}
          </Panel></div> : null}

          </div>
        </div>
        )}
      </div>
    </WorkspaceGrid>
  );
}
