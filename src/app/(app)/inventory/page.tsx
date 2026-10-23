import Link from "next/link";
import { ArrowDownLeft, ArrowLeftRight, ArrowRight, ArrowUpRight, ClipboardCheck, PackageSearch, ReceiptText, TriangleAlert } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { OperationalHub } from "@/components/operational-hub";
import { InventoryDailyMovementChart } from "@/components/reports/inventory-daily-movement-chart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { formatNumber } from "@/lib/utils";
import { getPermissionMap } from "@/server/auth/permissions";
import { getInventoryDailyMovement, getInventoryDashboard } from "@/server/queries/inventory";

const modules = [
  { href: "/low-stock", label: "Low Stock", description: "Items below safety level", permission: "low_stock.view", icon: TriangleAlert },
  { href: "/stock-counts", label: "Stock Count", description: "Physical count workspace", permission: "stock_count.read", icon: ClipboardCheck },
  { href: "/stock-transfers", label: "Transfers", description: "Branch-to-branch movement", permission: "stock_transfer.read", icon: ArrowLeftRight },
  { href: "/stock-wastage", label: "Wastage", description: "Loss and expiry records", permission: "stock_wastage.read", icon: TriangleAlert },
  { href: "/stock-balance", label: "Stock Balance", description: "Current branch availability", permission: "stock_balance.read", icon: PackageSearch },
  { href: "/stock-card", label: "Stock Card", description: "Item movement history", permission: "stock_card.read", icon: ReceiptText },
  { href: "/stock-transactions", label: "Movement Ledger", description: "Posted stock entries", permission: "stock_transactions.read", icon: ArrowUpRight },
] as const;

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ consumption?: string }> }) {
  const params = await searchParams;
  const period = params.consumption === "7d" || params.consumption === "month" ? params.consumption : "30d";
  const [summary, movement, permissions] = await Promise.all([
    getInventoryDashboard(period),
    getInventoryDailyMovement(period),
    getPermissionMap([...modules.map((module) => module.permission), "goods_receiving.read"]),
  ]);
  const visibleModules = modules.filter((module) => permissions[module.permission]);
  const formatCounter = (counter: { value: number; unavailable?: boolean }) => counter.unavailable ? "Unavailable" : formatNumber(counter.value);
  const counters = [
    { label: "Low stock", value: summary.lowStockItems, unavailable: summary.lowStockUnavailable, href: "/low-stock", permission: "low_stock.view" },
    { label: "Counts due", value: summary.stockCountDue, unavailable: summary.stockCountDueUnavailable, href: "/stock-counts?status=draft", permission: "stock_count.read" },
    { label: "Transfers today", value: summary.todaysTransfers, unavailable: summary.todaysTransfersUnavailable, href: "/stock-transfers?date=today", permission: "stock_transfer.read" },
    { label: "Receiving today", value: summary.todaysReceiving, unavailable: summary.todaysReceivingUnavailable, href: "/goods-receivings?date=today", permission: "goods_receiving.read" },
  ].filter((counter) => permissions[counter.permission]);
  const primaryModule = visibleModules.find((module) => module.href === "/stock-balance") ?? visibleModules[0];
  const attentionCounters = counters.filter((counter) => counter.label === "Low stock" || counter.label === "Counts due");
  const showLowStockPanel = summary.lowStockRows.length > 0 || summary.lowStockUnavailable;
  const showConsumptionPanel = summary.topConsumedItems.length > 0 || summary.movementUnavailable;

  return (
    <>
      <PageHeader title="Inventory Workspace" description="Review branch stock, movement, and operational exceptions." />
      <WorkspaceGrid className="p-3 sm:p-5" hideMobileConsole rightRail={<><ConsoleSection title="Attention summary"><div className="space-y-2 text-xs">{permissions["low_stock.view"] ? <p className="flex justify-between gap-3"><span className="text-muted-foreground">Low stock</span><strong>{formatCounter(counters.find((counter) => counter.label === "Low stock")!)}</strong></p> : null}{permissions["stock_count.read"] ? <p className="flex justify-between gap-3"><span className="text-muted-foreground">Counts due</span><strong>{formatCounter(counters.find((counter) => counter.label === "Counts due")!)}</strong></p> : null}</div></ConsoleSection><ConsoleSection title="Control basis"><p className="text-xs leading-5 text-muted-foreground">Balances come from posted Movement Ledger entries and follow branch access.</p></ConsoleSection></>}>
        <div className="flex flex-col gap-4 pb-24 md:pb-0">
          <div className="md:hidden">
            <OperationalHub
              eyebrow="Today’s inventory"
              summary="Check stock exceptions first, then continue with counts, transfers, and movement review."
              primaryAction={{
                href: primaryModule?.href ?? "/dashboard",
                label: primaryModule?.href === "/stock-balance" ? "Review stock balance" : `Open ${primaryModule?.label ?? "workspace"}`,
              }}
              metrics={counters.map((counter) => ({
                label: counter.label,
                value: formatCounter(counter),
                tone: counter.label === "Low stock" && counter.value ? "danger" : counter.label === "Counts due" && counter.value ? "warning" : "default",
              }))}
              queueTitle="Needs attention"
              queueDescription="Exceptions and open controls that may affect today’s stock."
              queue={attentionCounters.map((counter) => ({
                href: counter.href,
                title: counter.label,
                description: counter.label === "Low stock" ? "Review items at or below safety level" : "Continue open physical counts",
                value: formatCounter(counter),
                icon: counter.label === "Low stock" ? TriangleAlert : ClipboardCheck,
                tone: counter.value ? (counter.label === "Low stock" ? "danger" : "warning") : "default",
              }))}
              toolsTitle="Inventory tools"
              collapseToolsOnPhone
              tools={visibleModules.map((module) => ({
                href: module.href,
                title: module.label,
                description: module.description,
                icon: module.icon,
              }))}
            />
          </div>
          <section className="hidden overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-green-900)] bg-card md:block" aria-labelledby="inventory-overview">
            <div className="flex items-end justify-between gap-3 bg-[var(--sb-green-900)] px-4 py-3 text-white"><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Today at a glance</p><h2 id="inventory-overview" className="mt-1 text-sm font-semibold">Operational overview</h2></div><Link href="/stock-balance" className="text-xs font-semibold text-white/80 underline-offset-4 hover:text-white hover:underline">Open stock balance</Link></div>
            <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">{counters.map((counter) => <Link key={counter.label} href={counter.href} className="group flex min-h-16 items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-[var(--sb-green-100)] sm:min-h-20 sm:px-4 sm:py-3"><span className="text-xs text-muted-foreground group-hover:text-[var(--sb-green-900)]">{counter.label}</span><strong className={counter.unavailable ? "font-mono text-lg text-[var(--sb-warning)] sm:text-xl" : "font-mono text-lg text-[var(--sb-green-900)] sm:text-xl"}>{formatCounter(counter)}</strong></Link>)}</div>
          </section>
          <section className="hidden overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card md:block" aria-labelledby="inventory-actions">
            <div className="border-b px-4 py-3"><h2 id="inventory-actions" className="text-sm font-semibold">Inventory actions and review</h2></div>
            <div className="grid sm:grid-cols-2">{visibleModules.map((module) => { const Icon = module.icon; return <Link key={module.href} href={module.href} className="flex min-h-12 items-center gap-3 border-b px-4 py-3 hover:bg-secondary/40 sm:border-r"><Icon className="h-4 w-4 text-primary" /><span className="flex-1 text-sm font-semibold">{module.label}</span><ArrowRight className="h-4 w-4 text-muted-foreground" /></Link>; })}</div>
          </section>
          <section className="overflow-hidden border bg-card" aria-labelledby="inventory-movement-activity">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b px-3 py-2.5 sm:px-4 sm:py-3">
              <div className="min-w-0">
                <h2 id="inventory-movement-activity" className="text-sm font-semibold">Posted movement activity</h2>
                <p className="mt-0.5 max-w-[68ch] text-xs text-muted-foreground">Are inbound and outbound ledger entries changing by day? Counts are posted entries, not quantities mixed across different UOMs.</p>
              </div>
              <form className="flex shrink-0 items-center gap-2">
                <SelectNative name="consumption" defaultValue={period} aria-label="Inventory insight period"><option value="7d">7 days</option><option value="30d">30 days</option><option value="month">Current month</option></SelectNative>
                <Button type="submit" size="sm" variant="outline">Apply</Button>
              </form>
            </div>
            <div className="p-3 sm:p-4">
              {movement.unavailable
                ? <p className="border border-dashed p-4 text-sm text-muted-foreground">Movement activity is temporarily unavailable. The stock balance and ledger remain available.</p>
                : <InventoryDailyMovementChart points={movement.rows} />}
            </div>
          </section>
          {showLowStockPanel || showConsumptionPanel ? <div className={`grid gap-4 ${showLowStockPanel && showConsumptionPanel ? "lg:grid-cols-2" : ""}`} data-inventory-signal-panels>
            {showLowStockPanel ? <Card><CardContent className="p-4"><div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-semibold">Low Stock</h2><p className="text-xs text-muted-foreground">Branch stock at or below safety level.</p></div><Link className="text-xs font-semibold text-primary underline" href="/low-stock">Review all</Link></div>{summary.lowStockRows.length ? <div className="divide-y">{summary.lowStockRows.slice(0, 6).map((item, index) => <Link key={`${item.item_id}-${item.branch_id ?? index}`} href={`/stock-card?item_id=${item.item_id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:bg-secondary/30"><span className="min-w-0"><span className="block break-words font-medium">{item.item_code} · {item.item_name}</span><span className="block text-xs text-muted-foreground">{item.branch_name ?? "All permitted branches"}</span></span><span className="shrink-0 font-mono text-xs">{formatNumber(item.current_qty)} {item.base_unit}</span></Link>)}</div> : <p className="border border-dashed p-4 text-sm text-muted-foreground">Low-stock insight is temporarily unavailable. Open Low Stock to retry.</p>}</CardContent></Card> : null}
            {showConsumptionPanel ? <Card><CardContent className="p-4"><div className="mb-3"><h2 className="text-sm font-semibold">Consumption</h2><p className="text-xs text-muted-foreground">Posted production usage for the selected activity period; wastage excluded.</p></div>{summary.topConsumedItems.length ? <div className="divide-y">{summary.topConsumedItems.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words">{item.name}</span><span className="shrink-0 font-mono text-xs font-semibold">{formatNumber(item.qty)}</span></div>)}</div> : <p className="border border-dashed p-4 text-sm text-muted-foreground">Consumption insight is temporarily unavailable. Try again shortly.</p>}</CardContent></Card> : null}
          </div> : null}
          {summary.topPurchasedItems.length ? <Card><CardContent className="p-4"><div className="mb-3 flex items-center gap-2"><ArrowDownLeft className="h-4 w-4 text-success" /><h2 className="text-sm font-semibold">Top Purchased Items</h2></div><div className="grid gap-x-6 sm:grid-cols-2">{summary.topPurchasedItems.map((item) => <div key={item.name} className="flex items-center justify-between gap-3 border-b py-2 text-sm"><span className="min-w-0 break-words">{item.name}</span><span className="shrink-0 font-mono text-xs font-semibold">{formatNumber(item.qty)}</span></div>)}</div></CardContent></Card> : null}
        </div>
      </WorkspaceGrid>
    </>
  );
}
