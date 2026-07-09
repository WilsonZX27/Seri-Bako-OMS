import {
  isMockMode,
  mockBranches,
  mockItems,
  mockLocations,
  mockProfile,
  mockPurchaseOrderLines,
  mockPurchaseOrders,
  mockPurchaseRequestLines,
  mockPurchaseRequests,
  mockSuppliers,
} from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type PurchaseRequest = Database["public"]["Tables"]["purchase_requests"]["Row"];
type PurchaseRequestLine = Database["public"]["Tables"]["purchase_request_lines"]["Row"];
type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderLine = Database["public"]["Tables"]["purchase_order_lines"]["Row"];

export type PurchaseRequestRow = PurchaseRequest & {
  requested_by_name: string | null;
  branch_name: string | null;
  location_name: string | null;
  line_count: number;
  estimated_total: number;
};

export type PurchaseOrderRow = PurchaseOrder & {
  supplier_name: string | null;
  line_count: number;
  order_total: number;
};

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const step = filters.step && filters.step !== "all" ? filters.step : null;
  const priority = filters.priority && filters.priority !== "all" ? filters.priority : null;
  const sort = filters.sort ?? String(defaultSort);
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
      const statusGroup =
        status === "awaiting_delivery" ? ["approved", "sent"]
        : status === "receiving" ? ["partial_received"]
        : status === "completed" ? ["received", "closed"]
        : status === "admin_review" ? ["admin_review", "submitted"]
        : status === "pending_approval" ? ["pending_approval"]
        : status === "in_review" ? ["submitted", "admin_review", "purchasing_review", "pending_approval"]
        : status === "rejected" ? ["rejected", "cancelled"]
        : status ? [status] : [];
      const matchesStatus = statusGroup.length ? statusGroup.includes(String(row.status)) : true;
      const matchesStep = step ? String(row.status) === step : true;
      const priorityGroup = priority === "urgent" ? ["urgent", "critical"] : priority ? [priority] : [];
      const matchesPriority = priorityGroup.length ? priorityGroup.includes(String(row.priority)) : true;
      return matchesSearch && matchesStatus && matchesStep && matchesPriority;
    })
    .sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

function hydratePr(row: PurchaseRequest, lines: PurchaseRequestLine[]): PurchaseRequestRow {
  const branch = mockBranches.find((item) => item.id === row.branch_id);
  const location = mockLocations.find((item) => item.id === row.location_id);
  const ownLines = lines.filter((line) => line.purchase_request_id === row.id);
  return {
    ...row,
    requested_by_name: row.requested_by ? mockProfile.full_name : null,
    branch_name: branch?.branch_name ?? null,
    location_name: location?.location_name ?? null,
    line_count: ownLines.length,
    estimated_total: ownLines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0),
  };
}

function hydratePo(row: PurchaseOrder, lines: PurchaseOrderLine[]): PurchaseOrderRow {
  const supplier = mockSuppliers.find((item) => item.id === row.supplier_id);
  const ownLines = lines.filter((line) => line.purchase_order_id === row.id);
  return {
    ...row,
    supplier_name: supplier?.name ?? null,
    line_count: ownLines.length,
    order_total: ownLines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0),
  };
}

export async function getPurchaseRequests(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockPurchaseRequests.map((row) => hydratePr(row, mockPurchaseRequestLines));
    return paginateRows(filterRows(rows, filters, ["request_no", "status", "priority", "branch_name", "location_name", "remarks"], "updated_at"), filters.page, 12);
  }

  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: branches }, { data: locations }] = await Promise.all([
    supabase.from("purchase_requests").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("purchase_request_lines").select("*"),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const locationById = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const rows = ((data ?? []) as PurchaseRequest[]).map((row) => {
    const ownLines = ((lines ?? []) as PurchaseRequestLine[]).filter((line) => line.purchase_request_id === row.id);
    return {
      ...row,
      requested_by_name: row.requested_by,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
      location_name: row.location_id ? locationById.get(row.location_id) ?? null : null,
      line_count: ownLines.length,
      estimated_total: ownLines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0),
    };
  });
  return paginateRows(filterRows(rows, filters, ["request_no", "status", "priority", "branch_name", "location_name", "remarks"], "updated_at"), filters.page, 12);
}

