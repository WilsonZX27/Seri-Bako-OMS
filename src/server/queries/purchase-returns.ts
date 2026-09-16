import { createClient } from "@/lib/supabase/server";
import type { Database, PurchaseReturnStatus } from "@/types/database";
import { requireReadRows } from "@/server/queries/common";
import { requireDetailRow } from "@/server/queries/detail";

type Filters = Record<string, string | undefined>;
type PurchaseReturn = Database["public"]["Tables"]["purchase_returns"]["Row"];
type PurchaseReturnLine = Database["public"]["Tables"]["purchase_return_lines"]["Row"];
type GoodsReceiving = Database["public"]["Tables"]["goods_receivings"]["Row"];
type GoodsReceivingLine = Database["public"]["Tables"]["goods_receiving_lines"]["Row"];

export type PurchaseReturnRow = PurchaseReturn & {
  grn_no: string | null;
  po_no: string | null;
  supplier_name: string | null;
  branch_name: string | null;
  line_count: number;
  return_total: number;
  return_value: number;
};

export type ReturnableGoodsReceiving = GoodsReceiving & {
  grn_no: string;
  po_no: string | null;
  supplier_name: string | null;
  returnable_qty: number;
};

export type ReturnableGoodsReceivingLine = GoodsReceivingLine & {
  returned_qty: number;
  returnable_qty: number;
  item?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit">;
};

export type PurchaseReturnLineRow = PurchaseReturnLine & {
  item?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit">;
};

export type PurchaseReturnSummary = {
  total: number;
  draft: number;
  posted: number;
  cancelled: number;
  value: number;
};

const PURCHASE_RETURN_PAGE_SIZE = 12;
const PURCHASE_RETURN_SORT_COLUMNS = new Set(["purchase_return_no", "return_date", "status", "supplier_name", "return_total", "return_value", "updated_at"]);

function requestedPage(pageValue?: string) {
  const parsed = Number(pageValue ?? "1");
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 1) : 1;
}

export async function getPurchaseReturns(filters: Filters = {}) {
  const supabase = await createClient();
  const sort = PURCHASE_RETURN_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "updated_at";
  const ascending = filters.dir === "asc";
  const status = filters.status && filters.status !== "all" ? filters.status as PurchaseReturnStatus : null;
  const search = filters.search?.trim().replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
  let query = supabase.from("purchase_returns_list_view").select("*", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (search) query = query.or(["purchase_return_no", "grn_no", "po_no", "supplier_name"].map((column) => `${column}.ilike.%${search}%`).join(","));
  query = query.order(sort, { ascending }).order("id", { ascending: false });
  if (filters.page !== "all") {
    const page = requestedPage(filters.page);
    query = query.range((page - 1) * PURCHASE_RETURN_PAGE_SIZE, page * PURCHASE_RETURN_PAGE_SIZE - 1);
  }
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const rows = requireReadRows(data, "Purchase returns") as PurchaseReturnRow[];
  const totalRows = count ?? rows.length;
  const totalPages = Math.max(Math.ceil(totalRows / PURCHASE_RETURN_PAGE_SIZE), 1);
  const page = filters.page === "all" ? 1 : Math.min(requestedPage(filters.page), totalPages);
  return { rows, totalRows, page, pageSize: PURCHASE_RETURN_PAGE_SIZE, totalPages };
}

export async function getPurchaseReturnSummary(): Promise<PurchaseReturnSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_purchase_return_summary");
  if (error) throw new Error(error.message);
  const summary = requireReadRows(data, "Purchase return summary")[0];
  if (!summary) throw new Error("Purchase return summary returned no data.");
  return {
    total: Number(summary.total),
    draft: Number(summary.draft),
    posted: Number(summary.posted),
    cancelled: Number(summary.cancelled),
    value: Number(summary.value),
  };
}

