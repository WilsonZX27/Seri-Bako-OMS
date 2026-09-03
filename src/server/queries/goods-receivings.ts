import {
  isMockMode,
  mockBranches,
  mockGoodsReceivingLines,
  mockGoodsReceivings,
  mockItems,
  mockProfile,
  mockPurchaseOrderLines,
  mockPurchaseOrders,
  mockSuppliers,
} from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
import { normalizeUom } from "@/lib/uom";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { requireDetailRow } from "@/server/queries/detail";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type GoodsReceiving = Database["public"]["Tables"]["goods_receivings"]["Row"];
type GoodsReceivingLine = Database["public"]["Tables"]["goods_receiving_lines"]["Row"];
type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderLine = Database["public"]["Tables"]["purchase_order_lines"]["Row"];

export type GoodsReceivingRow = GoodsReceiving & {
  workflow_status: "draft"|"awaiting_finance"|"closed"|"cancelled";
  po_no: string | null;
  supplier_name: string | null;
  branch_name: string | null;
  received_by_name: string | null;
  received_total: number;
  rejected_total: number;
  line_count: number;
};

export type GoodsReceivingLineRow = GoodsReceivingLine & {
  item?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit">;
};

export type EligiblePurchaseOrder = PurchaseOrder & {
  supplier_name: string | null;
  pending_lines: number;
  pending_qty: number;
};

export type PurchaseOrderReceivingLine = PurchaseOrderLine & {
  item?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "item_image_url">;
  conversion_to_base_uom: number | null;
  previously_received_qty: number;
  pending_qty: number;
};

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const today = todayInKualaLumpur();
  const date = filters.date === "today" ? today : null;
  const sort = filters.sort ?? String(defaultSort);
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
      const matchesStatus = status ? row.status === status : true;
      const matchesDate = date ? row.received_date === date : true;
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

function hydrateGrn(row: GoodsReceiving, lines: GoodsReceivingLine[]): GoodsReceivingRow {
  const po = mockPurchaseOrders.find((item) => item.id === row.purchase_order_id);
  const supplier = mockSuppliers.find((item) => item.id === row.supplier_id);
  const branch = mockBranches.find((item) => item.id === row.branch_id);
  const ownLines = lines.filter((line) => line.goods_receiving_id === row.id);
  return {
    ...row,
    workflow_status: row.status === "posted" ? row.finance_closed_at ? "closed" : "awaiting_finance" : row.status,
    po_no: po?.po_no ?? null,
    supplier_name: supplier?.name ?? null,
    branch_name: branch?.branch_name ?? null,
    received_by_name: row.received_by ? mockProfile.full_name : null,
    received_total: ownLines.reduce((sum, line) => sum + line.received_qty, 0),
    rejected_total: ownLines.reduce((sum, line) => sum + line.rejected_qty, 0),
    line_count: ownLines.length,
  };
}

function toReceivingLine(line: PurchaseOrderLine): PurchaseOrderReceivingLine {
  const item = mockItems.find((row) => row.id === line.item_id);
  return {
    ...line,
    item,
    conversion_to_base_uom: item && normalizeUom(item.base_unit) === normalizeUom(line.uom) ? Number(item.conversion_to_base_unit ?? 1) : null,
    previously_received_qty: line.qty_received,
    pending_qty: Math.max(line.qty_ordered - line.qty_received - line.qty_cancelled, 0),
  };
}

