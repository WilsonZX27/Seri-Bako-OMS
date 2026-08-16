import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";
import { requireReadRows } from "@/server/queries/common";

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

function filterRows(rows: PurchaseReturnRow[], filters: Filters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const sort = filters.sort ?? "updated_at";
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const blob = [row.purchase_return_no, row.grn_no, row.po_no, row.supplier_name, row.status].join(" ").toLowerCase();
      return (!search || blob.includes(search)) && (!status || row.status === status);
    })
    .sort((a, b) => compareTableValues(a[sort as keyof PurchaseReturnRow], b[sort as keyof PurchaseReturnRow], dir));
}

export async function getPurchaseReturns(filters: Filters = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_returns").select("*").is("deleted_at", null).order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  const returns = requireReadRows(data, "Purchase returns") as PurchaseReturn[];
  if (returns.length === 0) return paginateRows([], filters.page, 12);
  const returnIds = returns.map((row) => row.id);
  const grnIds = [...new Set(returns.map((row) => row.goods_receiving_id))];
  const poIds = [...new Set(returns.map((row) => row.purchase_order_id))];
  const supplierIds = [...new Set(returns.map((row) => row.supplier_id))];
  const branchIds = [...new Set(returns.map((row) => row.branch_id).filter((id): id is string => Boolean(id)))];
  const [{ data: lines, error: linesError }, { data: grns, error: grnsError }, { data: pos, error: posError }, { data: suppliers, error: suppliersError }, branchResult] = await Promise.all([
    supabase.from("purchase_return_lines").select("*").in("purchase_return_id", returnIds),
    supabase.from("goods_receivings").select("id, grn_no").in("id", grnIds),
    supabase.from("purchase_orders").select("id, po_no").in("id", poIds),
    supabase.from("suppliers").select("id, name").in("id", supplierIds),
    branchIds.length > 0 ? supabase.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError || grnsError || posError || suppliersError || branchResult.error) throw new Error((linesError ?? grnsError ?? posError ?? suppliersError ?? branchResult.error)!.message);
  const branches = branchResult.data;
  const grnById = new Map((grns ?? []).map((row) => [row.id, row.grn_no]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const rows = returns.map((row) => {
    const ownLines = ((lines ?? []) as PurchaseReturnLine[]).filter((line) => line.purchase_return_id === row.id);
    return {
      ...row,
      grn_no: grnById.get(row.goods_receiving_id) ?? null,
      po_no: poById.get(row.purchase_order_id) ?? null,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
      line_count: ownLines.length,
      return_total: ownLines.reduce((sum, line) => sum + Number(line.return_qty), 0),
      return_value: ownLines.reduce((sum, line) => sum + Number(line.return_qty) * Number(line.unit_cost), 0),
    };
  });
  return paginateRows(filterRows(rows, filters), filters.page, 12);
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
    supabase.from("purchase_returns").select("*").eq("id", id).single(),
    supabase.from("purchase_return_lines").select("*").eq("purchase_return_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const returnRow = row as PurchaseReturn;
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
      grn_no: grnById.get(row.goods_receiving_id) ?? null,
      po_no: poById.get(row.purchase_order_id) ?? null,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
    },
    lines: returnLines.map((line) => ({ ...line, item: itemById.get(line.item_id) })),
    stockTransactions: stocks ?? [],
  };
}
