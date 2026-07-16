import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";
import { getCurrentProfile } from "@/server/queries/common";

type Filters = Record<string, string | undefined>;
type SupplierInvoice = Database["public"]["Tables"]["supplier_invoices"]["Row"];
type SupplierInvoiceLine = Database["public"]["Tables"]["supplier_invoice_lines"]["Row"];
type SupplierInvoicePayment = Database["public"]["Tables"]["supplier_invoice_payments"]["Row"];
type GoodsReceiving = Database["public"]["Tables"]["goods_receivings"]["Row"];
type GoodsReceivingLine = Database["public"]["Tables"]["goods_receiving_lines"]["Row"];
type PurchaseOrderLine = Database["public"]["Tables"]["purchase_order_lines"]["Row"];

export type SupplierInvoiceRow = SupplierInvoice & {
  supplier_name: string | null;
  po_no: string | null;
  grn_no: string | null;
  balance_due: number;
  payment_count: number;
  is_overdue: boolean;
};

export type InvoiceSourceLine = GoodsReceivingLine & {
  grn_no: string;
  po_no: string;
  item_code: string | null;
  item_name: string;
  po_ordered_qty: number;
  po_unit_price: number;
  previously_invoiced_qty: number;
  available_qty: number;
};

export type PostedGrnForInvoice = GoodsReceiving & {
  supplier_name: string | null;
  po_no: string | null;
  received_value: number;
  lines: InvoiceSourceLine[];
};

function filterRows(rows: SupplierInvoiceRow[], filters: Filters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const supplier = filters.supplier && filters.supplier !== "all" ? filters.supplier : null;
  const due = filters.due && filters.due !== "all" ? filters.due : null;
  const today = new Date().toISOString().slice(0, 10);
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const sort = filters.sort ?? "updated_at";
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const blob = [row.invoice_no, row.supplier_invoice_no, row.supplier_name].join(" ").toLowerCase();
      const dueMatch = !due
        || (due === "overdue" && row.is_overdue)
        || (due === "due_7" && !!row.due_date && row.due_date >= today && row.due_date <= nextWeek && row.balance_due > 0)
        || (due === "no_due" && !row.due_date);
      return (!search || blob.includes(search)) && (!status || row.status === status) && (!supplier || row.supplier_id === supplier) && dueMatch;
    })
    .sort((a, b) => compareTableValues(a[sort as keyof SupplierInvoiceRow], b[sort as keyof SupplierInvoiceRow], dir));
}

