import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type SupplierInvoice = Database["public"]["Tables"]["supplier_invoices"]["Row"];
type SupplierInvoicePayment = Database["public"]["Tables"]["supplier_invoice_payments"]["Row"];
type GoodsReceiving = Database["public"]["Tables"]["goods_receivings"]["Row"];
type GoodsReceivingLine = Database["public"]["Tables"]["goods_receiving_lines"]["Row"];

export type SupplierInvoiceRow = SupplierInvoice & { supplier_name: string | null; po_no: string | null; grn_no: string | null; balance_due: number; payment_count: number };
export type PostedGrnForInvoice = GoodsReceiving & { supplier_name: string | null; po_no: string | null; received_value: number };

function filterRows(rows: SupplierInvoiceRow[], filters: Filters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const sort = filters.sort ?? "updated_at";
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const blob = [row.invoice_no, row.supplier_invoice_no, row.supplier_name, row.po_no, row.grn_no, row.status].join(" ").toLowerCase();
      return (!search || blob.includes(search)) && (!status || row.status === status);
    })
    .sort((a, b) => compareTableValues(a[sort as keyof SupplierInvoiceRow], b[sort as keyof SupplierInvoiceRow], dir));
}

export async function getSupplierInvoices(filters: Filters = {}) {
  const supabase = await createClient();
  const [{ data, error }, { data: payments }, { data: suppliers }, { data: pos }, { data: grns }] = await Promise.all([
    supabase.from("supplier_invoices").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("supplier_invoice_payments").select("*"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("goods_receivings").select("id, grn_no"),
  ]);
  if (error) throw new Error(error.message);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const grnById = new Map((grns ?? []).map((row) => [row.id, row.grn_no]));
  const rows = ((data ?? []) as SupplierInvoice[]).map((row) => {
    const ownPayments = ((payments ?? []) as SupplierInvoicePayment[]).filter((payment) => payment.supplier_invoice_id === row.id);
    return { ...row, supplier_name: supplierById.get(row.supplier_id) ?? null, po_no: poById.get(row.purchase_order_id) ?? null, grn_no: grnById.get(row.goods_receiving_id) ?? null, balance_due: Number(row.total_amount) - Number(row.amount_paid), payment_count: ownPayments.length };
  });
  return paginateRows(filterRows(rows, filters), filters.page, 12);
}

export async function getPostedGrnsForInvoice() {
  const supabase = await createClient();
  const [{ data: grns, error }, { data: lines }, { data: suppliers }, { data: pos }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("status", "posted").is("deleted_at", null),
    supabase.from("goods_receiving_lines").select("*"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("purchase_orders").select("id, po_no"),
  ]);
  if (error) throw new Error(error.message);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  return ((grns ?? []) as GoodsReceiving[]).map((grn) => {
    const ownLines = ((lines ?? []) as GoodsReceivingLine[]).filter((line) => line.goods_receiving_id === grn.id);
    return { ...grn, supplier_name: supplierById.get(grn.supplier_id) ?? null, po_no: poById.get(grn.purchase_order_id) ?? null, received_value: ownLines.reduce((sum, line) => sum + Number(line.received_qty) * Number(line.unit_cost), 0) };
  }).sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getSupplierInvoice(id: string) {
  const supabase = await createClient();
  const [{ data: row, error }, { data: payments, error: paymentsError }, { data: suppliers }, { data: pos }, { data: grns }] = await Promise.all([
    supabase.from("supplier_invoices").select("*").eq("id", id).single(),
    supabase.from("supplier_invoice_payments").select("*").eq("supplier_invoice_id", id).order("created_at", { ascending: true }),
    supabase.from("suppliers").select("id, name"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("goods_receivings").select("id, grn_no"),
  ]);
  if (error) throw new Error(error.message);
  if (paymentsError) throw new Error(paymentsError.message);
  const supplierById = new Map((suppliers ?? []).map((item) => [item.id, item.name]));
  const poById = new Map((pos ?? []).map((item) => [item.id, item.po_no]));
  const grnById = new Map((grns ?? []).map((item) => [item.id, item.grn_no]));
  const invoice = row as SupplierInvoice;
  return {
    invoice: { ...invoice, supplier_name: supplierById.get(invoice.supplier_id) ?? null, po_no: poById.get(invoice.purchase_order_id) ?? null, grn_no: grnById.get(invoice.goods_receiving_id) ?? null, balance_due: Number(invoice.total_amount) - Number(invoice.amount_paid), payment_count: (payments ?? []).length },
    payments: (payments ?? []) as SupplierInvoicePayment[],
  };
}
