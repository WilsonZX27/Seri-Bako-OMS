import { isMockMode, mockBranches, mockItems, mockProfile, mockStockCountLines, mockStockCounts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { logServerError } from "@/server/observability/logger";
import { getStockBalanceDetails } from "@/server/queries/inventory";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type StockCount = Database["public"]["Tables"]["stock_counts"]["Row"];
type StockCountLine = Database["public"]["Tables"]["stock_count_lines"]["Row"];
const STOCK_COUNT_PAGE_SIZE = 12;
const STOCK_COUNT_SORT_COLUMNS = new Set(["count_no", "count_date", "status", "updated_at", "branch_name"]);

export type StockCountRow = StockCount & {
  branch_name: string | null;
  counted_by_name: string | null;
  line_count: number;
  high_variance_count: number;
};

export type StockCountLineRow = StockCountLine & {
  item?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "item_image_url">;
};

export class StockCountNotFoundError extends Error {
  constructor() {
    super("Stock Count not found.");
    this.name = "StockCountNotFoundError";
  }
}

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const branch = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const sort = filters.sort ?? String(defaultSort);
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
      const matchesStatus = status ? row.status === status : true;
      const matchesBranch = branch ? row.branch_id === branch : true;
      const matchesFrom = filters.from ? String(row.count_date ?? "") >= filters.from : true;
      const matchesTo = filters.to ? String(row.count_date ?? "") <= filters.to : true;
      return matchesSearch && matchesStatus && matchesBranch && matchesFrom && matchesTo;
    })
    .sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

function requestedPage(pageValue?: string) {
  const parsed = Number(pageValue ?? "1");
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 1) : 1;
}

function databasePagination<T>(rows: T[], totalRows: number | null, pageValue?: string) {
  const total = totalRows ?? rows.length;
  const totalPages = Math.max(Math.ceil(total / STOCK_COUNT_PAGE_SIZE), 1);
  const page = pageValue === "all" ? 1 : Math.min(requestedPage(pageValue), totalPages);
  return { rows, totalRows: total, page, pageSize: STOCK_COUNT_PAGE_SIZE, totalPages };
}

function countSearchExpression(value?: string) {
  const search = value?.trim();
  if (!search) return null;
  const term = search.replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
  return ["count_no", "status", "branch_name", "remarks"].map((column) => `${column}.ilike.%${term}%`).join(",");
}

function hydrateCount(row: StockCount, lines: StockCountLine[]): StockCountRow {
  const branch = mockBranches.find((item) => item.id === row.branch_id);
  const ownLines = lines.filter((line) => line.stock_count_id === row.id);
  return {
    ...row,
    branch_name: branch?.branch_name ?? null,
    counted_by_name: row.counted_by ? mockProfile.full_name : null,
    line_count: ownLines.length,
    high_variance_count: ownLines.filter((line) => Math.abs(line.variance_percent) > row.tolerance_percent).length,
  };
}

