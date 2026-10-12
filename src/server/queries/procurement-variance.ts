import { isMockMode, mockGoodsReceivingLines, mockGoodsReceivings, mockItems, mockPurchaseOrderLines, mockPurchaseOrders, mockSupplierInvoiceLines, mockSupplierInvoices, mockSupplierItems, mockSuppliers } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { requireReadRows } from "@/server/queries/common";

type Filters = { search?: string; supplier?: string; item?: string; status?: string; date_from?: string; date_to?: string };
type Data = {
  orders: Pick<(typeof mockPurchaseOrders)[number], "id" | "deleted_at" | "supplier_id" | "po_no" | "order_date">[];
  orderLines: Pick<(typeof mockPurchaseOrderLines)[number], "id" | "purchase_order_id" | "item_id" | "qty_ordered" | "unit_price">[];
  receivings: Pick<(typeof mockGoodsReceivings)[number], "id" | "deleted_at" | "grn_no" | "received_date">[];
  receivingLines: Pick<(typeof mockGoodsReceivingLines)[number], "id" | "purchase_order_line_id" | "goods_receiving_id" | "uom" | "unit_cost" | "received_qty">[];
  invoices: Pick<(typeof mockSupplierInvoices)[number], "id" | "deleted_at" | "status" | "invoice_no">[];
  invoiceLines: Pick<(typeof mockSupplierInvoiceLines)[number], "goods_receiving_line_id" | "purchase_order_line_id" | "supplier_invoice_id" | "invoice_unit_price" | "invoice_qty">[];
  suppliers: Pick<(typeof mockSuppliers)[number], "id" | "deleted_at" | "name">[];
  items: Pick<(typeof mockItems)[number], "id" | "deleted_at" | "item_code" | "item_name">[];
  supplierItems: Pick<(typeof mockSupplierItems)[number], "supplier_id" | "item_id" | "status" | "deleted_at" | "purchase_uom" | "unit_cost">[];
};
export type ProcurementVarianceRow = { id: string; item_id: string; item_code: string; item_name: string; supplier: string; po_no: string; grn_no: string | null; invoice_no: string | null; comparison_date: string; ordered_qty: number; received_qty: number | null; invoiced_qty: number | null; po_unit_price: number; grn_unit_price: number | null; invoice_unit_price: number | null; reference_supplier_price: number | null; price_variance_amount: number | null; price_variance_percent: number | null; quantity_variance: number | null; status: "Matched" | "Price variance" | "Quantity variance" | "Missing invoice" | "Missing GRN" | "Not linked" | "Review manually" };

const priceVariance = (expected: number, actual: number) => actual - expected;
const priceWarning = (amount: number, expected: number) => Math.abs(amount) > 0.01 || (expected > 0 && Math.abs(amount / expected) > 0.02);

