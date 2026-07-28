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
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type GoodsReceiving = Database["public"]["Tables"]["goods_receivings"]["Row"];
type GoodsReceivingLine = Database["public"]["Tables"]["goods_receiving_lines"]["Row"];
type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderLine = Database["public"]["Tables"]["purchase_order_lines"]["Row"];

export type GoodsReceivingRow = GoodsReceiving & {
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
  previously_received_qty: number;
  pending_qty: number;
};

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const today = new Date().toISOString().slice(0, 10);
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
  const [{ data, error }, { data: lines, error: linesError }, { data: pos }, { data: suppliers }, { data: branches }] = await Promise.all([
    supabase.from("goods_receivings").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("goods_receiving_lines").select("*"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const rows = ((data ?? []) as GoodsReceiving[]).map((row) => {
    const ownLines = ((lines ?? []) as GoodsReceivingLine[]).filter((line) => line.goods_receiving_id === row.id);
    return {
      ...row,
      po_no: poById.get(row.purchase_order_id) ?? null,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
      received_by_name: row.received_by,
      received_total: ownLines.reduce((sum, line) => sum + line.received_qty, 0),
      rejected_total: ownLines.reduce((sum, line) => sum + line.rejected_qty, 0),
      line_count: ownLines.length,
    };
  });
  return paginateRows(filterRows(rows, filters, ["grn_no", "status", "po_no", "supplier_name", "remarks"], "updated_at"), filters.page, 12);
}

export async function getGoodsReceiving(id: string) {
  if (isMockMode()) {
    const row = mockGoodsReceivings.find((item) => item.id === id);
    if (!row) throw new Error("Mock goods receiving not found");
    const lines = mockGoodsReceivingLines
      .filter((line) => line.goods_receiving_id === id)
      .map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { receiving: hydrateGrn(row, mockGoodsReceivingLines), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: items }, { data: pos }, { data: suppliers }, { data: branches }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("id", id).single(),
    supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", id),
    supabase.from("items").select("id, item_code, item_name, base_unit"),
    supabase.from("purchase_orders").select("id, po_no"),
    supabase.from("suppliers").select("id, name"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const poById = new Map((pos ?? []).map((row) => [row.id, row.po_no]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const receiving = data as GoodsReceiving;
  return {
    receiving: {
      ...receiving,
      po_no: poById.get(receiving.purchase_order_id) ?? null,
      supplier_name: supplierById.get(receiving.supplier_id) ?? null,
      branch_name: receiving.branch_id ? branchById.get(receiving.branch_id) ?? null : null,
      received_by_name: receiving.received_by,
      received_total: ((lines ?? []) as GoodsReceivingLine[]).reduce((sum, line) => sum + line.received_qty, 0),
      rejected_total: ((lines ?? []) as GoodsReceivingLine[]).reduce((sum, line) => sum + line.rejected_qty, 0),
      line_count: (lines ?? []).length,
    },
    lines: ((lines ?? []) as GoodsReceivingLine[]).map((line) => ({ ...line, item: itemById.get(line.item_id) })),
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
  const [{ data, error }, { data: lines, error: linesError }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_orders").select("*").in("status", ["approved", "sent", "partial_received"]).is("deleted_at", null),
    supabase.from("purchase_order_lines").select("*"),
    supabase.from("suppliers").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  return ((data ?? []) as PurchaseOrder[]).map((order) => {
    const ownLines = ((lines ?? []) as PurchaseOrderLine[]).filter((line) => line.purchase_order_id === order.id);
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
  const [{ data: order, error }, { data: lines, error: linesError }, { data: items }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("purchase_order_lines").select("*").eq("purchase_order_id", id),
    supabase.from("items").select("id, item_code, item_name, base_unit, item_image_url"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const { data: supplier } = await supabase.from("suppliers").select("id, name").eq("id", order.supplier_id).maybeSingle();
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  return {
    order: { ...(order as PurchaseOrder), supplier_name: supplier?.name ?? null },
    lines: ((lines ?? []) as PurchaseOrderLine[]).map((line) => ({
      ...line,
      item: itemById.get(line.item_id),
      previously_received_qty: line.qty_received,
      pending_qty: Math.max(line.qty_ordered - line.qty_received - line.qty_cancelled, 0),
    })),
  };
}
