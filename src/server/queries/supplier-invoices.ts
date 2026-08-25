import { createClient } from "@/lib/supabase/server";
import { shiftBusinessDate, todayInKualaLumpur } from "@/lib/business-date";
import { compareTableValues } from "@/lib/table-state";
import type { Database } from "@/types/database";
import { getCurrentProfile } from "@/server/queries/common";
import { getApAgingReport } from "@/server/queries/ap-aging";
import { requireDetailRow } from "@/server/queries/detail";

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
  const today = todayInKualaLumpur();
  const nextWeek = shiftBusinessDate(today, 7);
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
  const pageSize = 12;
  const requestedPage = Math.max(1, Number.isFinite(Number(filters.page)) ? Math.trunc(Number(filters.page)) : 1);
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const supplierId = filters.supplier && filters.supplier !== "all" ? filters.supplier : null;
  const due = filters.due && filters.due !== "all" ? filters.due : null;
  let query = supabase.from("supplier_invoices").select("*", { count: "exact" }).is("deleted_at", null);
  if (status) query = query.eq("status", status as SupplierInvoice["status"]);
  if (supplierId) query = query.eq("supplier_id", supplierId);
  if (due === "no_due") query = query.is("due_date", null);
  if (due === "overdue") query = query.lt("due_date", todayInKualaLumpur());
  if (due === "due_7") {
    const today = todayInKualaLumpur();
    const nextWeek = shiftBusinessDate(today, 7);
    query = query.gte("due_date", today).lte("due_date", nextWeek);
  }

  const search = filters.search?.trim();
  if (search) {
    const term = search.replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
    const { data: supplierMatches, error: supplierSearchError } = await supabase
      .from("suppliers")
      .select("id")
      .ilike("name", "%" + term + "%")
      .limit(50);
    if (supplierSearchError) throw new Error(supplierSearchError.message);
    const supplierIds = (supplierMatches ?? []).map((row) => row.id);
    const clauses = ["invoice_no.ilike.%" + term + "%", "supplier_invoice_no.ilike.%" + term + "%"];
    if (supplierIds.length) clauses.push("supplier_id.in.(" + supplierIds.join(",") + ")");
    query = query.or(clauses.join(","));
  }

  query = query.order(filters.sort === "invoice_date" ? "invoice_date" : "updated_at", { ascending: filters.dir === "asc" }).order("id", { ascending: false }).range((requestedPage - 1) * pageSize, requestedPage * pageSize - 1);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const invoiceRows = (data ?? []) as SupplierInvoice[];
  const invoiceIds = invoiceRows.map((row) => row.id);
  const supplierIds = [...new Set(invoiceRows.map((row) => row.supplier_id).filter(Boolean))];
  const poIds = [...new Set(invoiceRows.map((row) => row.purchase_order_id).filter(Boolean))];
  const grnIds = [...new Set(invoiceRows.map((row) => row.goods_receiving_id).filter(Boolean))];
  const [{ data: payments }, { data: suppliers }, { data: pos }, { data: grns }] = await Promise.all([
    invoiceIds.length ? supabase.from("supplier_invoice_payments").select("supplier_invoice_id").in("supplier_invoice_id", invoiceIds) : Promise.resolve({ data: [] }),
    supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds) : Promise.resolve({ data: [] }),
    poIds.length ? supabase.from("purchase_orders").select("id, po_no").in("id", poIds) : Promise.resolve({ data: [] }),
    grnIds.length ? supabase.from("goods_receivings").select("id, grn_no").in("id", grnIds) : Promise.resolve({ data: [] }),
  ]);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const grnById = new Map((grns ?? []).map((row) => [row.id, row.grn_no]));
  const paymentCounts = new Map<string, number>();
  for (const payment of payments ?? []) paymentCounts.set(payment.supplier_invoice_id, (paymentCounts.get(payment.supplier_invoice_id) ?? 0) + 1);
  const today = todayInKualaLumpur();
  const rows = invoiceRows.map((row) => {
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
  const filteredRows = filterRows(rows, filters);
  return { rows: filteredRows, totalRows: count ?? filteredRows.length, page: requestedPage, pageSize, totalPages: Math.max(Math.ceil((count ?? filteredRows.length) / pageSize), 1) };
}

export async function getSupplierInvoiceSummary() {
  const supabase = await createClient();
  const [report, paidResult] = await Promise.all([
    getApAgingReport({ page: "1" }),
    supabase
      .from("supplier_invoices")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "paid"),
  ]);
  if (paidResult.error) throw new Error(paidResult.error.message);
  return {
    open: report.total_rows,
    paid: paidResult.count ?? 0,
    balance: report.summary.total_outstanding,
  };
}