export function buildProcurementVariance(data: Data, filters: Filters = {}) {
  const orders = new Map(data.orders.filter((row) => !row.deleted_at).map((row) => [row.id, row]));
  const suppliers = new Map(data.suppliers.filter((row) => !row.deleted_at).map((row) => [row.id, row]));
  const items = new Map(data.items.filter((row) => !row.deleted_at).map((row) => [row.id, row]));
  const receivings = new Map(data.receivings.filter((row) => !row.deleted_at).map((row) => [row.id, row]));
  const invoiceHeaders = new Map(data.invoices.filter((row) => !row.deleted_at && row.status !== "void").map((row) => [row.id, row]));
  const receivingLinesByOrderLine = new Map<string, Data["receivingLines"]>();
  for (const row of data.receivingLines) {
    if (!receivings.has(row.goods_receiving_id)) continue;
    const bucket = receivingLinesByOrderLine.get(row.purchase_order_line_id) ?? [];
    bucket.push(row);
    receivingLinesByOrderLine.set(row.purchase_order_line_id, bucket);
  }
  const invoiceLinesByReceivingAndOrderLine = new Map<string, Data["invoiceLines"]>();
  for (const row of data.invoiceLines) {
    if (!invoiceHeaders.has(row.supplier_invoice_id)) continue;
    const key = `${row.goods_receiving_line_id}:${row.purchase_order_line_id}`;
    const bucket = invoiceLinesByReceivingAndOrderLine.get(key) ?? [];
    bucket.push(row);
    invoiceLinesByReceivingAndOrderLine.set(key, bucket);
  }
  const supplierItemsByIdentity = new Map<string, Data["supplierItems"]>();
  for (const row of data.supplierItems) {
    if (row.status !== "active" || row.deleted_at) continue;
    const key = `${row.supplier_id}:${row.item_id}:${row.purchase_uom}`;
    const bucket = supplierItemsByIdentity.get(key) ?? [];
    bucket.push(row);
    supplierItemsByIdentity.set(key, bucket);
  }
  const rows: ProcurementVarianceRow[] = data.orderLines.flatMap((line): ProcurementVarianceRow[] => {
    const order = orders.get(line.purchase_order_id); const item = items.get(line.item_id);
    const grnLines = receivingLinesByOrderLine.get(line.id) ?? [];
    if (!order || !item) return [];
    if (!grnLines.length) return [{ id: line.id, item_id: line.item_id, item_code: item.item_code, item_name: item.item_name, supplier: suppliers.get(order.supplier_id)?.name ?? "Unknown supplier", po_no: order.po_no, grn_no: null, invoice_no: null, comparison_date: order.order_date, ordered_qty: Number(line.qty_ordered), received_qty: null, invoiced_qty: null, po_unit_price: Number(line.unit_price), grn_unit_price: null, invoice_unit_price: null, reference_supplier_price: null, price_variance_amount: null, price_variance_percent: null, quantity_variance: null, status: "Missing GRN" }];
    return grnLines.map((grnLine) => {
      const grn = receivings.get(grnLine.goods_receiving_id)!;
      const invoiceLines = invoiceLinesByReceivingAndOrderLine.get(`${grnLine.id}:${line.id}`) ?? [];
      const supplierItems = supplierItemsByIdentity.get(`${order.supplier_id}:${line.item_id}:${grnLine.uom}`) ?? [];
      const invoice = invoiceLines.length === 1 ? invoiceHeaders.get(invoiceLines[0].supplier_invoice_id)! : null;
      const invoiceLine = invoiceLines.length === 1 ? invoiceLines[0] : null;
      const amount = priceVariance(Number(line.unit_price), Number(grnLine.unit_cost));
      const qtyVariance = Number(grnLine.received_qty) - Number(line.qty_ordered);
      const invoiceAmount = invoiceLine ? priceVariance(Number(grnLine.unit_cost), Number(invoiceLine.invoice_unit_price)) : 0;
      const status: ProcurementVarianceRow["status"] = invoiceLines.length > 1 ? "Review manually" : !invoiceLine ? "Missing invoice" : priceWarning(amount, Number(line.unit_price)) || priceWarning(invoiceAmount, Number(grnLine.unit_cost)) ? "Price variance" : qtyVariance !== 0 || Number(invoiceLine.invoice_qty) !== Number(grnLine.received_qty) ? "Quantity variance" : "Matched";
      return { id: grnLine.id, item_id: line.item_id, item_code: item.item_code, item_name: item.item_name, supplier: suppliers.get(order.supplier_id)?.name ?? "Unknown supplier", po_no: order.po_no, grn_no: grn.grn_no, invoice_no: invoice?.invoice_no ?? null, comparison_date: grn.received_date, ordered_qty: Number(line.qty_ordered), received_qty: Number(grnLine.received_qty), invoiced_qty: invoiceLine ? Number(invoiceLine.invoice_qty) : null, po_unit_price: Number(line.unit_price), grn_unit_price: Number(grnLine.unit_cost), invoice_unit_price: invoiceLine ? Number(invoiceLine.invoice_unit_price) : null, reference_supplier_price: supplierItems.length === 1 ? Number(supplierItems[0].unit_cost) : null, price_variance_amount: amount, price_variance_percent: Number(line.unit_price) > 0 ? amount / Number(line.unit_price) : null, quantity_variance: qtyVariance, status };
    });
  });
  const needle = `${filters.search ?? ""} ${filters.supplier ?? ""} ${filters.item ?? ""}`.trim().toLowerCase();
  return rows.filter((row) => (!needle || `${row.item_code} ${row.item_name} ${row.supplier} ${row.po_no}`.toLowerCase().includes(needle)) && (!filters.date_from || row.comparison_date >= filters.date_from) && (!filters.date_to || row.comparison_date <= filters.date_to) && (!filters.status || filters.status === "all" || row.status.toLowerCase().replaceAll(" ", "_") === filters.status));
}

export async function getProcurementVariance(filters: Filters = {}) {
  await requirePermission("reports.view");
  if (isMockMode()) return buildProcurementVariance({ orders: mockPurchaseOrders, orderLines: mockPurchaseOrderLines, receivings: mockGoodsReceivings, receivingLines: mockGoodsReceivingLines, invoices: mockSupplierInvoices, invoiceLines: mockSupplierInvoiceLines, suppliers: mockSuppliers, items: mockItems, supplierItems: mockSupplierItems }, filters);
  const supabase = await createClient();
  const [orders, orderLines, receivings, receivingLines, invoices, invoiceLines, suppliers, items, supplierItems] = await Promise.all([
    supabase.from("purchase_orders").select("id,deleted_at,supplier_id,po_no,order_date").is("deleted_at", null),
    supabase.from("purchase_order_lines").select("id,purchase_order_id,item_id,qty_ordered,unit_price"),
    supabase.from("goods_receivings").select("id,deleted_at,grn_no,received_date").is("deleted_at", null),
    supabase.from("goods_receiving_lines").select("id,purchase_order_line_id,goods_receiving_id,uom,unit_cost,received_qty"),
    supabase.from("supplier_invoices").select("id,deleted_at,status,invoice_no").is("deleted_at", null),
    supabase.from("supplier_invoice_lines").select("goods_receiving_line_id,purchase_order_line_id,supplier_invoice_id,invoice_unit_price,invoice_qty"),
    supabase.from("suppliers").select("id,deleted_at,name").is("deleted_at", null),
    supabase.from("items").select("id,deleted_at,item_code,item_name").is("deleted_at", null),
    supabase.from("supplier_items").select("supplier_id,item_id,status,deleted_at,purchase_uom,unit_cost").is("deleted_at", null),
  ]);
  for (const result of [orders, orderLines, receivings, receivingLines, invoices, invoiceLines, suppliers, items, supplierItems]) if (result.error) throw new Error(result.error.message);
  return buildProcurementVariance({
    orders: requireReadRows(orders.data, "Procurement variance purchase orders"),
    orderLines: requireReadRows(orderLines.data, "Procurement variance purchase order lines"),
    receivings: requireReadRows(receivings.data, "Procurement variance goods receivings"),
    receivingLines: requireReadRows(receivingLines.data, "Procurement variance receiving lines"),
    invoices: requireReadRows(invoices.data, "Procurement variance invoices"),
    invoiceLines: requireReadRows(invoiceLines.data, "Procurement variance invoice lines"),
    suppliers: requireReadRows(suppliers.data, "Procurement variance suppliers"),
    items: requireReadRows(items.data, "Procurement variance items"),
    supplierItems: requireReadRows(supplierItems.data, "Procurement variance supplier items"),
  }, filters);
}
