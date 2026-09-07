import {
  isMockMode,
  mockBranches,
  mockItems,
  mockProfile,
  mockPurchaseOrderLines,
  mockPurchaseOrders,
  mockPurchaseRequestLines,
  mockPurchaseRequests,
  mockSuppliers,
} from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
import { normalizeUom } from "@/lib/uom";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";
import { getCurrentUserScope } from "@/server/queries/notifications";
import { requireDetailRow } from "@/server/queries/detail";
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";

type Filters = Record<string, string | undefined>;
type PurchaseRequest = Database["public"]["Tables"]["purchase_requests"]["Row"];
type PurchaseRequestLine = Database["public"]["Tables"]["purchase_request_lines"]["Row"];
type PurchaseRequestUnresolvedLine = Database["public"]["Tables"]["purchase_request_unresolved_lines"]["Row"];
type PurchaseOrder = Database["public"]["Tables"]["purchase_orders"]["Row"];
type PurchaseOrderLine = Database["public"]["Tables"]["purchase_order_lines"]["Row"];
const PAGE_SIZE = 12;

function pageNumber(value: string | undefined) {
  return Math.max(1, Number(value) || 1);
}

function safeSort(value: string | undefined, allowed: readonly string[], fallback: string) {
  return allowed.includes(value ?? "") ? value! : fallback;
}

function searchFilter(value: string | undefined) {
  return value?.trim().replace(/[(),]/g, "") || null;
}

export type PurchaseRequestRow = PurchaseRequest & {
  requested_by_name: string | null;
  branch_name: string | null;
  line_count: number;
  estimated_total: number;
  supplier_names: string[];
  supplier_state: "assigned" | "assignment_required" | "details_unavailable" | "no_lines";
  procurement_status: PurchaseOrder["status"] | null;
};

export type PurchaseOrderRow = PurchaseOrder & {
  supplier_name: string | null;
  request_no: string | null;
  branch_name: string | null;
  requested_by_name: string | null;
  line_count: number;
  order_total: number;
};

const purchaseOrderProgress = ["draft", "approved", "sent", "partial_received", "received", "closed"] as const;

function furthestPurchaseOrderStatus(statuses: PurchaseOrder["status"][]) {
  return statuses.reduce<PurchaseOrder["status"] | null>((furthest, status) => {
    if (!furthest) return status;
    return purchaseOrderProgress.indexOf(status as (typeof purchaseOrderProgress)[number]) > purchaseOrderProgress.indexOf(furthest as (typeof purchaseOrderProgress)[number]) ? status : furthest;
  }, null);
}

export type ProcurementWorkspaceInsights = {
  role: string;
  draftPr: number | null;
  submittedPr: number | null;
  managerReview: number | null;
  purchasingReview: number | null;
  financeReview: number | null;
  readyToConvert: number | null;
  draftPo: number | null;
  pendingPoApproval: number | null;
  sentPo: number | null;
  receivingToday: number | null;
  invoiceFollowup: number | null;
  unavailable: boolean;
};

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  // The register uses the readable "receiving" filter label while the
  // database workflow state is `partial_received`.
  const status = filters.status === "receiving" ? "partial_received" : filters.status && filters.status !== "all" ? filters.status : null;
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
        : status === "manager_review" ? ["manager_review"]
        : status === "admin_review" ? ["admin_review"]
        : status === "finance_review" ? ["finance_review"]
        : status === "in_review" ? ["manager_review", "admin_review", "finance_review"]
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
  const ownLines = lines.filter((line) => line.purchase_request_id === row.id);
  const supplierIds = ownLines.map((line) => line.suggested_supplier_id ?? mockItems.find((item) => item.id === line.item_id)?.supplier_id ?? null).filter((id): id is string => Boolean(id));
  const supplierNames = [...new Set(supplierIds.map((id) => mockSuppliers.find((supplier) => supplier.id === id)?.name).filter((name): name is string => Boolean(name)))];
  return {
    ...row,
    requested_by_name: row.requested_by ? mockProfile.full_name : null,
    branch_name: branch?.branch_name ?? null,
    line_count: ownLines.length,
    estimated_total: ownLines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0),
    supplier_names: supplierNames,
    supplier_state: ownLines.length === 0 ? "no_lines" : supplierNames.length > 0 ? "assigned" : supplierIds.length > 0 ? "details_unavailable" : "assignment_required",
    procurement_status: mockPurchaseOrders.find((order) => order.purchase_request_id === row.id)?.status ?? null,
  };
}

