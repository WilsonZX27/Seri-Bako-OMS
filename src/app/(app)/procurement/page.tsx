import Link from "next/link";
import { ArrowRight, ClipboardList, PackageCheck, ReceiptText, ShoppingCart, Truck } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalHub } from "@/components/operational-hub";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getPermissionMap } from "@/server/auth/permissions";
import { getProcurementWorkspaceInsights } from "@/server/queries/procurement";

const modules = [
  { href: "/purchase-requests", label: "Purchase Requests", description: "Create, review, and convert branch requests.", permission: "purchase_request.read", roles: ["super_admin", "finance", "manager", "purchasing", "chef"], icon: ClipboardList },
  { href: "/purchase-orders", label: "Purchase Orders", description: "Prepare and follow supplier orders.", permission: "purchase_order.read", roles: ["super_admin", "finance", "manager", "purchasing", "chef"], icon: ShoppingCart },
  { href: "/goods-receivings", label: "Receiving", description: "Receive and post goods against orders.", permission: "goods_receiving.read", roles: ["super_admin", "finance", "manager", "purchasing", "chef"], icon: PackageCheck },
  { href: "/supplier-invoices", label: "Invoice Follow-up", description: "Review invoice and payment status.", permission: "supplier_invoice.view", roles: ["super_admin", "finance"], icon: ReceiptText },
  { href: "/suppliers", label: "Suppliers", description: "Maintain approved supplier records.", permission: "suppliers.view", roles: ["super_admin", "finance", "purchasing"], icon: Truck },
] as const;