export async function getGoodsReceivings(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockGoodsReceivings.map((row) => hydrateGrn(row, mockGoodsReceivingLines));
    return paginateRows(filterRows(rows, filters, ["grn_no", "status", "po_no", "supplier_name", "remarks"], "updated_at"), filters.page, 12);
  }

  const supabase = await createClient();
  const pageSize = 12;
  const page = Math.max(1, Number.isFinite(Number(filters.page)) ? Math.trunc(Number(filters.page)) : 1);
  let query = supabase.from("goods_receivings").select("*", { count: "exact" }).is("deleted_at", null);
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  if (status === "closed") query = query.eq("status", "posted").not("finance_closed_at", "is", null);
  else if (status === "awaiting_finance") query = query.eq("status", "posted").is("finance_closed_at", null);
  else if (status) query = query.eq("status", status as GoodsReceiving["status"]);
    if (filters.date === "today") query = query.eq("received_date", todayInKualaLumpur());
  const search = filters.search?.trim();
  if (search) {
    const term = search.replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
    query = query.or(`grn_no.ilike.%${term}%,remarks.ilike.%${term}%`);
  }
  const { data, error, count } = await query.order(filters.sort === "received_date" ? "received_date" : "updated_at", { ascending: filters.dir === "asc" }).order("id", { ascending: false }).range((page - 1) * pageSize, page * pageSize - 1);
  if (error) throw new Error(error.message);
  if (!data || count === null) throw new Error("Goods receiving list returned no data.");
  const ids = data.map((row) => row.id);
  const branchIds = [...new Set(data.map((row) => row.branch_id).filter((id): id is string => Boolean(id)))];
  const poIds = [...new Set(data.map((row) => row.purchase_order_id).filter((id): id is string => Boolean(id)))];
  const supplierIds = [...new Set(data.map((row) => row.supplier_id).filter((id): id is string => Boolean(id)))];
  const [{ data: lines, error: linesError }, { data: pos, error: posError }, { data: suppliers, error: suppliersError }, { data: branches, error: branchesError }] = await Promise.all([
    ids.length ? supabase.from("goods_receiving_lines").select("goods_receiving_id, received_qty, rejected_qty").in("goods_receiving_id", ids) : Promise.resolve({ data: [], error: null }),
    poIds.length ? supabase.from("purchase_orders").select("id, po_no").in("id", poIds) : Promise.resolve({ data: [], error: null }),
    supplierIds.length ? supabase.from("suppliers").select("id, name").in("id", supplierIds) : Promise.resolve({ data: [], error: null }),
    branchIds.length ? supabase.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError || posError || suppliersError || branchesError) {
    throw new Error((linesError ?? posError ?? suppliersError ?? branchesError)!.message);
  }
  if (!lines || (poIds.length > 0 && !pos) || (supplierIds.length > 0 && !suppliers) || (branchIds.length > 0 && !branches)) {
    throw new Error("Goods receiving related data returned no data.");
  }
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const rows = (data as GoodsReceiving[]).map((row) => {
    const ownLines = (lines as GoodsReceivingLine[]).filter((line) => line.goods_receiving_id === row.id);
    return {
      ...row,
      workflow_status: row.status === "posted" ? row.finance_closed_at ? "closed" : "awaiting_finance" : row.status,
      po_no: poById.get(row.purchase_order_id) ?? null,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
      received_by_name: row.received_by,
      received_total: ownLines.reduce((sum, line) => sum + line.received_qty, 0),
      rejected_total: ownLines.reduce((sum, line) => sum + line.rejected_qty, 0),
      line_count: ownLines.length,
    };
  });
  const filteredRows = filterRows(rows, { ...filters, status: undefined }, ["grn_no", "status", "po_no", "supplier_name", "remarks"], "updated_at");
  return { rows: filteredRows, page, pageSize, totalRows: count, totalPages: Math.max(Math.ceil(count / pageSize), 1) };
}

