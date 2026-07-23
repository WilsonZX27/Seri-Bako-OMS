import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getItemsForSelect } from "@/server/queries/common";
import { getStockCard } from "@/server/queries/inventory";

export default async function StockCardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [items, rows] = await Promise.all([getItemsForSelect(), getStockCard(filters)]);
  const selectedItem = filters.item_id ? items.find((item) => item.id === filters.item_id) : null;
  const opening = rows.filter((row) => row.transaction_type === "opening_balance").reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);
  const purchase = rows.filter((row) => row.transaction_type === "purchase").reduce((sum, row) => sum + row.quantity_in, 0);
  const transferIn = rows.filter((row) => row.transaction_type === "transfer_in").reduce((sum, row) => sum + row.quantity_in, 0);
  const productionOutput = rows.filter((row) => row.transaction_type === "production_output").reduce((sum, row) => sum + row.quantity_in, 0);
  const productionUsage = rows.filter((row) => row.transaction_type === "production_usage").reduce((sum, row) => sum + row.quantity_out, 0);
  const transferOut = rows.filter((row) => row.transaction_type === "transfer_out").reduce((sum, row) => sum + row.quantity_out, 0);
  const wastage = rows.filter((row) => ["wastage", "damage"].includes(row.transaction_type)).reduce((sum, row) => sum + row.quantity_out, 0);
  const adjustment = rows.filter((row) => ["stock_adjustment", "stock_count_adjustment", "correction"].includes(row.transaction_type)).reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);
  const current = rows.reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);

  return (
    <>
      <PageHeader title="Stock Card" description="Chronological stock movement history per item." />
      <div className="space-y-5 p-5">
        <Card>
          <CardContent className="p-5">
            <form className="sb-list-filters border-0 p-0">
              <SelectNative name="item_id" defaultValue={filters.item_id ?? ""}>
                <option value="">All items</option>
                {items.map((item) => <option key={item.id} value={item.id}>{item.item_code} - {item.item_name}</option>)}
              </SelectNative>
              <Input name="from" type="date" defaultValue={filters.from ?? ""} />
              <Input name="to" type="date" defaultValue={filters.to ?? ""} />
              <Button type="submit" variant="secondary">Apply</Button>
              <Button asChild variant="ghost"><a href="/stock-card">Reset</a></Button>
            </form>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-4 xl:grid-cols-8">
          {[
            ["Opening", opening],
            ["Purchase", purchase],
            ["Transfer In", transferIn],
            ["Production Output", productionOutput],
            ["Production Usage", -productionUsage],
            ["Transfer Out", -transferOut],
            ["Wastage", -wastage],
            ["Adjustment", adjustment],
          ].map(([label, value]) => (
            <Card key={label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-2 text-lg font-semibold">{formatNumber(Number(value))}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold">{selectedItem ? `${selectedItem.item_code} - ${selectedItem.item_name}` : "Stock Movement History"}</h2>
                <p className="text-xs text-muted-foreground">Current balance: {formatNumber(current)} {selectedItem?.base_unit ?? ""}</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction No</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Out</TableHead>
                    <TableHead className="text-right">Running</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Total Cost</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.stock_transaction_id}>
                      <TableCell>{row.transaction_date}</TableCell>
                      <TableCell className="font-medium">{row.transaction_no}</TableCell>
                      <TableCell>{row.transaction_type.replaceAll("_", " ")}</TableCell>
                      <TableCell>{row.item_name}</TableCell>
                      <TableCell>{row.branch_name ?? "-"}</TableCell>
                      <TableCell className="text-right">{row.quantity_in ? formatNumber(row.quantity_in) : "-"}</TableCell>
                      <TableCell className="text-right">{row.quantity_out ? formatNumber(row.quantity_out) : "-"}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(row.running_balance)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.unit_cost)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.total_cost)}</TableCell>
                      <TableCell>{row.reference_type ?? "-"}</TableCell>
                    </TableRow>
                  ))}
                  {!rows.length ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No stock movements found.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