export default async function ProcurementPage() {
  const [insights, permissions] = await Promise.all([
    getProcurementWorkspaceInsights(),
    getPermissionMap([...modules.map((module) => module.permission), "purchase_request.create"]),
  ]);
  const visibleModules = modules.filter((module) => module.roles.includes(insights.role as never) && permissions[module.permission]);
  const displayCounterValue = (value: number | null) => value === null ? "Unavailable" : value;
  const countersByRole = {
    super_admin: [
      { label: "Manager review", value: insights.managerReview, href: "/purchase-requests?status=manager_review" },
      { label: "Finance review", value: insights.financeReview, href: "/purchase-requests?status=finance_review" },
      { label: "PO approval", value: insights.pendingPoApproval, href: "/purchase-orders?status=pending_approval" },
      { label: "Receiving today", value: insights.receivingToday, href: "/goods-receivings?date=today" },
    ],
    finance: [
      { label: "Finance review", value: insights.financeReview, href: "/purchase-requests?status=finance_review" },
      { label: "Sent purchase orders", value: insights.sentPo, href: "/purchase-orders?status=sent" },
      { label: "Receiving today", value: insights.receivingToday, href: "/goods-receivings?date=today" },
      { label: "Invoice follow-up", value: insights.invoiceFollowup, href: "/supplier-invoices?status=open" },
    ],
    manager: [
      { label: "Manager review", value: insights.managerReview, href: "/purchase-requests?status=manager_review" },
      { label: "PO approval", value: insights.pendingPoApproval, href: "/purchase-orders?status=pending_approval" },
      { label: "Sent purchase orders", value: insights.sentPo, href: "/purchase-orders?status=sent" },
      { label: "Receiving today", value: insights.receivingToday, href: "/goods-receivings?date=today" },
    ],
    purchasing: [
      { label: "Purchasing review", value: insights.purchasingReview, href: "/purchase-requests?status=admin_review" },
      { label: "Ready to convert", value: insights.readyToConvert, href: "/purchase-requests?status=ready_to_convert" },
      { label: "Draft purchase orders", value: insights.draftPo, href: "/purchase-orders?status=draft" },
      { label: "Receiving today", value: insights.receivingToday, href: "/goods-receivings?date=today" },
    ],
  } as const;
  const counters = countersByRole[insights.role as keyof typeof countersByRole] ?? [];
  const canCreatePr = permissions["purchase_request.create"];
  const counterPresentation = {
    "Manager review": { description: "Requests waiting for manager review", icon: ClipboardList },
    "Finance review": { description: "Requests waiting for finance review", icon: ReceiptText },
    "PO approval": { description: "Purchase orders waiting for approval", icon: ShoppingCart },
    "Receiving today": { description: "Goods received today", icon: PackageCheck },
    "Sent purchase orders": { description: "Orders currently with suppliers", icon: ShoppingCart },
    "Invoice follow-up": { description: "Open supplier invoice follow-up", icon: ReceiptText },
    "Purchasing review": { description: "Requests waiting for purchasing review", icon: ClipboardList },
    "Ready to convert": { description: "Approved requests ready for a PO", icon: ShoppingCart },
    "Draft purchase orders": { description: "Purchase orders still in draft", icon: ShoppingCart },
    "Draft requests": { description: "Purchase requests still in draft", icon: ClipboardList },
    "Submitted requests": { description: "Submitted requests moving through review", icon: ClipboardList },
  } as const;
  const primaryModule = visibleModules[0];

  return (
    <>
      <div className="hidden md:block"><PageHeader title="Procurement Workspace" description="Review purchasing work from request through invoice follow-up." /></div>
      <WorkspaceGrid className="p-3 pt-3 sm:p-5 sm:pt-4" hideMobileConsole rightRail={<><ConsoleSection title="Next actions">{canCreatePr ? <Button asChild size="sm" className="w-full"><Link href="/purchase-requests/new">Create purchase request</Link></Button> : <p className="text-xs text-muted-foreground">Open a queue to continue permitted procurement work.</p>}</ConsoleSection><ConsoleSection title="Workspace scope"><p className="text-xs leading-5 text-muted-foreground">Counts and queues follow your company, branch, role, and document permissions.</p></ConsoleSection></>}>
        <div className="space-y-4 pb-24 md:pb-0">
          <div className="md:hidden">
            <OperationalHub
              eyebrow="Today’s procurement"
              summary="Work the next approval or order state, then continue through receiving and invoice follow-up."
              primaryAction={canCreatePr
                ? { href: "/purchase-requests/new", label: "Start purchase request" }
                : { href: primaryModule?.href ?? "/dashboard", label: `Open ${primaryModule?.label ?? "workspace"}` }}
              metrics={counters.map((counter) => ({
                label: counter.label,
                value: displayCounterValue(counter.value),
                tone: "default",
              }))}
              queueTitle="My work queue"
              queueDescription="Role-specific document states that may need action today."
              queue={counters.map((counter) => {
                const presentation = counterPresentation[counter.label];
                return {
                  href: counter.href,
                  title: counter.label,
                  description: presentation.description,
                  value: displayCounterValue(counter.value),
                  icon: presentation.icon,
                  tone: "default",
                };
              })}
              toolsTitle="Procurement tools"
              tools={visibleModules.map((module) => ({
                href: module.href,
                title: module.label,
                description: module.description,
                icon: module.icon,
              }))}
            />
          </div>
          {insights.unavailable ? <p role="status" className="border border-warning/35 bg-warning/10 px-3 py-2 text-xs text-warning">Some procurement counters are temporarily unavailable. The linked queues remain the source of truth; retry to refresh the summary.</p> : null}
          <section aria-labelledby="procurement-overview" className="hidden overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-green-900)] bg-card md:block">
            <div className="flex items-end justify-between gap-3 bg-[var(--sb-green-900)] px-4 py-3 text-white"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Today at a glance</p><h2 id="procurement-overview" className="mt-1 text-sm font-semibold">Purchasing pipeline</h2></div></div>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              {counters.map((counter) => <Link key={counter.label} href={counter.href} className="group flex min-h-16 items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--sb-green-100)] sm:min-h-20 sm:px-4 sm:py-3"><span className="text-xs text-muted-foreground group-hover:text-[var(--sb-green-900)]">{counter.label}</span><strong className={`font-mono text-lg tabular-nums sm:text-xl ${counter.value === null ? "text-warning" : "text-[var(--sb-green-900)]"}`}>{displayCounterValue(counter.value)}</strong></Link>)}
            </div>
          </section>
          <section aria-labelledby="procurement-queue" className="hidden overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card md:block">
            <div className="border-b px-4 py-3"><h2 id="procurement-queue" className="text-sm font-semibold">My Work Queue</h2></div>
            <div className="grid sm:grid-cols-2">
              {visibleModules.map((module) => { const Icon = module.icon; return <Link key={module.href} href={module.href} title={module.description} className="flex min-h-12 items-center gap-3 border-b px-4 py-3 hover:bg-secondary/40 sm:border-r"><Icon className="h-4 w-4 shrink-0 text-primary" /><span className="flex-1 text-sm font-semibold">{module.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>; })}
            </div>
          </section>
        </div>
      </WorkspaceGrid>
    </>
  );
}