export async function getGoodsReceivingSummary() {
  if (isMockMode()) {
    const rows = mockGoodsReceivings;
    return {
      total: rows.length,
      draft: rows.filter((row) => row.status === "draft").length,
      posted: rows.filter((row) => row.status === "posted").length,
      closed: rows.filter((row) => row.status === "posted" && row.finance_closed_at).length,
      awaitingFinance: rows.filter((row) => row.status === "posted" && !row.finance_closed_at).length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
      receivedTotal: mockGoodsReceivingLines.reduce((sum, line) => sum + line.received_qty, 0),
      rejectedTotal: mockGoodsReceivingLines.reduce((sum, line) => sum + line.rejected_qty, 0),
    };
  }
  const supabase = await createClient();
  const [{ data, error },closedResult,awaitingResult] = await Promise.all([
    supabase.rpc("get_goods_receiving_summary"),
    supabase.from("goods_receivings").select("id",{count:"exact",head:true}).eq("status","posted").not("finance_closed_at","is",null).is("deleted_at",null),
    supabase.from("goods_receivings").select("id",{count:"exact",head:true}).eq("status","posted").is("finance_closed_at",null).is("deleted_at",null),
  ]);
  if (error) throw new Error(error.message);
  if (closedResult.error) throw new Error(closedResult.error.message);
  if (awaitingResult.error) throw new Error(awaitingResult.error.message);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Goods receiving summary returned no data.");
  const summary = data as Record<string, unknown>;
  const requiredFields = ["total", "draft", "posted", "cancelled", "received_total", "rejected_total"];
  if (requiredFields.some((field) => typeof summary[field] !== "number" || !Number.isFinite(summary[field] as number))) {
    throw new Error("Goods receiving summary returned an incomplete result.");
  }
  return {
    total: summary.total as number,
    draft: summary.draft as number,
    posted: summary.posted as number,
    closed: closedResult.count??0,
    awaitingFinance: awaitingResult.count??0,
    cancelled: summary.cancelled as number,
    receivedTotal: summary.received_total as number,
    rejectedTotal: summary.rejected_total as number,
  };
}

