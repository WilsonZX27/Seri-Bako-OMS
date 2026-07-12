import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";

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
  const [{ data, error }, { data: lines }, { data: grns }, { data: pos }, { data: suppliers }, { data: branches }] = await Promise.all([
    supabase.from("purchase_returns").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("purchase_return_lines").select("*"),
    supabase.from("goods_receivings").select("id, grn_no"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  const grnById = new Map((grns ?? []).map((row) => [row.id, row.grn_no]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const rows = ((data ?? []) as PurchaseReturn[]).map((row) => {
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
  const [{ data: grns, error }, { data: lines }, { data: pos }, { data: suppliers }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("status", "posted").is("deleted_at", null),
    supabase.from("goods_receiving_lines").select("*"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("suppliers").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  return ((grns ?? []) as GoodsReceiving[])
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
  const [{ data: grn, error }, { data: lines, error: linesError }, { data: items }, { data: po }, { data: supplier }, { data: branch }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("id", id).single(),
    supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", id),
    supabase.from("items").select("id, item_code, item_name, base_unit"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  if (grn.status !== "posted") throw new Error("Only posted GRNs can be returned.");
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const poById = new Map((po ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((supplier ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branch ?? []).map((row) => [row.id, row.branch_name]));
  return {
    grn: { ...(grn as GoodsReceiving), po_no: poById.get(grn.purchase_order_id) ?? null, supplier_name: supplierById.get(grn.supplier_id) ?? null, branch_name: grn.branch_id ? branchById.get(grn.branch_id) ?? null : null },
    lines: ((lines ?? []) as GoodsReceivingLine[])
      .map((line) => ({ ...line, returned_qty: Number(line.returned_qty ?? 0), returnable_qty: Math.max(Number(line.received_qty) - Number(line.returned_qty ?? 0), 0), item: itemById.get(line.item_id) }))
      .filter((line) => line.returnable_qty > 0),
  };
}

export async function getPurchaseReturn(id: string) {
  const supabase = await createClient();
  const [{ data: row, error }, { data: lines, error: linesError }, { data: items }, { data: grn }, { data: po }, { data: supplier }, { data: branch }, { data: stocks }] = await Promise.all([
    supabase.from("purchase_returns").select("*").eq("id", id).single(),
    supabase.from("purchase_return_lines").select("*").eq("purchase_return_id", id),
    supabase.from("items").select("id, item_code, item_name, base_unit"),
    supabase.from("goods_receivings").select("id, grn_no"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("stock_transactions").select("id, transaction_no, reference_id, transaction_type, quantity_out, unit_cost, total_cost"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const grnById = new Map((grn ?? []).map((item) => [item.id, item.grn_no]));
  const poById = new Map((po ?? []).map((item) => [item.id, item.po_no]));
  const supplierById = new Map((supplier ?? []).map((item) => [item.id, item.name]));
  const branchById = new Map((branch ?? []).map((item) => [item.id, item.branch_name]));
  return {
    purchaseReturn: {
      ...(row as PurchaseReturn),
      grn_no: grnById.get(row.goods_receiving_id) ?? null,
      po_no: poById.get(row.purchase_order_id) ?? null,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
    },
    lines: ((lines ?? []) as PurchaseReturnLine[]).map((line) => ({ ...line, item: itemById.get(line.item_id) })),
    stockTransactions: stocks ?? [],
  };
}