function hydratePo(row: PurchaseOrder, lines: PurchaseOrderLine[]): PurchaseOrderRow {
  const supplier = mockSuppliers.find((item) => item.id === row.supplier_id);
  const request = row.purchase_request_id ? mockPurchaseRequests.find((item) => item.id === row.purchase_request_id) : null;
  const branch = request ? mockBranches.find((item) => item.id === request.branch_id) : null;
  const ownLines = lines.filter((line) => line.purchase_order_id === row.id);
  return {
    ...row,
    supplier_name: supplier?.name ?? null,
    request_no: request?.request_no ?? null,
    branch_name: branch?.branch_name ?? null,
    requested_by_name: request?.requested_by ? mockProfile.full_name : null,
    line_count: ownLines.length,
    order_total: ownLines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0),
  };
}

export async function getPurchaseRequests(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockPurchaseRequests.map((row) => hydratePr(row, mockPurchaseRequestLines));
    return paginateRows(filterRows(rows, filters, ["request_no", "status", "priority", "branch_name", "remarks"], "request_no"), filters.page, 12);
  }

  const supabase = await createClient();
  const page = pageNumber(filters.page);
  const sort = safeSort(filters.sort, ["request_no", "request_date", "needed_by_date", "status", "updated_at"], "request_no");
  const databaseSort = sort === "request_no" ? "request_sort_key" : sort;
  const ascending = filters.dir === "asc";
  let query = supabase
    .from("purchase_requests")
    .select("id, requested_by, request_no, request_date, required_date, priority, needed_by_date, branch_id, status, remarks, updated_at", { count: "exact" })
    .is("deleted_at", null);
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const priority = filters.priority && filters.priority !== "all" ? filters.priority : null;
  const search = searchFilter(filters.search);
  const statusGroup = status === "in_review"
    ? ["manager_review", "admin_review", "finance_review"]
    : status === "rejected"
      ? ["rejected", "cancelled"]
      : status ? [status] : [];
  if (statusGroup.length === 1) query = query.eq("status", statusGroup[0] as PurchaseRequest["status"]);
  if (statusGroup.length > 1) query = query.in("status", statusGroup as PurchaseRequest["status"][]);
  if (priority) query = query.eq("priority", priority as PurchaseRequest["priority"]);
  if (search) {
    const { data: matchingBranches, error: matchingBranchesError } = await supabase
      .from("branches")
      .select("id")
      .ilike("branch_name", `%${search}%`)
      .limit(100);
    if (matchingBranchesError) throw new Error(matchingBranchesError.message);
    const branchClause = matchingBranches?.length ? `,branch_id.in.(${matchingBranches.map((branch) => branch.id).join(",")})` : "";
    query = query.or(`request_no.ilike.%${search}%,remarks.ilike.%${search}%${branchClause}`);
  }
  const { data, error, count } = await query
    .order(databaseSort, { ascending })
    .order("id", { ascending })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  if (!data || count === null) throw new Error("Purchase request list returned no data.");
  const ids = data.map((row) => row.id);
  const branchIds = [...new Set(data.flatMap((row) => (row.branch_id ? [row.branch_id] : [])))];
  const [{ data: lines, error: linesError }, { data: branches, error: branchesError }, actorDisplayMap, { data: linkedOrders, error: linkedOrdersError }] = await Promise.all([
    ids.length ? supabase.from("purchase_request_lines").select("purchase_request_id, qty, estimated_unit_cost, suggested_supplier_id, item_id, uom").in("purchase_request_id", ids) : Promise.resolve({ data: [], error: null }),
    branchIds.length ? supabase.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
    resolveActorDisplayMap(data.map((row) => row.requested_by)),
    ids.length ? supabase.from("purchase_orders").select("purchase_request_id, status").in("purchase_request_id", ids).is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError || branchesError || linkedOrdersError) throw new Error((linesError ?? branchesError ?? linkedOrdersError)!.message);
  if (!lines || (branchIds.length > 0 && !branches)) throw new Error("Purchase request related data returned no data.");
  const itemIds = [...new Set(lines.map((line) => line.item_id).filter((id): id is string => Boolean(id)))];
  const explicitSupplierIds = [...new Set(lines.map((line) => line.suggested_supplier_id).filter((id): id is string => Boolean(id)))];
  const { data: itemDefaults, error: itemDefaultsError } = itemIds.length
    ? await supabase.from("items").select("id, supplier_id").in("id", itemIds)
    : { data: [], error: null };
  if (itemDefaultsError) throw new Error(itemDefaultsError.message);
  if (!itemDefaults) throw new Error("Purchase request sourcing details returned no data.");
  const { data: branchMappings, error: branchMappingsError } = branchIds.length && itemIds.length
    ? await supabase.from("branch_supplier_items").select("branch_id, item_id, supplier_item_id, is_preferred").in("branch_id", branchIds).in("item_id", itemIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (branchMappingsError) throw new Error(branchMappingsError.message);
  if (!branchMappings) throw new Error("Purchase request branch sourcing details returned no data.");
  const supplierItemIds = [...new Set(branchMappings.map((mapping) => mapping.supplier_item_id))];
  const { data: supplierItems, error: supplierItemsError } = supplierItemIds.length
    ? await supabase.from("supplier_items").select("id, supplier_id, item_id, purchase_uom").in("id", supplierItemIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (supplierItemsError) throw new Error(supplierItemsError.message);
  if (!supplierItems) throw new Error("Purchase request supplier item details returned no data.");
  const itemSupplierIds = itemDefaults.map((item) => item.supplier_id).filter((id): id is string => Boolean(id));
  const mappingSupplierIds = supplierItems.map((item) => item.supplier_id).filter((id): id is string => Boolean(id));
  const allSupplierIds = [...new Set([...explicitSupplierIds, ...itemSupplierIds, ...mappingSupplierIds])];
  const { data: suppliers, error: suppliersError } = allSupplierIds.length
    ? await supabase.from("suppliers").select("id, name").in("id", allSupplierIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (suppliersError) throw new Error(suppliersError.message);
  if (!suppliers) throw new Error("Purchase request supplier details returned no data.");
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const itemSupplierById = new Map((itemDefaults ?? []).map((row) => [row.id, row.supplier_id]));
  const supplierItemById = new Map((supplierItems ?? []).map((row) => [row.id, row]));
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const rows = data.map((row) => {
    const ownLines = lines.filter((line) => line.purchase_request_id === row.id);
    const supplierIds = ownLines.map((line) => {
      const explicitSupplierId = line.suggested_supplier_id ?? itemSupplierById.get(line.item_id) ?? null;
      if (explicitSupplierId) return explicitSupplierId;
      const compatibleMappings = branchMappings
        .filter((mapping) => mapping.branch_id === row.branch_id && mapping.item_id === line.item_id)
        .map((mapping) => ({ mapping, supplierItem: supplierItemById.get(mapping.supplier_item_id) }))
        .filter(({ supplierItem }) => supplierItem && normalizeUom(supplierItem.purchase_uom) === normalizeUom(line.uom));
      const currentMapping = compatibleMappings.find(({ mapping }) => mapping.is_preferred) ?? (compatibleMappings.length === 1 ? compatibleMappings[0] : null);
      return currentMapping?.supplierItem?.supplier_id ?? null;
    }).filter((id): id is string => Boolean(id));
    const supplierNames = [...new Set(supplierIds.map((id) => supplierById.get(id)).filter((name): name is string => Boolean(name)))];
    return {
      ...row,
      requested_by_name: actorDisplayName(actorDisplayMap, row.requested_by),
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
      line_count: ownLines.length,
      estimated_total: ownLines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0),
      supplier_names: supplierNames,
      supplier_state: ownLines.length === 0 ? "no_lines" : supplierNames.length > 0 ? "assigned" : supplierIds.length > 0 ? "details_unavailable" : "assignment_required",
      procurement_status: furthestPurchaseOrderStatus((linkedOrders ?? []).filter((order) => order.purchase_request_id === row.id).map((order) => order.status)),
    };
  });
  const totalRows = count;
  return { rows, page, pageSize: PAGE_SIZE, totalRows, totalPages: Math.max(Math.ceil(totalRows / PAGE_SIZE), 1) };
}

export async function getPurchaseRequestSummary() {
  if (isMockMode()) {
    return {
      total: mockPurchaseRequests.length,
      managerReview: mockPurchaseRequests.filter((row) => row.status === "manager_review").length,
      adminReview: mockPurchaseRequests.filter((row) => row.status === "admin_review").length,
      financeReview: mockPurchaseRequests.filter((row) => row.status === "finance_review").length,
    };
  }

  const supabase = await createClient();
  const count = (status?: PurchaseRequest["status"]) => {
    let query = supabase.from("purchase_requests").select("id", { count: "exact", head: true }).is("deleted_at", null);
    if (status) query = query.eq("status", status);
    return query;
  };
  const [total, managerReview, adminReview, financeReview] = await Promise.all([count(), count("manager_review"), count("admin_review"), count("finance_review")]);
  for (const result of [total, managerReview, adminReview, financeReview]) if (result.error) throw new Error(result.error.message);
  if ([total, managerReview, adminReview, financeReview].some((result) => result.count === null)) throw new Error("Purchase request summary returned no data.");
  return { total: total.count ?? 0, managerReview: managerReview.count ?? 0, adminReview: adminReview.count ?? 0, financeReview: financeReview.count ?? 0 };
}

export async function getPurchaseRequest(id: string) {
  if (isMockMode()) {
    const row = mockPurchaseRequests.find((item) => item.id === id);
    if (!row) return null;
    const lines = mockPurchaseRequestLines.filter((line) => line.purchase_request_id === id).map((line) => {
      const item = mockItems.find((itemRow) => itemRow.id === line.item_id);
      const supplier = mockSuppliers.find((supplierRow) => supplierRow.id === line.suggested_supplier_id);
      return { ...line, item, supplier_name: supplier?.name ?? null };
    });
    return { request: hydratePr(row, mockPurchaseRequestLines), lines, unresolvedLines: [] as PurchaseRequestUnresolvedLine[] };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: unresolvedLines, error: unresolvedLinesError }] = await Promise.all([
    supabase.from("purchase_requests").select("*").eq("id", id).maybeSingle(),
    supabase.from("purchase_request_lines").select("*").eq("purchase_request_id", id),
    supabase.from("purchase_request_unresolved_lines").select("*").eq("purchase_request_id", id).eq("resolution_status", "unresolved").order("line_no"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  if (unresolvedLinesError) throw new Error(unresolvedLinesError.message);
  if (!data) return null;
  if (!lines || !unresolvedLines) throw new Error("Purchase request detail returned incomplete data.");
  const { data: requester, error: requesterError } = data.requested_by
    ? await supabase.from("staffs").select("full_name").eq("id", data.requested_by).maybeSingle()
    : { data: null, error: null };
  if (requesterError) throw new Error(requesterError.message);
  return { request: { ...(data as PurchaseRequest), requested_by_name: requester?.full_name ?? null }, lines: lines as PurchaseRequestLine[], unresolvedLines: unresolvedLines as PurchaseRequestUnresolvedLine[] };
}

export type PurchaseRequestBranchStock = {
  itemId: string;
  quantity: number;
  uom: string;
  asOf: string;
};

export async function getPurchaseRequestBranchStock(branchId: string | null, itemIds: string[]) {
  const uniqueItemIds = [...new Set(itemIds)].slice(0, 500);
  if (!branchId || uniqueItemIds.length === 0) return [] as PurchaseRequestBranchStock[];
  if (isMockMode()) {
    return [] as PurchaseRequestBranchStock[];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_balances_summary")
    .select("item_id, current_qty, base_unit, updated_at")
    .eq("branch_id", branchId)
    .in("item_id", uniqueItemIds);
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Current branch stock returned no data.");
  return data.map((row) => ({
    itemId: row.item_id,
    quantity: row.current_qty,
    uom: row.base_unit,
    asOf: row.updated_at,
  }));
}

export async function getRecoverableDocumentWorkflowAvailable() {
  if (isMockMode()) return false;
  const supabase = await createClient();
  const { error } = await supabase.from("document_line_revisions").select("id").limit(1);
  if (error) throw new Error(error.message);
  return true;
}

export async function getPurchaseOrdersForRequest(id: string) {
  if (isMockMode()) {
    return mockPurchaseOrders.filter((order) => order.purchase_request_id === id).map((order) => hydratePo(order, mockPurchaseOrderLines));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .select("*")
    .eq("purchase_request_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Purchase request purchase orders returned no data.");
  if (!data.length) return [];

  const purchaseOrderIds = data.map((row) => row.id);
  const supplierIds = [...new Set(data.map((row) => row.supplier_id))];
  const [{ data: lines, error: linesError }, { data: suppliers, error: suppliersError }] = await Promise.all([
    supabase.from("purchase_order_lines").select("*").in("purchase_order_id", purchaseOrderIds),
    supabase.from("suppliers").select("id, name").in("id", supplierIds),
  ]);
  if (linesError) throw new Error(linesError.message);
  if (suppliersError) throw new Error(suppliersError.message);
  if (!lines || !suppliers) throw new Error("Purchase request related purchase orders returned incomplete data.");
  const supplierById = new Map(suppliers.map((row) => [row.id, row.name]));
  return (data as PurchaseOrder[]).map((row) => {
    const ownLines = (lines as PurchaseOrderLine[]).filter((line) => line.purchase_order_id === row.id);
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
    return paginateRows(filterRows(rows, { ...filters, dir: filters.dir ?? "desc" }, ["po_no", "status", "approval_status", "supplier_name", "remarks"], "po_no"), filters.page, 12);
  }

  const supabase = await createClient();
  const page = pageNumber(filters.page);
  const sort = safeSort(filters.sort, ["po_no", "order_date", "expected_delivery_date", "status", "updated_at"], "po_no");
  let query = supabase
    .from("purchase_orders")
    .select("id, supplier_id, purchase_request_id, branch_id, created_by, po_no, order_date, expected_delivery_date, status, approval_status, remarks, updated_at, deleted_at", { count: "exact" });
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const search = searchFilter(filters.search);
  if (status) query = query.eq("status", status as PurchaseOrder["status"]);
  if (status !== "cancelled") query = query.is("deleted_at", null);
  if (search) query = query.or(`po_no.ilike.%${search}%,remarks.ilike.%${search}%`);
  const { data, error, count } = await query.order(sort, { ascending: (filters.dir ?? "desc") === "asc" }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (error) throw new Error(error.message);
  if (!data || count === null) throw new Error("Purchase order list returned no data.");
  const ids = data.map((row) => row.id);
  const requestIds = [...new Set(data.map((row) => row.purchase_request_id).filter((id): id is string => Boolean(id)))];
  const [{ data: lines, error: linesError }, { data: suppliers, error: suppliersError }, { data: requests, error: requestsError }] = await Promise.all([
    ids.length ? supabase.from("purchase_order_lines").select("purchase_order_id, qty_ordered, unit_price").in("purchase_order_id", ids) : Promise.resolve({ data: [], error: null }),
    data.length ? supabase.from("suppliers").select("id, name").in("id", data.map((row) => row.supplier_id)) : Promise.resolve({ data: [], error: null }),
    requestIds.length ? supabase.from("purchase_requests").select("id, request_no, branch_id, requested_by").in("id", requestIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError || suppliersError || requestsError) throw new Error((linesError ?? suppliersError ?? requestsError)!.message);
  if (!lines || (data.length > 0 && !suppliers)) throw new Error("Purchase order related data returned no data.");
  const supplierById = new Map((suppliers ?? []).map((row) => [row.id, row.name]));
  const requestById = new Map((requests ?? []).map((row) => [row.id, row.request_no]));
  const branchIds = [...new Set([...data.map((row) => row.branch_id), ...(requests ?? []).map((row) => row.branch_id)].filter((id): id is string => Boolean(id)))];
  const requesterIds = [...new Set([...data.map((row) => row.created_by), ...(requests ?? []).map((row) => row.requested_by)].filter((id): id is string => Boolean(id)))];
  const [{ data: branches, error: branchesError }, { data: requesters, error: requestersError }] = await Promise.all([
    branchIds.length ? supabase.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
    requesterIds.length ? supabase.from("staffs").select("id, full_name").in("id", requesterIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (branchesError || requestersError) throw new Error((branchesError ?? requestersError)!.message);
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const requesterById = new Map((requesters ?? []).map((row) => [row.id, row.full_name]));
  const rows = data.map((row) => {
    const ownLines = lines.filter((line) => line.purchase_order_id === row.id);
    const request = row.purchase_request_id ? (requests ?? []).find((candidate) => candidate.id === row.purchase_request_id) : null;
    return {
      ...row,
      supplier_name: supplierById.get(row.supplier_id) ?? null,
      request_no: row.purchase_request_id ? requestById.get(row.purchase_request_id) ?? null : null,
      branch_name: (row.branch_id ? branchById.get(row.branch_id) : null) ?? (request?.branch_id ? branchById.get(request.branch_id) : null) ?? null,
      requested_by_name: (request?.requested_by ? requesterById.get(request.requested_by) : null) ?? (row.created_by ? requesterById.get(row.created_by) : null) ?? null,
      line_count: ownLines.length,
      order_total: ownLines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0),
    };
  });
  const totalRows = count;
  return { rows, page, pageSize: PAGE_SIZE, totalRows, totalPages: Math.max(Math.ceil(totalRows / PAGE_SIZE), 1) };
}

export type ProcurementChainNode = {
  id: string;
  documentId: string | null;
  kind: "PR" | "PO" | "GRN" | "Invoice";
  number: string;
  status: string;
  href: string;
};

export type ProcurementChainAttachment = Database["public"]["Tables"]["attachments"]["Row"] & {
  uploaded_by_name?: string | null;
  source_document_id: string;
  source_number: string;
  source_kind: ProcurementChainNode["kind"];
  source_href: string;
};

export async function getProcurementChainForRequest(requestId: string) {
  if (isMockMode()) return { nodes: [] as ProcurementChainNode[], attachments: [] as ProcurementChainAttachment[] };
  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase.from("purchase_requests").select("id, document_id, request_no, status").eq("id", requestId).maybeSingle();
  if (requestError) throw new Error(requestError.message);
  if (!request) throw new Error("Purchase request was not found.");
  const { data: orders, error: ordersError } = await supabase.from("purchase_orders").select("id, document_id, po_no, status").eq("purchase_request_id", requestId).is("deleted_at", null).order("created_at");
  if (ordersError) throw new Error(ordersError.message);
  const orderIds = (orders ?? []).map((order) => order.id);
  const [{ data: receipts, error: receiptsError }, { data: invoices, error: invoicesError }] = await Promise.all([
    orderIds.length ? supabase.from("goods_receivings").select("id, document_id, purchase_order_id, grn_no, status").in("purchase_order_id", orderIds).is("deleted_at", null).order("created_at") : Promise.resolve({ data: [], error: null }),
    orderIds.length ? supabase.from("supplier_invoices").select("id, document_id, purchase_order_id, invoice_no, status").in("purchase_order_id", orderIds).is("deleted_at", null).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  if (receiptsError || invoicesError) throw new Error((receiptsError ?? invoicesError)!.message);
  const nodes: ProcurementChainNode[] = [
    { id: request.id, documentId: request.document_id, kind: "PR", number: request.request_no, status: request.status, href: `/purchase-requests/${request.id}` },
    ...(orders ?? []).map((order) => ({ id: order.id, documentId: order.document_id, kind: "PO" as const, number: order.po_no, status: order.status, href: `/purchase-orders/${order.id}` })),
    ...(receipts ?? []).map((receipt) => ({ id: receipt.id, documentId: receipt.document_id, kind: "GRN" as const, number: receipt.grn_no, status: receipt.status, href: `/goods-receivings/${receipt.id}` })),
    ...(invoices ?? []).map((invoice) => ({ id: invoice.id, documentId: invoice.document_id, kind: "Invoice" as const, number: invoice.invoice_no, status: invoice.status, href: `/supplier-invoices/${invoice.id}` })),
  ];
  const sourceByDocumentId = new Map(nodes.filter((node) => node.documentId).map((node) => [node.documentId!, node]));
  const documentIds = [...sourceByDocumentId.keys()];
  if (!documentIds.length) return { nodes, attachments: [] as ProcurementChainAttachment[] };
  const { data: attachments, error: attachmentsError } = await supabase.from("attachments").select("*").eq("entity_type", "document").in("entity_id", documentIds).is("deleted_at", null).order("created_at", { ascending: false });
  if (attachmentsError) throw new Error(attachmentsError.message);
  const displayMap = await resolveActorDisplayMap((attachments ?? []).map((attachment) => attachment.uploaded_by));
  return {
    nodes,
    attachments: (attachments ?? []).flatMap((attachment) => {
      const source = sourceByDocumentId.get(attachment.entity_id);
      return source ? [{ ...attachment, uploaded_by_name: actorDisplayName(displayMap, attachment.uploaded_by), source_document_id: source.documentId!, source_number: source.number, source_kind: source.kind, source_href: source.href }] : [];
    }),
  };
}

export async function getPurchaseOrderSummary() {
  if (isMockMode()) {
    const count = (...statuses: PurchaseOrder["status"][]) => mockPurchaseOrders.filter((row) => statuses.includes(row.status)).length;
    return { total: mockPurchaseOrders.length, approved: count("approved"), sent: count("sent"), receiving: count("partial_received"), received: count("received"), closed: count("closed"), cancelled: count("cancelled") };
  }

  const supabase = await createClient();
  const count = (status?: PurchaseOrder["status"]) => {
    let query = supabase.from("purchase_orders").select("id", { count: "exact", head: true });
    if (status !== "cancelled") query = query.is("deleted_at", null);
    if (status) query = query.eq("status", status);
    return query;
  };
  const [total, approved, sent, receiving, received, closed, cancelled] = await Promise.all([count(), count("approved"), count("sent"), count("partial_received"), count("received"), count("closed"), count("cancelled")]);
  for (const result of [total, approved, sent, receiving, received, closed, cancelled]) if (result.error) throw new Error(result.error.message);
  if ([total, approved, sent, receiving, received, closed, cancelled].some((result) => result.count === null)) throw new Error("Purchase order summary returned no data.");
  return { total: total.count ?? 0, approved: approved.count ?? 0, sent: sent.count ?? 0, receiving: receiving.count ?? 0, received: received.count ?? 0, closed: closed.count ?? 0, cancelled: cancelled.count ?? 0 };
}

export async function getPurchaseOrder(id: string) {
  if (isMockMode()) {
    const row = requireDetailRow(mockPurchaseOrders.find((item) => item.id === id), "Purchase order", id);
    const lines = mockPurchaseOrderLines.filter((line) => line.purchase_order_id === id).map((line) => {
      const item = mockItems.find((itemRow) => itemRow.id === line.item_id);
      return { ...line, item, qty_pending: line.qty_ordered - line.qty_received - line.qty_cancelled };
    });
    return { order: hydratePo(row, mockPurchaseOrderLines), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("purchase_orders").select("*").eq("id", id).maybeSingle(),
    supabase.from("purchase_order_lines").select("*").eq("purchase_order_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const order = requireDetailRow(data, "Purchase order", id);
  if (!lines) throw new Error("Purchase order detail lines returned no data.");
  return {
    order: order as PurchaseOrder,
    lines: (lines as PurchaseOrderLine[]).map((line) => ({ ...line, qty_pending: line.qty_ordered - line.qty_received - line.qty_cancelled })),
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

export async function getPurchaseRequestIdForOrder(orderId: string) {
  if (isMockMode()) return mockPurchaseOrders.find((order) => order.id === orderId)?.purchase_request_id ?? null;
  const { data, error } = await (await createClient()).from("purchase_orders").select("purchase_request_id").eq("id", orderId).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.purchase_request_id ?? null;
}

export async function getProcurementWorkspaceInsights(): Promise<ProcurementWorkspaceInsights> {
  if (isMockMode()) {
    return {
      role: "super_admin",
      draftPr: mockPurchaseRequests.filter((request) => request.status === "draft").length,
      submittedPr: mockPurchaseRequests.filter((request) => request.status === "manager_review").length,
      managerReview: mockPurchaseRequests.filter((request) => request.status === "manager_review").length,
      purchasingReview: mockPurchaseRequests.filter((request) => request.status === "admin_review").length,
      financeReview: mockPurchaseRequests.filter((request) => request.status === "finance_review").length,
      readyToConvert: mockPurchaseRequests.filter((request) => request.status === "ready_to_convert").length,
      draftPo: mockPurchaseOrders.filter((order) => order.status === "draft").length,
      pendingPoApproval: mockPurchaseOrders.filter((order) => order.status === "pending_approval").length,
      sentPo: mockPurchaseOrders.filter((order) => order.status === "sent").length,
      receivingToday: 0,
      invoiceFollowup: 0,
      unavailable: false,
    };
  }

  const supabase = await createClient();
  const scope = await getCurrentUserScope();
  const canSeeFinance = scope?.roleCode === "super_admin" || scope?.roleCode === "finance";
  const today = todayInKualaLumpur();
  const countPr = (status: PurchaseRequest["status"]) => supabase.from("purchase_requests").select("id", { count: "exact", head: true }).eq("status", status).is("deleted_at", null);
  const countPo = (status: PurchaseOrder["status"]) => supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("status", status).is("deleted_at", null);
  const [draftPr, submittedPr, managerReview, purchasingReview, financeReview, readyToConvert, draftPo, pendingPoApproval, sentPo, receivingToday, invoiceFollowup] = await Promise.all([
    countPr("draft"),
    countPr("manager_review"),
    countPr("manager_review"),
    countPr("admin_review"),
    countPr("finance_review"),
    countPr("ready_to_convert"),
    countPo("draft"),
    countPo("pending_approval"),
    countPo("sent"),
    supabase.from("goods_receivings").select("id", { count: "exact", head: true }).eq("received_date", today).is("deleted_at", null),
    canSeeFinance ? supabase.from("supplier_invoices").select("id", { count: "exact", head: true }).in("status", ["open", "partially_paid"]).is("deleted_at", null) : Promise.resolve({ count: 0, error: null }),
  ]);

  const value = (result: { count: number | null; error: unknown }) => result.error ? null : result.count ?? 0;
  const results = [draftPr, submittedPr, managerReview, purchasingReview, financeReview, readyToConvert, draftPo, pendingPoApproval, sentPo, receivingToday, invoiceFollowup];
  return {
    role: scope?.roleCode ?? "outlet_staff",
    draftPr: value(draftPr),
    submittedPr: value(submittedPr),
    managerReview: value(managerReview),
    purchasingReview: value(purchasingReview),
    financeReview: value(financeReview),
    readyToConvert: value(readyToConvert),
    draftPo: value(draftPo),
    pendingPoApproval: value(pendingPoApproval),
    sentPo: value(sentPo),
    receivingToday: value(receivingToday),
    invoiceFollowup: value(invoiceFollowup),
    unavailable: results.some((result) => Boolean(result.error)),
  };
}