export async function getPostedGoodsReceivingsForReturn() {
  const supabase = await createClient();
  const { data: grns, error } = await supabase.from("goods_receivings").select("*").eq("status", "posted").is("deleted_at", null);
  if (error) throw new Error(error.message);
  const receivings = requireReadRows(grns, "Posted goods receivings") as GoodsReceiving[];
  if (receivings.length === 0) return [];
  const receivingIds = receivings.map((grn) => grn.id);
  const poIds = [...new Set(receivings.map((grn) => grn.purchase_order_id))];
  const supplierIds = [...new Set(receivings.map((grn) => grn.supplier_id))];
  const [{ data: lines, error: linesError }, { data: pos, error: posError }, { data: suppliers, error: suppliersError }] = await Promise.all([
    supabase.from("goods_receiving_lines").select("*").in("goods_receiving_id", receivingIds),
    supabase.from("purchase_orders").select("id, po_no").in("id", poIds),
    supabase.from("suppliers").select("id, name").in("id", supplierIds),
  ]);
  if (linesError || posError || suppliersError) throw new Error((linesError ?? posError ?? suppliersError)!.message);
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  return receivings
    .map((grn) => {
      const ownLines = ((lines ?? []) as GoodsReceivingLine[]).filter((line) => line.goods_receiving_id === grn.id);
      const returnable_qty = ownLines.reduce((sum, line) => sum + Math.max(Number(line.received_qty) - Number(line.returned_qty ?? 0), 0), 0);
      return { ...grn, po_no: poById.get(grn.purchase_order_id) ?? null, supplier_name: supplierById.get(grn.supplier_id) ?? null, returnable_qty };
    })
    .filter((grn) => grn.returnable_qty > 0)
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export async function getGoodsReceivingForReturn(id: string) {
  const supabase = await createClient();
  const [{ data: grn, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("id", id).single(),
    supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  if (grn.status !== "posted") throw new Error("Only posted GRNs can be returned.");
  const receivingLines = requireReadRows(lines, "Goods receiving lines for return") as GoodsReceivingLine[];
  const itemIds = [...new Set(receivingLines.map((line) => line.item_id))];
  const [itemsResult, poResult, supplierResult, branchResult] = await Promise.all([
    itemIds.length > 0 ? supabase.from("items").select("id, item_code, item_name, base_unit").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("purchase_orders").select("id, po_no").eq("id", grn.purchase_order_id).maybeSingle(),
    supabase.from("suppliers").select("id, name").eq("id", grn.supplier_id).maybeSingle(),
    grn.branch_id ? supabase.from("branches").select("id, branch_name").eq("id", grn.branch_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (itemsResult.error || poResult.error || supplierResult.error || branchResult.error) throw new Error((itemsResult.error ?? poResult.error ?? supplierResult.error ?? branchResult.error)!.message);
  const items = itemsResult.data;
  const po = poResult.data ? [poResult.data] : [];
  const supplier = supplierResult.data ? [supplierResult.data] : [];
  const branch = branchResult.data ? [branchResult.data] : [];
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const poById = new Map((po ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((supplier ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branch ?? []).map((row) => [row.id, row.branch_name]));
  return {
    grn: { ...(grn as GoodsReceiving), po_no: poById.get(grn.purchase_order_id) ?? null, supplier_name: supplierById.get(grn.supplier_id) ?? null, branch_name: grn.branch_id ? branchById.get(grn.branch_id) ?? null : null },
    lines: receivingLines
      .map((line) => ({ ...line, returned_qty: Number(line.returned_qty ?? 0), returnable_qty: Math.max(Number(line.received_qty) - Number(line.returned_qty ?? 0), 0), item: itemById.get(line.item_id) }))
      .filter((line) => line.returnable_qty > 0),
  };
}

export async function getPurchaseReturn(id: string) {
  const supabase = await createClient();
  const [{ data: row, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("purchase_returns").select("*").eq("id", id).maybeSingle(),
    supabase.from("purchase_return_lines").select("*").eq("purchase_return_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const returnRow = requireDetailRow(row, "Purchase return", id) as PurchaseReturn;
  const returnLines = requireReadRows(lines, "Purchase return detail lines") as PurchaseReturnLine[];
  const itemIds = [...new Set(returnLines.map((line) => line.item_id))];
  const [itemsResult, grnResult, poResult, supplierResult, branchResult, stocksResult] = await Promise.all([
    itemIds.length > 0 ? supabase.from("items").select("id, item_code, item_name, base_unit").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
    supabase.from("goods_receivings").select("id, grn_no").eq("id", returnRow.goods_receiving_id).maybeSingle(),
    supabase.from("purchase_orders").select("id, po_no").eq("id", returnRow.purchase_order_id).maybeSingle(),
    supabase.from("suppliers").select("id, name").eq("id", returnRow.supplier_id).maybeSingle(),
    returnRow.branch_id ? supabase.from("branches").select("id, branch_name").eq("id", returnRow.branch_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    supabase.from("stock_transactions").select("id, transaction_no, reference_id, transaction_type, quantity_out, unit_cost, total_cost").eq("reference_id", id),
  ]);
  if (itemsResult.error || grnResult.error || poResult.error || supplierResult.error || branchResult.error || stocksResult.error) throw new Error((itemsResult.error ?? grnResult.error ?? poResult.error ?? supplierResult.error ?? branchResult.error ?? stocksResult.error)!.message);
  const items = itemsResult.data;
  const grn = grnResult.data ? [grnResult.data] : [];
  const po = poResult.data ? [poResult.data] : [];
  const supplier = supplierResult.data ? [supplierResult.data] : [];
  const branch = branchResult.data ? [branchResult.data] : [];
  const stocks = stocksResult.data;
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const grnById = new Map((grn ?? []).map((item) => [item.id, item.grn_no]));
  const poById = new Map((po ?? []).map((item) => [item.id, item.po_no]));
  const supplierById = new Map((supplier ?? []).map((item) => [item.id, item.name]));
  const branchById = new Map((branch ?? []).map((item) => [item.id, item.branch_name]));
  return {
    purchaseReturn: {
      ...returnRow,
      grn_no: grnById.get(returnRow.goods_receiving_id) ?? null,
      po_no: poById.get(returnRow.purchase_order_id) ?? null,
      supplier_name: supplierById.get(returnRow.supplier_id) ?? null,
      branch_name: returnRow.branch_id ? branchById.get(returnRow.branch_id) ?? null : null,
    },
    lines: returnLines.map((line) => ({ ...line, item: itemById.get(line.item_id) })),
    stockTransactions: stocks ?? [],
  };
}