export async function getStockCounts(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockCounts.map((row) => hydrateCount(row as StockCount, mockStockCountLines as StockCountLine[]));
    return paginateRows(filterRows(rows, filters, ["count_no", "status", "branch_name", "remarks"], "updated_at"), filters.page, 12);
  }
  const supabase = await createClient();
  const sort = STOCK_COUNT_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "updated_at";
  const ascending = filters.dir === "asc";
  const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  let query = supabase.from("stock_counts_list_view").select("*", { count: "exact" });
  if (branchId) query = query.eq("branch_id", branchId);
  if (status) query = query.eq("status", status as StockCount["status"]);
  if (filters.from) query = query.gte("count_date", filters.from);
  if (filters.to) query = query.lte("count_date", filters.to);
  const search = countSearchExpression(filters.search);
  if (search) query = query.or(search);
  query = query.order(sort, { ascending }).order("id", { ascending: false });
  if (filters.page !== "all") {
    const page = requestedPage(filters.page);
    query = query.range((page - 1) * STOCK_COUNT_PAGE_SIZE, page * STOCK_COUNT_PAGE_SIZE - 1);
  }
  const { data, error, count } = await query;
  if (error) {
    // Keep the workspace usable when the denormalized list view is unavailable
    // during a migration or a partial deployment. The base tables remain the
    // authoritative fallback and preserve the same filters/pagination.
    const [{ data: rawCounts, error: rawCountsError }, { data: branches, error: branchesError }, { data: lines, error: linesError }] = await Promise.all([
      supabase.from("stock_counts").select("*").is("deleted_at", null),
      supabase.from("branches").select("id, branch_name"),
      supabase.from("stock_count_lines").select("stock_count_id, variance_percent"),
    ]);
    if (rawCountsError || branchesError || linesError) throw new Error(error.message);
    const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
    const toleranceByCount = new Map((rawCounts ?? []).map((row) => [row.id, Number(row.tolerance_percent)]));
    const linesByCount = new Map<string, { line_count: number; high_variance_count: number }>();
    for (const line of lines ?? []) {
      const stockCountId = line.stock_count_id;
      if (!stockCountId) continue;
      const current = linesByCount.get(stockCountId) ?? { line_count: 0, high_variance_count: 0 };
      current.line_count += 1;
      if (Math.abs(Number(line.variance_percent ?? 0)) > (toleranceByCount.get(stockCountId) ?? 0)) current.high_variance_count += 1;
      linesByCount.set(stockCountId, current);
    }
    const fallbackRows = (rawCounts ?? []).map((rawRow) => {
      const row = rawRow as StockCount;
      const rowId = row.id ?? "";
      const branchIdForLabel = row.branch_id ?? "";
      return ({
      ...row,
      branch_name: branchById.get(branchIdForLabel) ?? null,
      counted_by_name: row.counted_by,
      line_count: linesByCount.get(rowId)?.line_count ?? 0,
      high_variance_count: linesByCount.get(rowId)?.high_variance_count ?? 0,
      });
    }) as StockCountRow[];
    return databasePagination(filterRows(fallbackRows, filters, ["count_no", "status", "branch_name", "remarks"], "updated_at"), fallbackRows.length, filters.page);
  }
  return databasePagination((data ?? []) as StockCountRow[], count, filters.page);
}

export type StockCountVarianceInsightRow = Database["public"]["Functions"]["get_stock_count_variance_insight"]["Returns"][number];

export async function getStockCountVarianceInsight(branchId?: string) {
  const empty = { daily: [] as StockCountVarianceInsightRow[], items: [] as StockCountVarianceInsightRow[], branches: [] as StockCountVarianceInsightRow[] };
  if (isMockMode()) return { available: true as const, ...empty };
  const supabase = await createClient();
  if (branchId) {
    const { data: branch, error: branchError } = await supabase.from("branches").select("id").eq("id", branchId).maybeSingle();
    if (branchError) logServerError(branchError, { source: "stockCounts.varianceInsight.branch" });
    if (branchError || !branch) return { available: false as const, ...empty };
  }
  const { data, error } = await supabase.rpc("get_stock_count_variance_insight", { p_branch_id: branchId || null });
  if (error) {
    logServerError(error, { source: "stockCounts.varianceInsight.rpc" });
    return { available: false as const, ...empty };
  }
  const rows = data ?? [];
  return {
    available: true as const,
    daily: rows.filter((row) => row.row_kind === "day").sort((left, right) => left.rank_order - right.rank_order),
    items: rows.filter((row) => row.row_kind === "item").sort((left, right) => left.rank_order - right.rank_order),
    branches: rows.filter((row) => row.row_kind === "branch").sort((left, right) => left.rank_order - right.rank_order),
  };
}

export async function getStockCountSummary() {
  if (isMockMode()) {
    const rows = mockStockCounts as StockCount[];
    return {
      total: rows.length,
      draft: rows.filter((row) => ["draft", "submitted", "reviewed", "approved"].includes(row.status)).length,
      posted: rows.filter((row) => row.status === "posted").length,
      cancelled: rows.filter((row) => row.status === "cancelled").length,
    };
  }

  const supabase = await createClient();
  const statuses = ["draft", "submitted", "reviewed", "approved", "posted", "cancelled"] as const;
  const results = await Promise.all(statuses.map(async (status) => {
    const { count, error } = await supabase
      .from("stock_counts_list_view")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    if (error) throw new Error(error.message);
    return { status, count: count ?? 0 };
  }));
  const byStatus = new Map(results.map((result) => [result.status, result.count]));
  const draft = ["draft", "submitted", "reviewed", "approved"].reduce((sum, status) => sum + (byStatus.get(status as typeof statuses[number]) ?? 0), 0);
  const posted = byStatus.get("posted") ?? 0;
  const cancelled = byStatus.get("cancelled") ?? 0;
  return { total: draft + posted + cancelled, draft, posted, cancelled };
}