export async function getPurchaseRequest(id: string) {
  if (isMockMode()) {
    const row = mockPurchaseRequests.find((item) => item.id === id);
    if (!row) throw new Error("Mock purchase request not found");
    const lines = mockPurchaseRequestLines.filter((line) => line.purchase_request_id === id).map((line) => {
      const item = mockItems.find((itemRow) => itemRow.id === line.item_id);
      const supplier = mockSuppliers.find((supplierRow) => supplierRow.id === line.suggested_supplier_id);
      return { ...line, item, supplier_name: supplier?.name ?? null };
    });
    return { request: hydratePr(row, mockPurchaseRequestLines), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("purchase_requests").select("*").eq("id", id).single(),
    supabase.from("purchase_request_lines").select("*").eq("purchase_request_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  return { request: data as PurchaseRequest, lines: (lines ?? []) as PurchaseRequestLine[] };
}

export async function getPurchaseOrdersForRequest(id: string) {
  if (isMockMode()) {
    return mockPurchaseOrders.filter((order) => order.purchase_request_id === id).map((order) => hydratePo(order, mockPurchaseOrderLines));
  }

  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("purchase_request_id", id).is("deleted_at", null).order("created_at", { ascending: true }),
    supabase.from("purchase_order_lines").select("*"),
    supabase.from("suppliers").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  return ((data ?? []) as PurchaseOrder[]).map((row) => {
    const ownLines = ((lines ?? []) as PurchaseOrderLine[]).filter((line) => line.purchase_order_id === row.id);
    return {
      ...row,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      line_count: ownLines.length,
      order_total: ownLines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0),
    };
  });
}

export async function getPurchaseOrders(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockPurchaseOrders.map((row) => hydratePo(row, mockPurchaseOrderLines));
    return paginateRows(filterRows(rows, filters, ["po_no", "status", "approval_status", "supplier_name", "remarks"], "updated_at"), filters.page, 12);
  }

  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: suppliers }] = await Promise.all([
    supabase.from("purchase_orders").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("purchase_order_lines").select("*"),
    supabase.from("suppliers").select("id, name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const rows = ((data ?? []) as PurchaseOrder[]).map((row) => {
    const ownLines = ((lines ?? []) as PurchaseOrderLine[]).filter((line) => line.purchase_order_id === row.id);
    return {
      ...row,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      line_count: ownLines.length,
      order_total: ownLines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0),
    };
  });
  return paginateRows(filterRows(rows, filters, ["po_no", "status", "approval_status", "supplier_name", "remarks"], "updated_at"), filters.page, 12);
}

export async function getPurchaseOrder(id: string) {
  if (isMockMode()) {
    const row = mockPurchaseOrders.find((item) => item.id === id);
    if (!row) throw new Error("Mock purchase order not found");
    const lines = mockPurchaseOrderLines.filter((line) => line.purchase_order_id === id).map((line) => {
      const item = mockItems.find((itemRow) => itemRow.id === line.item_id);
      return { ...line, item, qty_pending: line.qty_ordered - line.qty_received - line.qty_cancelled };
    });
    return { order: hydratePo(row, mockPurchaseOrderLines), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).single(),
    supabase.from("purchase_order_lines").select("*").eq("purchase_order_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  return {
    order: data as PurchaseOrder,
    lines: ((lines ?? []) as PurchaseOrderLine[]).map((line) => ({ ...line, qty_pending: line.qty_ordered - line.qty_received - line.qty_cancelled })),
  };
}

export async function getPurchaseRequestForOrder(purchaseRequestId: string | null) {
  if (!purchaseRequestId) return null;
  if (isMockMode()) {
    const row = mockPurchaseRequests.find((item) => item.id === purchaseRequestId);
    return row ? hydratePr(row, mockPurchaseRequestLines) : null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_requests").select("*").eq("id", purchaseRequestId).maybeSingle();
  if (error) throw new Error(error.message);
  return data as PurchaseRequest | null;
}

export async function getProcurementWorkspaceInsights() {
  if (isMockMode()) {
    return {
      draftPo: mockPurchaseOrders.filter((order) => order.status === "draft").length,
      openPo: mockPurchaseOrders.filter((order) => !["received", "closed", "cancelled"].includes(order.status)).length,
      receivingToday: 0,
      pendingPr: mockPurchaseRequests.filter((request) => request.status === "pending_approval").length,
    };
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const [draftPo, openPo, receivingToday, pendingPr] = await Promise.all([
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("status", "draft").is("deleted_at", null),
    supabase.from("purchase_orders").select("id", { count: "exact", head: true }).not("status", "in", "(received,closed,cancelled)").is("deleted_at", null),
    supabase.from("goods_receivings").select("id", { count: "exact", head: true }).eq("received_date", today).is("deleted_at", null),
    supabase.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", "pending_approval").is("deleted_at", null),
  ]);

  return {
    draftPo: draftPo.error ? 0 : draftPo.count ?? 0,
    openPo: openPo.error ? 0 : openPo.count ?? 0,
    receivingToday: receivingToday.error ? 0 : receivingToday.count ?? 0,
    pendingPr: pendingPr.error ? 0 : pendingPr.count ?? 0,
  };
}
