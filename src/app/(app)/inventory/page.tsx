import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Boxes, ClipboardCheck, PackageSearch, ReceiptText, ScanLine, TriangleAlert, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCardGrid } from "@/components/category-card-grid";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getInventoryDashboard } from "@/server/queries/inventory";

function InventoryActionCard({ href, title, description, icon: Icon, active = false }: { href: string; title: string; description: string; icon: LucideIcon; active?: boolean }) {
  return (
    <Link href={href} className={`block h-full rounded-lg border p-4 transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/30 hover:bg-[var(--sb-muted)]"}`}>
      <div className="flex h-full gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${active ? "bg-white/15" : "bg-[var(--sb-muted)] text-primary"}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className={`mt-1 text-sm leading-5 ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{description}</p>
        </div>
      </div>
    </Link>
  );
}

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
        <section className="space-y-3 rounded-xl border bg-card p-4">
          <div>
            <p className="sb-section-label">Inventory actions</p>
            <h2 className="mt-1 text-lg font-semibold">Stock workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">Common ledger views and controlled stock posting tools.</p>
          </div>
          <div className="grid items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InventoryActionCard href="/stock-balance" title="Stock Balance" description="Branch-level stock with optional location detail." icon={PackageSearch} active />
            <InventoryActionCard href="/stock-card" title="Stock Card" description="Trace item movements through the posted ledger." icon={ReceiptText} />
            <InventoryActionCard href="/stock-transactions/new" title="Post Movement" description="Post controlled manual movements into stock." icon={ArrowUpRight} />
            <InventoryActionCard href="/opening-stock/import" title="Opening Stock Import" description="Load opening balances through the ledger." icon={Upload} />
          </div>
        </section>

        <section className="space-y-3 rounded-xl border bg-[var(--sb-muted)] p-4">
          <div>
            <p className="sb-section-label">Operational tools</p>
            <h2 className="mt-1 text-lg font-semibold">Daily inventory work</h2>
          </div>
          <CategoryCardGrid items={inventoryTools} className="xl:grid-cols-4" />
        </section>

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
