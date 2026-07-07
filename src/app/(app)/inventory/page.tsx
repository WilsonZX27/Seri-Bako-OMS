import { ArrowDownLeft, ArrowUpRight, Boxes, ClipboardCheck, PackageSearch, ReceiptText, ScanLine, TriangleAlert, Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { CompactStatList, WorkspaceSectionPanel, type WorkspaceInsight, type WorkspaceSection } from "@/components/workspace-panels";
import { formatNumber } from "@/lib/utils";
import { getInventoryDashboard } from "@/server/queries/inventory";

export default async function InventoryPage() {
  const summary = await getInventoryDashboard();
  const hasPurchasedItems = summary.topPurchasedItems.length > 0;
  const hasConsumedItems = summary.topConsumedItems.length > 0;
  const inventoryInsights: WorkspaceInsight[] = [
    { label: "Total Active Items", value: formatNumber(summary.totalActiveItems), icon: PackageSearch, theme: "green", href: "/items" },
    { label: "Low Stock Items", value: formatNumber(summary.lowStockItems), icon: TriangleAlert, theme: summary.lowStockItems ? "amber" : "green", href: "/stock-balance?status=low_stock" },
    { label: "Today's Receiving", value: formatNumber(summary.todaysReceiving), icon: ArrowDownLeft, theme: "blue", href: "/goods-receivings?date=today" },
    { label: "Today's Transfers", value: formatNumber(summary.todaysTransfers), icon: ScanLine, theme: "teal", href: "/stock-transfers?date=today" },
    { label: "Pending Adjustments", value: formatNumber(summary.pendingAdjustments), icon: ClipboardCheck, theme: "amber", href: "/stock-transactions?status=draft" },
    { label: "Stock Count Due", value: formatNumber(summary.stockCountDue), icon: Boxes, theme: "purple", href: "/stock-counts?status=draft" },
  ];
  const inventorySections: WorkspaceSection[] = [
    {
      title: "Stock Actions",
      description: "Daily branch-first inventory actions that write controlled stock documents.",
      icon: ClipboardCheck,
      theme: "teal",
      actions: [
        { href: "/stock-counts", title: "Stock Count", description: "Create and review branch-first stock counts.", icon: ClipboardCheck, recommendedFor: "kitchen" },
        { href: "/stock-transfers", title: "Transfer Stock", description: "Move stock between branches with default locations handled automatically.", icon: ScanLine, recommendedFor: "operations" },
        { href: "/stock-wastage", title: "Stock Wastage", description: "Record damaged, expired, missing, or claimable stock.", icon: TriangleAlert, recommendedFor: "kitchen" },
      ],
    },
    {
      title: "Stock Review",
      description: "Review calculated balances, stock cards, and posted ledger movement.",
      icon: ReceiptText,
      theme: "blue",
      actions: [
        { href: "/stock-balance", title: "Stock Balance", description: "Branch-level stock with optional location detail.", icon: PackageSearch, recommendedFor: "all operations" },
        { href: "/stock-card", title: "Stock Card", description: "Trace item movements through the posted ledger.", icon: ReceiptText, recommendedFor: "finance and operations" },
        { href: "/stock-transactions", title: "Movement Ledger", description: "Review posted stock transactions and document links.", icon: ArrowUpRight, recommendedFor: "finance" },
        { href: "/opening-stock/import", title: "Opening Stock Import", description: "Load opening balances through the ledger.", icon: Upload, recommendedFor: "admin" },
      ],
    },
    {
      title: "Inventory Control",
      description: "Controlled imports and exception queues used by admin operations.",
      icon: Boxes,
      theme: "green",
      actions: [
        { href: "/opening-stock/import", title: "Opening Stock Import", description: "Load opening balances through the ledger.", icon: Upload, recommendedFor: "admin" },
        { href: "/low-stock", title: "Low Stock Review", description: "Review items that need attention before ordering.", icon: TriangleAlert, recommendedFor: "operations" },
      ],
    },
  ];

  return (
    <>
      <PageHeader title="Inventory" description="Stock ledger dashboard. Balances are calculated from posted transactions only." action={{ href: "/stock-transactions/new", label: "New movement" }} />
      <div className="space-y-5 p-5">
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 2xl:grid-cols-3">
              {inventorySections.map((section) => (
                <WorkspaceSectionPanel key={section.title} section={section} />
              ))}
            </div>
          {hasPurchasedItems || hasConsumedItems ? (
            <div className="grid gap-5 lg:grid-cols-2">
              {hasPurchasedItems ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-success" />
                      <h2 className="text-sm font-semibold">Top Purchased Items</h2>
                    </div>
                    <div className="space-y-2">
                      {summary.topPurchasedItems.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="font-mono text-xs font-semibold">{formatNumber(item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              {hasConsumedItems ? (
                <Card>
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-warning" />
                      <h2 className="text-sm font-semibold">Top Consumed Items</h2>
                    </div>
                    <div className="space-y-2">
                      {summary.topConsumedItems.map((item) => (
                        <div key={item.name} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="font-mono text-xs font-semibold">{formatNumber(item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          ) : null}
          </div>
          <aside data-testid="inventory-insights-rail" className="min-w-0 2xl:sticky 2xl:top-6 2xl:max-h-[calc(100vh-120px)] 2xl:overflow-y-auto">
            <CompactStatList insights={inventoryInsights} action={{ href: "/stock-balance", label: "Review stock balance" }} />
          </aside>
        </div>
      </div>
    </>
  );
}