export async function getSupplierInvoiceFilterSuppliers() {
  const supabase = await createClient();
  const { data: invoices, error: invoicesError } = await supabase.from("supplier_invoices").select("supplier_id").is("deleted_at", null);
  if (invoicesError) throw new Error(invoicesError.message);
  const ids = [...new Set((invoices ?? []).map((row) => row.supplier_id))];
  if (!ids.length) return [];
  const { data, error } = await supabase.from("suppliers").select("id, name").in("id", ids).order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getPostedGrnsForInvoice(supplierId?: string, excludeInvoiceId?: string) {
  const profile = await getCurrentProfile();
  if (!profile?.company_id) throw new Error("Company profile is required.");
  const supabase = await createClient();
  let grnQuery = supabase.from("goods_receivings").select("*").eq("company_id", profile.company_id).eq("status", "posted").is("deleted_at", null);
  if (supplierId) grnQuery = grnQuery.eq("supplier_id", supplierId);
  const [{ data: grns, error }, { data: invoices, error: invoicesError }, { data: suppliers, error: suppliersError }] = await Promise.all([
    grnQuery,
    supabase.from("supplier_invoices").select("id, status, deleted_at").eq("company_id", profile.company_id),
    supabase.from("suppliers").select("id, name, payment_terms_days").is("deleted_at", null).order("name"),
  ]);
  if (error || invoicesError || suppliersError) throw new Error((error ?? invoicesError ?? suppliersError)!.message);
  const receivings = (grns ?? []) as GoodsReceiving[];
  if (receivings.length === 0) return { grns: [], suppliers: suppliers ?? [] };
  const grnIds = receivings.map((grn) => grn.id);
  const poIds = [...new Set(receivings.map((grn) => grn.purchase_order_id))];
  const activeInvoiceIds = new Set((invoices ?? []).filter((row) => row.id !== excludeInvoiceId && row.status !== "void" && !row.deleted_at).map((row) => row.id));
  const [{ data: grnLines, error: grnLinesError }, invoiceLinesResult, { data: pos, error: posError }] = await Promise.all([
    supabase.from("goods_receiving_lines").select("*").in("goods_receiving_id", grnIds),
    activeInvoiceIds.size > 0 ? supabase.from("supplier_invoice_lines").select("*").in("supplier_invoice_id", [...activeInvoiceIds]) : Promise.resolve({ data: [], error: null }),
    supabase.from("purchase_orders").select("id, po_no").in("id", poIds),
  ]);
  if (grnLinesError || invoiceLinesResult.error || posError) throw new Error((grnLinesError ?? invoiceLinesResult.error ?? posError)!.message);
  const invoiceLines = invoiceLinesResult.data;
  const receivingLines = (grnLines ?? []) as GoodsReceivingLine[];
  const poLineIds = [...new Set(receivingLines.map((line) => line.purchase_order_line_id))];
  const itemIds = [...new Set(receivingLines.map((line) => line.item_id))];
  const [poLinesResult, itemsResult] = await Promise.all([
    poLineIds.length > 0 ? supabase.from("purchase_order_lines").select("*").in("id", poLineIds) : Promise.resolve({ data: [], error: null }),
    itemIds.length > 0 ? supabase.from("items").select("id, item_code, item_name").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (poLinesResult.error || itemsResult.error) throw new Error((poLinesResult.error ?? itemsResult.error)!.message);
  const poLines = poLinesResult.data;
  const items = itemsResult.data;
  const priorByGrnLine = new Map<string, number>();
  for (const line of (invoiceLines ?? []) as SupplierInvoiceLine[]) {
    if (activeInvoiceIds.has(line.supplier_invoice_id)) priorByGrnLine.set(line.goods_receiving_line_id, (priorByGrnLine.get(line.goods_receiving_line_id) ?? 0) + Number(line.invoice_qty));
  }
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const poLineById = new Map(((poLines ?? []) as PurchaseOrderLine[]).map((row) => [row.id, row]));
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const eligible = receivings.map((grn) => {
    const lines = receivingLines.filter((line) => line.goods_receiving_id === grn.id).map((line) => {
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
  const [{ data: row, error }, { data: payments, error: paymentsError }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("supplier_invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("supplier_invoice_payments").select("*").eq("supplier_invoice_id", id).order("created_at", { ascending: true }),
    supabase.from("supplier_invoice_lines").select("*").eq("supplier_invoice_id", id).order("created_at"),
  ]);
  if (error) throw new Error(error.message);
  if (paymentsError) throw new Error(paymentsError.message);
  if (linesError) throw new Error(linesError.message);
  const invoice = requireDetailRow(row, "Supplier invoice", id) as SupplierInvoice;
  const invoiceLines = (lines ?? []) as SupplierInvoiceLine[];
  const itemIds = [...new Set(invoiceLines.map((line) => line.item_id))];
  const poIds = [...new Set([invoice.purchase_order_id, ...invoiceLines.map((line) => line.purchase_order_id)].filter((value): value is string => Boolean(value)))];
  const grnIds = [...new Set([invoice.goods_receiving_id, ...invoiceLines.map((line) => line.goods_receiving_id)].filter((value): value is string => Boolean(value)))];
  const [supplierResult, posResult, grnsResult, itemsResult] = await Promise.all([
    supabase.from("suppliers").select("id, name").eq("id", invoice.supplier_id).maybeSingle(),
    poIds.length > 0 ? supabase.from("purchase_orders").select("id, po_no").in("id", poIds) : Promise.resolve({ data: [], error: null }),
    grnIds.length > 0 ? supabase.from("goods_receivings").select("id, grn_no").in("id", grnIds) : Promise.resolve({ data: [], error: null }),
    itemIds.length > 0 ? supabase.from("items").select("id, item_code, item_name").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (supplierResult.error || posResult.error || grnsResult.error || itemsResult.error) throw new Error((supplierResult.error ?? posResult.error ?? grnsResult.error ?? itemsResult.error)!.message);
  const suppliers = supplierResult.data ? [supplierResult.data] : [];
  const pos = posResult.data;
  const grns = grnsResult.data;
  const items = itemsResult.data;
  const supplierById = new Map((suppliers ?? []).map((item) => [item.id, item.name]));
  const poById = new Map((pos ?? []).map((item) => [item.id, item.po_no]));
  const grnById = new Map((grns ?? []).map((item) => [item.id, item.grn_no]));
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const enrichedLines = invoiceLines.map((line) => ({
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