export async function getGoodsReceiving(id: string) {
  if (isMockMode()) {
    const row = requireDetailRow(mockGoodsReceivings.find((item) => item.id === id), "Goods receiving", id);
    const lines = mockGoodsReceivingLines
      .filter((line) => line.goods_receiving_id === id)
      .map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { receiving: hydrateGrn(row, mockGoodsReceivingLines), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("id", id).maybeSingle(),
    supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const receiving = requireDetailRow(data, "Goods receiving", id) as GoodsReceiving;
  if (!lines) throw new Error("Goods receiving detail lines returned no data.");
  const itemIds = [...new Set(lines.map((line) => line.item_id))];
  const [
    { data: items, error: itemsError },
    { data: pos, error: posError },
    { data: suppliers, error: suppliersError },
    { data: branches, error: branchesError },
  ] = await Promise.all([
    itemIds.length
      ? supabase.from("items").select("id, item_code, item_name, base_unit").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("purchase_orders").select("id, po_no").eq("id", receiving.purchase_order_id),
    supabase.from("suppliers").select("id, name").eq("id", receiving.supplier_id),
    receiving.branch_id
      ? supabase.from("branches").select("id, branch_name").eq("id", receiving.branch_id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const relatedError of [itemsError, posError, suppliersError, branchesError]) {
    if (relatedError) throw new Error(relatedError.message);
  }
  if ((itemIds.length > 0 && !items) || !pos || !suppliers || (receiving.branch_id && !branches)) {
    throw new Error("Goods receiving detail related data returned no data.");
  }
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  return {
    receiving: {
      ...receiving,
      po_no: poById.get(receiving.purchase_order_id) ?? null,
      supplier_name: supplierById.get(receiving.supplier_id) ?? null,
      branch_name: receiving.branch_id ? branchById.get(receiving.branch_id) ?? null : null,
      received_by_name: receiving.received_by,
      received_total: (lines as GoodsReceivingLine[]).reduce((sum, line) => sum + line.received_qty, 0),
      rejected_total: (lines as GoodsReceivingLine[]).reduce((sum, line) => sum + line.rejected_qty, 0),
      line_count: lines.length,
    },
    lines: (lines as GoodsReceivingLine[]).map((line) => ({ ...line, item: itemById.get(line.item_id) })),
  };
}

export async function getEligiblePurchaseOrders() {
  if (isMockMode()) {
    return mockPurchaseOrders
      .filter((order) => ["approved", "sent", "partial_received"].includes(order.status))
      .map((order) => {
        const lines = mockPurchaseOrderLines.filter((line) => line.purchase_order_id === order.id);
        const supplier = mockSuppliers.find((row) => row.id === order.supplier_id);
        const pendingLines = lines.filter((line) => line.qty_ordered - line.qty_received - line.qty_cancelled > 0);
        return {
          ...order,
          supplier_name: supplier?.name ?? null,
          pending_lines: pendingLines.length,
          pending_qty: pendingLines.reduce((sum, line) => sum + line.qty_ordered - line.qty_received - line.qty_cancelled, 0),
        };
      });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .in("status", ["approved", "sent", "partial_received"])
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Eligible purchase orders returned no data.");
  if (!data.length) return [];
  const purchaseOrderIds = data.map((order) => order.id);
  const supplierIds = [...new Set(data.map((order) => order.supplier_id))];
  const [{ data: lines, error: linesError }, { data: suppliers, error: suppliersError }] = await Promise.all([
    supabase.from("purchase_order_lines").select("*").in("purchase_order_id", purchaseOrderIds),
    supabase.from("suppliers").select("id, name").in("id", supplierIds),
  ]);
  if (linesError) throw new Error(linesError.message);
  if (suppliersError) throw new Error(suppliersError.message);
  if (!lines || !suppliers) throw new Error("Eligible purchase order related data returned no data.");
  const supplierById = new Map(suppliers.map((row) => [row.id, row.name]));
  return (data as PurchaseOrder[]).map((order) => {
    const ownLines = (lines as PurchaseOrderLine[]).filter((line) => line.purchase_order_id === order.id);
    const pendingLines = ownLines.filter((line) => line.qty_ordered - line.qty_received - line.qty_cancelled > 0);
    return {
      ...order,
      supplier_name: supplierById.get(order.supplier_id) ?? null,
      pending_lines: pendingLines.length,
      pending_qty: pendingLines.reduce((sum, line) => sum + line.qty_ordered - line.qty_received - line.qty_cancelled, 0),
    };
  });
}

export async function getPurchaseOrderForReceiving(id: string) {
  if (isMockMode()) {
    const order = mockPurchaseOrders.find((row) => row.id === id);
    if (!order) return null;
    const supplier = mockSuppliers.find((row) => row.id === order.supplier_id);
    const lines = mockPurchaseOrderLines.filter((line) => line.purchase_order_id === id).map(toReceivingLine);
    return { order: { ...order, supplier_name: supplier?.name ?? null }, lines };
  }
  const supabase = await createClient();
  const [{ data: order, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("purchase_order_lines").select("*").eq("purchase_order_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  if (!order || !lines) throw new Error("Purchase order for receiving returned no data.");
  const itemIds = [...new Set(lines.map((line) => line.item_id))];
  const [{ data: items, error: itemsError }, { data: supplier, error: supplierError }, { data: supplierItems, error: supplierItemsError }] = await Promise.all([
    itemIds.length
      ? supabase.from("items").select("id, item_code, item_name, base_unit, item_image_url").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("suppliers").select("id, name").eq("id", order.supplier_id).maybeSingle(),
    itemIds.length
      ? supabase.from("supplier_items").select("item_id, purchase_uom, conversion_to_base_uom").eq("supplier_id", order.supplier_id).in("item_id", itemIds).eq("status", "active").is("deleted_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (supplierError) throw new Error(supplierError.message);
  if (supplierItemsError) throw new Error(supplierItemsError.message);
  if ((itemIds.length > 0 && !items) || !supplier) throw new Error("Purchase order receiving related data returned no data.");
  const itemById = new Map(items.map((row) => [row.id, row]));
  const supplierItemByItemId = new Map((supplierItems ?? []).map((row) => [`${row.item_id}|${normalizeUom(row.purchase_uom)}`, row]));
  return {
    order: { ...(order as PurchaseOrder), supplier_name: supplier?.name ?? null },
    lines: (lines as PurchaseOrderLine[]).map((line) => ({
      ...line,
      item: itemById.get(line.item_id),
      conversion_to_base_uom: supplierItemByItemId.get(`${line.item_id}|${normalizeUom(line.uom)}`)?.conversion_to_base_uom
        ?? (normalizeUom(itemById.get(line.item_id)?.base_unit) === normalizeUom(line.uom) ? 1 : null),
      previously_received_qty: line.qty_received,
      pending_qty: Math.max(line.qty_ordered - line.qty_received - line.qty_cancelled, 0),
    })),
  };
}