export async function getStockCount(id: string) {
  if (isMockMode()) {
    const count = mockStockCounts.find((row) => row.id === id);
    if (!count) throw new Error("Mock stock count not found");
    const lines = mockStockCountLines
      .filter((line) => line.stock_count_id === id)
      .sort((left, right) => Number((left as StockCountLine & { line_position?: number }).line_position ?? 0) - Number((right as StockCountLine & { line_position?: number }).line_position ?? 0))
      .map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { count: hydrateCount(count as StockCount, mockStockCountLines as StockCountLine[]), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    // Removed unposted counts must not remain addressable through a stale detail URL.
    // Their activity/audit rows remain available through the activity log, while the
    // operational document itself is no longer treated as active work.
    supabase.from("stock_counts").select("*").eq("id", id).is("deleted_at", null).single(),
    supabase.from("stock_count_lines").select("*").eq("stock_count_id", id).order("line_position", { ascending: true }).order("id", { ascending: true }),
  ]);
  if (error) {
    if (error.code === "PGRST116") throw new StockCountNotFoundError();
    throw new Error(error.message);
  }
  if (linesError) throw new Error(linesError.message);
  if (!data) throw new StockCountNotFoundError();
  const count = data as StockCount;
  const ownLines = (lines ?? []) as StockCountLine[];
  const itemIds = [...new Set(ownLines.map((line) => line.item_id).filter(Boolean))];
  const [{ data: items, error: itemsError }, { data: branch, error: branchError }] = await Promise.all([
    itemIds.length
      ? supabase.from("items").select("id, item_code, item_name, base_unit, item_image_url").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    count.branch_id
      ? supabase.from("branches").select("id, branch_name").eq("id", count.branch_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (branchError) throw new Error(branchError.message);
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  return {
    count: {
      ...count,
      branch_name: branch?.branch_name ?? null,
      counted_by_name: count.counted_by,
      line_count: ownLines.length,
      high_variance_count: ownLines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent).length,
    },
    lines: ownLines.map((line) => ({ ...line, item: itemById.get(line.item_id) })),
  };
}

export async function getStockCountSeedLines(branchId?: string) {
  const balances = await getStockBalanceDetails({
    page: "all",
    view: "branch",
    branch_id: branchId,
  });
  const lastPostedPhysicalByItem = new Map<string, number>();

  // A repeated count starts from the last verified physical result, not from an
  // empty sheet. This keeps the work focused on changes while leaving every
  // quantity immediately editable. When an item has never been posted in a
  // stock count, the current ledger balance remains an explicitly labelled
  // starting estimate in the form.
  if (!isMockMode() && branchId) {
    const supabase = await createClient();
    const { data: postedCounts, error: postedCountsError } = await supabase
      .from("stock_counts")
      .select("id,count_date,posted_at,created_at")
      .eq("branch_id", branchId)
      .eq("status", "posted")
      .is("deleted_at", null)
      .order("count_date", { ascending: false })
      .order("posted_at", { ascending: false })
      .limit(1);
    if (postedCountsError) throw new Error(postedCountsError.message);

    const countIds = (postedCounts ?? []).map((count) => count.id);
    if (countIds.length) {
      const { data: postedLines, error: postedLinesError } = await supabase
        .from("stock_count_lines")
        .select("stock_count_id,item_id,physical_qty")
        .in("stock_count_id", countIds);
      if (postedLinesError) throw new Error(postedLinesError.message);

      const linesByCount = new Map((postedLines ?? []).map((line) => [`${line.stock_count_id}:${line.item_id}`, line.physical_qty]));
      for (const count of postedCounts ?? []) {
        for (const balance of balances.rows) {
          if (branchId !== balance.branch_id || lastPostedPhysicalByItem.has(balance.item_id)) continue;
          const physicalQty = linesByCount.get(`${count.id}:${balance.item_id}`);
          if (physicalQty !== undefined) lastPostedPhysicalByItem.set(balance.item_id, physicalQty);
        }
      }
    }
  }

  return balances.rows
    .filter((row) => (branchId ? row.branch_id === branchId : true))
    .map((row) => ({
      item_id: row.item_id,
      item_code: row.item_code,
      item_name: row.item_name,
      theoretical_qty: row.current_qty,
      physical_qty: lastPostedPhysicalByItem.get(row.item_id) ?? row.current_qty,
      prefill_source: lastPostedPhysicalByItem.has(row.item_id) ? ("last_posted_count" as const) : ("ledger_balance" as const),
      uom: row.base_unit,
    }));
}
