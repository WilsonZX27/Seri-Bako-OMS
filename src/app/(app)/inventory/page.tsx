import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Boxes, ClipboardCheck, PackageSearch, ScanLine, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getInventoryDashboard } from "@/server/queries/inventory";

export default async function InventoryPage() {
  const summary = await getInventoryDashboard();
  const inventoryTools = [
    { href: "/stock-counts", title: "Stock Count", description: "Create and review branch-first stock counts.", icon: ClipboardCheck, recommendedFor: "kitchen" },
    { href: "/stock-transfers", title: "Stock Transfer", description: "Move stock between branches with default locations handled automatically.", icon: ScanLine, recommendedFor: "operations" },
    { href: "/stock-wastage", title: "Stock Wastage", description: "Record damaged, expired, missing, or claimable stock.", icon: TriangleAlert, recommendedFor: "kitchen" },
    { href: "/items", title: "Find Item", description: "Search item code, item name, or barcode.", icon: PackageSearch, recommendedFor: "all operations" },
  ];

  return (
    <>
      <PageHeader title="Inventory" description="Stock ledger dashboard. Balances are calculated from posted transactions only." />
      <div className="space-y-5 p-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Button asChild><Link href="/stock-balance">Stock Balance</Link></Button>
          <Button asChild variant="outline"><Link href="/stock-card">Stock Card</Link></Button>
          <Button asChild variant="outline"><Link href="/stock-transactions/new">Post Movement</Link></Button>
          <Button asChild variant="outline"><Link href="/opening-stock/import">Opening Stock Import</Link></Button>
        </div>
        <div className="space-y-3">
          <p className="sb-section-label">Inventory tools</p>
          <CategoryCardGrid items={inventoryTools} />
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Inventory Value" value={formatCurrency(summary.inventoryValue)} icon={Boxes} />
          <StatCard label="Active Items" value={formatNumber(summary.totalActiveItems)} icon={PackageSearch} />
          <StatCard label="Low Stock" value={formatNumber(summary.lowStockItems)} icon={TriangleAlert} tone={summary.lowStockItems ? "warning" : "primary"} />
          <StatCard label="Negative Stock" value={formatNumber(summary.negativeStock)} icon={TriangleAlert} tone={summary.negativeStock ? "warning" : "primary"} />
          <StatCard label="Today's Movements" value={formatNumber(summary.todaysMovements)} icon={ArrowUpRight} />
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Recent Transactions</h2>
                <Button asChild variant="outline" size="sm"><Link href="/stock-transactions">View ledger</Link></Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">In</TableHead>
                      <TableHead className="text-right">Out</TableHead>
                      <TableHead className="text-right">Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recentTransactions.map((row) => (
                      <TableRow key={row.stock_transaction_id}>
                        <TableCell className="font-medium">{row.transaction_no}</TableCell>
                        <TableCell>{row.item_name}</TableCell>
                        <TableCell><Badge variant="secondary">{row.transaction_type.replaceAll("_", " ")}</Badge></TableCell>
                        <TableCell className="text-right">{row.quantity_in ? formatNumber(row.quantity_in) : "-"}</TableCell>
                        <TableCell className="text-right">{row.quantity_out ? formatNumber(row.quantity_out) : "-"}</TableCell>
                        <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-success" />
                  <h2 className="text-sm font-semibold">Top Purchased Items</h2>
                </div>
                <div className="space-y-3">
                  {summary.topPurchasedItems.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.name}</span>
                      <span className="font-semibold">{formatNumber(item.qty)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <div className="mb-4 flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-warning" />
                  <h2 className="text-sm font-semibold">Top Consumed Items</h2>
                </div>
                <div className="space-y-3">
                  {summary.topConsumedItems.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="truncate">{item.name}</span>
                      <span className="font-semibold">{formatNumber(item.qty)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
