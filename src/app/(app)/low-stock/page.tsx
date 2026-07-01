import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getLowStockItems } from "@/server/queries/inventory";

export default async function LowStockPage() {
  const items = await getLowStockItems();

  return (
    <>
      <PageHeader title="Low Stock" description="Active items where calculated stock is below safety stock." />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Safety</TableHead>
                <TableHead className="text-right">Shortage</TableHead>
                <TableHead className="text-right">MOQ</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.item_id}>
                  <TableCell>{item.item_code}</TableCell>
                  <TableCell className="font-medium">{item.item_name}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell>{item.supplier_name ?? "-"}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.current_stock)} {item.base_unit}</TableCell>
                  <TableCell className="text-right">{formatNumber(item.safety_stock)} {item.base_unit}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="warning">{formatNumber(item.shortage_quantity)} {item.base_unit}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(item.moq)} {item.base_unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                </TableRow>
              ))}
              {!items.length ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No low stock items.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
