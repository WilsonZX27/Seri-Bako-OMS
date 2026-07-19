import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, ClipboardCheck, PackageSearch, ReceiptText, TriangleAlert } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { formatNumber } from "@/lib/utils";
import { getPermissionMap } from "@/server/auth/permissions";
import { getInventoryDashboard } from "@/server/queries/inventory";

const modules = [
  { href: "/low-stock", label: "Low Stock", permission: "low_stock.view", icon: TriangleAlert },
  { href: "/stock-counts", label: "Stock Count", permission: "stock_count.read", icon: ClipboardCheck },
  { href: "/stock-transfers", label: "Transfers", permission: "stock_transfer.read", icon: ArrowLeftRight },
  { href: "/stock-wastage", label: "Wastage", permission: "stock_wastage.read", icon: TriangleAlert },
  { href: "/stock-balance", label: "Stock Balance", permission: "stock_balance.read", icon: PackageSearch },
  { href: "/stock-card", label: "Stock Card", permission: "stock_card.read", icon: ReceiptText },
  { href: "/stock-transactions", label: "Movement Ledger", permission: "stock_transactions.read", icon: ArrowUpRight },
] as const;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ consumption?: string }> }) {
  const params = await searchParams;
  const period = params.consumption === "7d" || params.consumption === "month" ? params.consumption : "30d";
  const [summary, permissions] = await Promise.all([getInventoryDashboard(period), getPermissionMap(modules.map((module) => module.permission))]);
  const visibleModules = modules.filter((module) => permissions[module.permission]);
  const counters = [
    { label: "Low stock", value: summary.lowStockItems, href: "/low-stock" },
    { label: "Counts due", value: summary.stockCountDue, href: "/stock-counts?status=draft" },
    { label: "Transfers today", value: summary.todaysTransfers, href: "/stock-transfers?date=today" },
    { label: "Receiving today", value: summary.todaysReceiving, href: "/goods-receivings?date=today" },
  ];

  return (
    <>
      <PageHeader title="Inventory Workspace" description="Review branch stock, movement, and operational exceptions." />
      <WorkspaceGrid className="p-5" rightRail={<><ConsoleSection title="Review now"><div className="space-y-2"><Button asChild size="sm" className="w-full"><Link href="/low-stock">Review low stock</Link></Button><Button asChild size="sm" variant="outline" className="w-full"><Link href="/stock-balance">Open stock balance</Link></Button></div></ConsoleSection><ConsoleSection title="Control basis"><p className="text-xs leading-5 text-muted-foreground">Balances come from posted Movement Ledger entries and follow branch access.</p></ConsoleSection></>}>
        <div className="space-y-4">
          <section className="overflow-hidden rounded-[2px] border bg-card" aria-labelledby="inventory-overview">
            <div className="border-b px-4 py-3"><h2 id="inventory-overview" className="text-sm font-semibold">Operational overview</h2></div>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">{counters.map((counter) => <Link key={counter.label} href={counter.href} className="flex min-h-20 items-center justify-between gap-3 px-4 py-3 hover:bg-secondary/40"><span className="text-xs text-muted-foreground">{counter.label}</span><strong className="font-mono text-xl">{formatNumber(counter.value)}</strong></Link>)}</div>
          </section>
          <section className="overflow-hidden rounded-[2px] border bg-card" aria-labelledby="inventory-actions">
            <div className="border-b px-4 py-3"><h2 id="inventory-actions" className="text-sm font-semibold">Inventory actions and review</h2></div>
            <div className="grid sm:grid-cols-2">{visibleModules.map((module) => { const Icon = module.icon; return <Link key={module.href} href={module.href} className="flex min-h-12 items-center gap-3 border-b px-4 py-3 hover:bg-secondary/40 sm:border-r"><Icon className="h-4 w-4 text-primary" /><span className="flex-1 text-sm font-semibold">{module.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>; })}</div>
          </section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card><CardContent className="p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Low Stock</h2><p className="text-xs text-muted-foreground">Branch stock at or below safety level.</p></div><Link className="text-xs font-semibold text-primary underline" href="/low-stock">Review all</Link></div>{summary.lowStockRows.length ? <div className="divide-y">{summary.lowStockRows.slice(0, 6).map((item, index) => <Link key={`${item.item_id}-${item.branch_id ?? index}`} href={`/stock-card?item_id=${item.item_id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-secondary/30"><span className="min-w-0"><span className="block truncate font-medium">{item.item_code} · {item.item_name}</span><span className="block text-xs text-muted-foreground">{item.branch_name ?? "All permitted branches"}</span></span><span className="shrink-0 font-mono text-xs">{formatNumber(item.current_qty)} {item.base_unit}</span></Link>)}</div> : <p className="border border-dashed p-4 text-sm text-muted-foreground">No active items are currently low stock.</p>}</CardContent></Card>
            <Card><CardContent className="p-4"><div className="mb-3 flex items-start justify-between gap-3"><div><h2 className="text-sm font-semibold">Consumption</h2><p className="text-xs text-muted-foreground">Posted production usage; wastage excluded.</p></div><form className="flex items-center gap-2"><SelectNative name="consumption" defaultValue={period} aria-label="Consumption period"><option value="7d">7 days</option><option value="30d">30 days</option><option value="month">Current month</option></SelectNative><Button type="submit" size="sm" variant="outline">Apply</Button></form></div>{summary.topConsumedItems.length ? <div className="divide-y">{summary.topConsumedItems.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="truncate">{item.name}</span><span className="font-mono text-xs font-semibold">{formatNumber(item.qty)}</span></div>)}</div> : <p className="border border-dashed p-4 text-sm text-muted-foreground">No posted production usage in this period.</p>}</CardContent></Card>
          </div>
          {summary.topPurchasedItems.length ? <Card><CardContent className="p-4"><div className="mb-3 flex items-center gap-2"><ArrowDownLeft className="h-4 w-4 text-success" /><h2 className="text-sm font-semibold">Top Purchased Items</h2></div><div className="grid gap-x-6 sm:grid-cols-2">{summary.topPurchasedItems.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><span className="truncate">{item.name}</span><span className="font-mono text-xs font-semibold">{formatNumber(item.qty)}</span></div>)}</div></CardContent></Card> : null}
        </div>
      </WorkspaceGrid>
    </>
  );
}