export async function getSupplierInvoices(filters: Filters = {}) {
  const supabase = await createClient();
  const [{ data, error }, { data: payments }, { data: suppliers }, { data: pos }, { data: grns }] = await Promise.all([
    supabase.from("supplier_invoices").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("supplier_invoice_payments").select("supplier_invoice_id"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("goods_receivings").select("id, grn_no"),
  ]);
  if (error) throw new Error(error.message);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const grnById = new Map((grns ?? []).map((row) => [row.id, row.grn_no]));
  const paymentCounts = new Map<string, number>();
  for (const payment of payments ?? []) paymentCounts.set(payment.supplier_invoice_id, (paymentCounts.get(payment.supplier_invoice_id) ?? 0) + 1);
  const today = new Date().toISOString().slice(0, 10);
  const rows = ((data ?? []) as SupplierInvoice[]).map((row) => {
    const balance = Number(row.total_amount) - Number(row.amount_paid);
    return {
      ...row,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      po_no: poById.get(row.purchase_order_id) ?? null,
      grn_no: grnById.get(row.goods_receiving_id) ?? null,
      balance_due: balance,
      payment_count: paymentCounts.get(row.id) ?? 0,
      is_overdue: !!row.due_date && row.due_date < today && balance > 0 && !["draft", "void"].includes(row.status),
    };
  });
  return paginateRows(filterRows(rows, filters), filters.page, 12);
}

export async function getSupplierInvoiceFilterSuppliers() {
  const supabase = await createClient();
  const { data: invoices } = await supabase.from("supplier_invoices").select("supplier_id").is("deleted_at", null);
  const ids = [...new Set((invoices ?? []).map((row) => row.supplier_id))];
  if (!ids.length) return [];
  const { data } = await supabase.from("suppliers").select("id, name").in("id", ids).order("name");
  return data ?? [];
}

export async function getPostedGrnsForInvoice(supplierId?: string, excludeInvoiceId?: string) {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error("Company profile is required.");
  const supabase = await createClient();
  const [{ data: grns, error }, { data: grnLines }, { data: invoiceLines }, { data: invoices }, { data: suppliers }, { data: pos }, { data: poLines }, { data: items }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("company_id", profile.company_id).eq("status", "posted").is("deleted_at", null),
    supabase.from("goods_receiving_lines").select("*"),
    supabase.from("supplier_invoice_lines").select("*"),
    supabase.from("supplier_invoices").select("id, status, deleted_at"),
    supabase.from("suppliers").select("id, name, payment_terms_days").is("deleted_at", null).order("name"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("purchase_order_lines").select("*"),
    supabase.from("items").select("id, item_code, item_name"),
  ]);
  if (error) throw new Error(error.message);
  const activeInvoiceIds = new Set((invoices ?? []).filter((row) => row.id !== excludeInvoiceId && row.status !== "void" && !row.deleted_at).map((row) => row.id));
  const priorByGrnLine = new Map<string, number>();
  for (const line of (invoiceLines ?? []) as SupplierInvoiceLine[]) {
    if (activeInvoiceIds.has(line.supplier_invoice_id)) priorByGrnLine.set(line.goods_receiving_line_id, (priorByGrnLine.get(line.goods_receiving_line_id) ?? 0) + Number(line.invoice_qty));
  }
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const poLineById = new Map(((poLines ?? []) as PurchaseOrderLine[]).map((row) => [row.id, row]));
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const eligible = ((grns ?? []) as GoodsReceiving[]).filter((grn) => !supplierId || grn.supplier_id === supplierId).map((grn) => {
    const lines = ((grnLines ?? []) as GoodsReceivingLine[]).filter((line) => line.goods_receiving_id === grn.id).map((line) => {
      const poLine = poLineById.get(line.purchase_order_line_id);
      const item = itemById.get(line.item_id);
      const prior = priorByGrnLine.get(line.id) ?? 0;
      return {
        ...line,
        grn_no: grn.grn_no,
        po_no: poById.get(grn.purchase_order_id) ?? "-",
        item_code: item?.item_code ?? null,
        item_name: item?.item_name ?? "Item",
        po_ordered_qty: Number(poLine?.qty_ordered ?? line.ordered_qty),
        po_unit_price: Number(poLine?.unit_price ?? 0),
        previously_invoiced_qty: prior,
        available_qty: Math.max(0, Number(line.received_qty) - prior),
      };
    }).filter((line) => line.available_qty > 0);
    return {
      ...grn,
      supplier_name: supplierById.get(grn.supplier_id)?.name ?? null,
      po_no: poById.get(grn.purchase_order_id) ?? null,
      received_value: lines.reduce((sum, line) => sum + line.available_qty * Number(line.unit_cost), 0),
      lines,
    };
  }).filter((grn) => grn.lines.length).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return { grns: eligible, suppliers: suppliers ?? [] };
}

export async function getSupplierInvoice(id: string) {
  const supabase = await createClient();
  const [{ data: row, error }, { data: payments, error: paymentsError }, { data: lines, error: linesError }, { data: suppliers }, { data: pos }, { data: grns }, { data: items }] = await Promise.all([
    supabase.from("supplier_invoices").select("*").eq("id", id).single(),
    supabase.from("supplier_invoice_payments").select("*").eq("supplier_invoice_id", id).order("created_at", { ascending: true }),
    supabase.from("supplier_invoice_lines").select("*").eq("supplier_invoice_id", id).order("created_at"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("goods_receivings").select("id, grn_no"),
    supabase.from("items").select("id, item_code, item_name"),
  ]);
  if (error) throw new Error(error.message);
  if (paymentsError) throw new Error(paymentsError.message);
  if (linesError) throw new Error(linesError.message);
  const supplierById = new Map((suppliers ?? []).map((item) => [item.id, item.name]));
  const poById = new Map((pos ?? []).map((item) => [item.id, item.po_no]));
  const grnById = new Map((grns ?? []).map((item) => [item.id, item.grn_no]));
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const invoice = row as SupplierInvoice;
  const enrichedLines = ((lines ?? []) as SupplierInvoiceLine[]).map((line) => ({
    ...line,
    item_code: itemById.get(line.item_id)?.item_code ?? null,
    item_name: itemById.get(line.item_id)?.item_name ?? "Item",
    po_no: poById.get(line.purchase_order_id) ?? "-",
    grn_no: grnById.get(line.goods_receiving_id) ?? "-",
  }));
  return {
    invoice: {
      ...invoice,
      supplier_name: supplierById.get(invoice.supplier_id) ?? null,
      po_no: poById.get(invoice.purchase_order_id) ?? null,
      grn_no: grnById.get(invoice.goods_receiving_id) ?? null,
      balance_due: Number(invoice.total_amount) - Number(invoice.amount_paid),
      payment_count: (payments ?? []).length,
    },
    payments: (payments ?? []) as SupplierInvoicePayment[],
    lines: enrichedLines,
    linkedPos: [...new Map(enrichedLines.map((line) => [line.purchase_order_id, { id: line.purchase_order_id, no: line.po_no }])).values()],
    linkedGrns: [...new Map(enrichedLines.map((line) => [line.goods_receiving_id, { id: line.goods_receiving_id, no: line.grn_no }])).values()],
  };
}
