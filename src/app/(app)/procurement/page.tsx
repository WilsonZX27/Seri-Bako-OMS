import Link from "next/link";
import { ArrowRight, ClipboardList, PackageCheck, ReceiptText, ShoppingCart, Truck } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { getPermissionMap } from "@/server/auth/permissions";
import { getProcurementWorkspaceInsights } from "@/server/queries/procurement";

const modules = [
  { href: "/purchase-requests", label: "Purchase Requests", description: "Create, review, and convert branch requests.", permission: "purchase_request.read", icon: ClipboardList },
  { href: "/purchase-orders", label: "Purchase Orders", description: "Prepare and follow supplier orders.", permission: "purchase_order.read", icon: ShoppingCart },
  { href: "/goods-receivings", label: "Receiving", description: "Receive and post goods against orders.", permission: "goods_receiving.read", icon: PackageCheck },
  { href: "/supplier-invoices", label: "Invoice Follow-up", description: "Review invoice and payment status.", permission: "supplier_invoice.view", icon: ReceiptText },
  { href: "/suppliers", label: "Suppliers", description: "Maintain approved supplier records.", permission: "suppliers.view", icon: Truck },
] as const;

export default async function ProcurementPage() {
  const [insights, permissions] = await Promise.all([
    getProcurementWorkspaceInsights(),
    getPermissionMap([...modules.map((module) => module.permission), "purchase_request.create"]),
  ]);
  const visibleModules = modules.filter((module) => permissions[module.permission]);
  const counters = [
    { label: "PR awaiting review", value: insights.pendingPr, href: "/purchase-requests?status=in_review" },
    { label: "Open purchase orders", value: insights.openPo, href: "/purchase-orders?status=awaiting_delivery" },
    { label: "Receiving today", value: insights.receivingToday, href: "/goods-receivings?date=today" },
    { label: "Invoice follow-up", value: insights.invoiceFollowup, href: "/supplier-invoices?status=unpaid" },
  ];

  return (
    <>
      <PageHeader title="Procurement Workspace" description="Review purchasing work from request through invoice follow-up." />
      <WorkspaceGrid className="pt-4" rightRail={<><ConsoleSection title="Next actions">{permissions["purchase_request.create"] ? <Button asChild size="sm" className="w-full"><Link href="/purchase-requests/new">Create purchase request</Link></Button> : <p className="text-xs text-muted-foreground">Open a queue to continue permitted procurement work.</p>}</ConsoleSection><ConsoleSection title="Workspace scope"><p className="text-xs leading-5 text-muted-foreground">Counts and queues follow your company, branch, role, and document permissions.</p></ConsoleSection></>}>
        <div className="space-y-4">
          <section aria-labelledby="procurement-overview" className="overflow-hidden rounded-[2px] border bg-card">
            <div className="border-b px-4 py-3"><h2 id="procurement-overview" className="text-sm font-semibold">Purchasing pipeline</h2></div>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
              {counters.map((counter) => <Link key={counter.label} href={counter.href} className="flex min-h-20 items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40"><span className="text-xs text-muted-foreground">{counter.label}</span><strong className="font-mono text-xl">{counter.value}</strong></Link>)}
            </div>
          </section>
          <section aria-labelledby="procurement-queue" className="overflow-hidden rounded-[2px] border bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3"><div><h2 id="procurement-queue" className="text-sm font-semibold">My Work Queue</h2><p className="text-xs text-muted-foreground">Only modules permitted for your role are shown.</p></div></div>
            <div className="divide-y">
              {visibleModules.map((module) => { const Icon = module.icon; return <Link key={module.href} href={module.href} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-secondary/40"><Icon className="h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{module.label}</span><span className="block truncate text-xs text-muted-foreground">{module.description}</span></span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>; })}
            </div>
          </section>
        </div>
      </WorkspaceGrid>
    </>
  );
}
