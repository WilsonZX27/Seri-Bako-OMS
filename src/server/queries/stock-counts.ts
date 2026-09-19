import { isMockMode, mockBranches, mockItems, mockProfile, mockStockCountLines, mockStockCounts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { shiftBusinessDate, todayInKualaLumpur } from "@/lib/business-date";
import { logServerError, logServerWarning } from "@/server/observability/logger";
import { getStockBalanceDetails } from "@/server/queries/inventory";
import { looseSupabase } from "@/lib/supabase/loose";
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

export async function getStockCountVoidPreview(id: string) {
  if (isMockMode()) return { fingerprint: "mock", adjustment_line_count: 0, reverse_quantity_in: 0, reverse_quantity_out: 0 };
  const supabase = await createClient();
  const { data, error } = await looseSupabase(supabase).rpc("preview_stock_count_void", { p_stock_count_id: id });
  if (error) throw new Error(error.message);
  const preview = data as { fingerprint?: string; adjustment_line_count?: number; reverse_quantity_in?: number; reverse_quantity_out?: number } | null;
  if (!preview?.fingerprint) throw new Error("Stock Count reversal preview is unavailable.");
  return {
    fingerprint: preview.fingerprint,
    adjustment_line_count: Number(preview.adjustment_line_count ?? 0),
    reverse_quantity_in: Number(preview.reverse_quantity_in ?? 0),
    reverse_quantity_out: Number(preview.reverse_quantity_out ?? 0),
  };
}

export type StockCountSeedLine = {
  item_id: string;
  item_code: string;
  item_name: string;
  theoretical_qty: number;
  physical_qty: number | null;
  prefill_source: "last_posted_count" | "ledger_balance" | "unavailable";
  uom: string;
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
  const sortKey = sort === "count_no" ? "created_at" : sort;
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
    .sort((a, b) => compareTableValues(a[sortKey], b[sortKey], dir));
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
    return paginateRows(filterRows(rows, filters, ["count_no", "status", "branch_name", "remarks"], "count_no"), filters.page, 12);
  }
  const supabase = await createClient();
  const requestedSort = STOCK_COUNT_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "count_no";
  const sort = requestedSort === "count_no" ? "created_at" : requestedSort;
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
    throw new Error(`Stock count list is temporarily unavailable: ${error.message}`);
  }
  if (!data || count === null) throw new Error("Stock count list returned incomplete data.");
  return databasePagination(data as StockCountRow[], count, filters.page);
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
    // Older linked projects may not have migration 149 yet. Use the same
    // tenant-scoped base tables as a compatibility path so a missing RPC does
    // not hide an otherwise readable Stock Count list. The fallback is strict:
    // any source failure remains unavailable rather than becoming zero.
    logServerWarning(error, { source: "stockCounts.varianceInsight.rpc" });
    try {
      const reportDate = todayInKualaLumpur();
      const startDate = shiftBusinessDate(reportDate, -29);
      let countsQuery = supabase
        .from("stock_counts")
        .select("id,count_no,count_date,posted_at,branch_id,tolerance_percent")
        .eq("status", "posted")
        .is("deleted_at", null)
        .gte("count_date", startDate)
        .lte("count_date", reportDate);
      if (branchId) countsQuery = countsQuery.eq("branch_id", branchId);
      const { data: counts, error: countsError } = await countsQuery;
      if (countsError) throw countsError;

      if (!counts) throw new Error("Stock Count variance counts returned no data.");
      const countRows = counts;
      const countIds = countRows.map((row) => row.id);
      const [{ data: lines, error: linesError }, { data: branches, error: branchesError }] = await Promise.all([
        countIds.length
          ? supabase.from("stock_count_lines").select("stock_count_id,item_id,variance_percent,variance_qty,uom").in("stock_count_id", countIds)
          : Promise.resolve({ data: [], error: null }),
        countRows.length
          ? supabase.from("branches").select("id,branch_name").in("id", [...new Set(countRows.map((row) => row.branch_id).filter((id): id is string => Boolean(id)))])
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (linesError) throw linesError;
      if (branchesError) throw branchesError;

      if (countIds.length && !lines) throw new Error("Stock Count variance lines returned no data.");
      const lineRows = lines;
      const itemIds = [...new Set(lineRows.map((line) => line.item_id).filter(Boolean))];
      const { data: items, error: itemsError } = itemIds.length
        ? await supabase.from("items").select("id,item_name").in("id", itemIds)
        : { data: [], error: null };
      if (itemsError) throw itemsError;
      if (itemIds.length && !items) throw new Error("Stock Count variance items returned no data.");

      const countById = new Map(countRows.map((row) => [row.id, row]));
      const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
      const itemById = new Map((items ?? []).map((row) => [row.id, row.item_name]));
      const highLines = lineRows
        .map((line) => {
          const count = countById.get(line.stock_count_id);
          if (!count || Math.abs(Number(line.variance_percent ?? 0)) <= Number(count.tolerance_percent ?? 0)) return null;
          return {
            count_id: count.id,
            count_no: count.count_no,
            count_date: count.count_date,
            posted_at: count.posted_at,
            branch_id: count.branch_id,
            branch_name: branchById.get(count.branch_id ?? "") ?? "Archived branch",
            item_id: line.item_id,
            item_name: itemById.get(line.item_id ?? "") ?? "Archived item",
            variance_percent: Number(line.variance_percent ?? 0),
            variance_qty: Number(line.variance_qty ?? 0),
            uom: line.uom,
          };
        })
        .filter((line): line is NonNullable<typeof line> => Boolean(line));

      const emptyRow = (recordDate: string): StockCountVarianceInsightRow => ({
        row_kind: "day",
        row_key: recordDate,
        row_label: recordDate.split("-").reverse().join("/"),
        record_date: recordDate,
        entity_id: null,
        high_variance_count: 0,
        shortage_count: 0,
        overage_count: 0,
        latest_count_id: null,
        latest_count_no: null,
        latest_count_date: null,
        latest_variance_percent: null,
        latest_variance_qty: null,
        latest_uom: null,
        rank_order: 0,
      });
      const daily = Array.from({ length: 30 }, (_, index) => {
        const recordDate = shiftBusinessDate(startDate, index);
        const matching = highLines.filter((line) => line.count_date === recordDate);
        return {
          ...emptyRow(recordDate),
          high_variance_count: matching.length,
          shortage_count: matching.filter((line) => line.variance_qty < 0).length,
          overage_count: matching.filter((line) => line.variance_qty > 0).length,
          rank_order: index + 1,
        };
      });

      const rankGroups = (key: "item_id" | "branch_id") => {
        const groups = new Map<string, typeof highLines>();
        for (const line of highLines) {
          const groupKey = line[key] ?? "unknown";
          groups.set(groupKey, [...(groups.get(groupKey) ?? []), line]);
        }
        return [...groups.entries()]
          .map(([groupKey, rows]) => {
            const latest = [...rows].sort((left, right) => `${right.count_date}|${right.posted_at ?? ""}|${right.count_id}`.localeCompare(`${left.count_date}|${left.posted_at ?? ""}|${left.count_id}`))[0];
            return { groupKey, rows, latest, maxAbsolutePercent: Math.max(...rows.map((row) => Math.abs(row.variance_percent))) };
          })
          .sort((left, right) => right.rows.length - left.rows.length || right.maxAbsolutePercent - left.maxAbsolutePercent || left.latest.item_name.localeCompare(right.latest.item_name) || left.groupKey.localeCompare(right.groupKey))
          .slice(0, 8);
      };
      const makeGroupRows = (key: "item_id" | "branch_id") => rankGroups(key).map(({ groupKey, rows, latest }, index) => ({
        row_kind: key === "item_id" ? "item" : "branch",
        row_key: groupKey,
        row_label: key === "item_id" ? latest.item_name : latest.branch_name,
        record_date: null,
        entity_id: groupKey === "unknown" ? null : groupKey,
        high_variance_count: rows.length,
        shortage_count: rows.filter((row) => row.variance_qty < 0).length,
        overage_count: rows.filter((row) => row.variance_qty > 0).length,
        latest_count_id: latest.count_id,
        latest_count_no: latest.count_no,
        latest_count_date: latest.count_date,
        latest_variance_percent: latest.variance_percent,
        latest_variance_qty: latest.variance_qty,
        latest_uom: latest.uom,
        rank_order: index + 1,
      } satisfies StockCountVarianceInsightRow));

      return { available: true as const, daily, items: makeGroupRows("item_id"), branches: makeGroupRows("branch_id") };
    } catch (fallbackError) {
      logServerError(fallbackError, { source: "stockCounts.varianceInsight.fallback" });
      return { available: false as const, ...empty };
    }
  }
  if (error || !data) {
    if (error) logServerWarning(error, { source: "stockCounts.varianceInsight.rpc" });
    return { available: false as const, ...empty };
  }
  const rows = data;
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

  const supabase = looseSupabase(await createClient());
  const { data, error } = await supabase.rpc("get_stock_count_summary");
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as { total?: number; draft?: number; posted?: number; cancelled?: number } | null;
  if (!row || row.total == null || row.draft == null || row.posted == null || row.cancelled == null) throw new Error("Stock count summary returned incomplete data.");
  return { total: Number(row.total), draft: Number(row.draft), posted: Number(row.posted), cancelled: Number(row.cancelled) };
}

export async function getStockCount(id: string) {
  if (isMockMode()) {
    const count = mockStockCounts.find((row) => row.id === id);
    if (!count) throw new Error("Mock stock count not found");
    const lines = mockStockCountLines
      .filter((line) => line.stock_count_id === id)
      .sort((left, right) => Number((left as StockCountLine & { line_position?: number }).line_position ?? 0) - Number((right as StockCountLine & { line_position?: number }).line_position ?? 0))
      .map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id), retirement: null }));
    return { count: hydrateCount(count as StockCount, mockStockCountLines as StockCountLine[]), lines, revisions: [], revisionsAvailable: false, reconciliations: [] };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: revisions, error: revisionsError }, { data: retirements, error: retirementsError }, { data: reconciliations, error: reconciliationsError }] = await Promise.all([
    // Removed unposted counts must not remain addressable through a stale detail URL.
    // Their activity/audit rows remain available through the activity log, while the
    // operational document itself is no longer treated as active work.
    supabase.from("stock_counts").select("*").eq("id", id).is("deleted_at", null).single(),
    supabase.from("stock_count_lines").select("*").eq("stock_count_id", id).order("line_position", { ascending: true }).order("id", { ascending: true }),
    supabase.from("document_line_revisions").select("*").eq("document_type", "stock_count").eq("document_id", id).order("created_at", { ascending: true }),
    looseSupabase(supabase).from("stock_count_item_retirements").select("stock_count_line_id,item_id,reason,note,actual_qty,status").eq("stock_count_id", id).in("status", ["pending", "applied"]),
    looseSupabase(supabase).from("stock_count_reconciliations").select("stock_count_line_id,item_id,snapshot_balance,posting_balance,movement_qty,physical_qty,final_variance_qty,reconciled_at").eq("stock_count_id", id),
  ]);
  if (error) {
    if (error.code === "PGRST116") throw new StockCountNotFoundError();
    throw new Error(error.message);
  }
  if (linesError) throw new Error(linesError.message);
  if (!data) throw new StockCountNotFoundError();
  if (!lines) throw new Error("Stock Count detail returned incomplete line data.");
  const count = data as StockCount;
  const ownLines = lines as StockCountLine[];
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
  if (itemIds.length && !items) throw new Error("Stock Count detail returned incomplete item data.");
  if (branchError) throw new Error(branchError.message);
  if (count.branch_id && !branch) throw new Error("Stock Count detail returned incomplete branch data.");
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const retirementRows = (retirementsError ? [] : retirements ?? []) as Array<{ stock_count_line_id: string; item_id: string; reason: "used_up" | "wrong_or_duplicate_code" | "branch_no_longer_uses" | "other"; note: string; actual_qty: number; status: "pending" | "applied" }>;
  return {
    count: {
      ...count,
      branch_name: branch?.branch_name ?? null,
      counted_by_name: count.counted_by,
      line_count: ownLines.length,
      high_variance_count: ownLines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent).length,
    },
    lines: ownLines.map((line) => ({
      ...line,
      item: itemById.get(line.item_id),
      retirement: retirementRows.find((retirement) => retirement.stock_count_line_id === line.id) ?? null,
    })),
    revisions: revisionsError ? [] : revisions ?? [],
    revisionsAvailable: !revisionsError,
    reconciliations: reconciliationsError ? [] : reconciliations ?? [],
  };
}

export async function getStockCountSeedLines(branchId?: string) {
  if (!branchId) return [];
  const balances = isMockMode()
    ? await getStockBalanceDetails({ page: "all", view: "branch", branch_id: branchId })
    : await (async () => {
        const scopedClient = await createClient();
        const { data, error } = await looseSupabase(scopedClient)
          .from("stock_count_eligible_items")
          .select("item_id,item_code,item_name,branch_id,current_qty,last_movement,base_unit")
          .eq("branch_id", branchId)
          .order("item_name", { ascending: true })
          .order("item_id", { ascending: true });
        return { rows: (data ?? []) as Array<{ item_id: string; item_code: string; item_name: string; branch_id: string; current_qty: number; last_movement: string | null; base_unit: string }>, error: error?.message ?? null };
      })();
  if (balances.error) {
    // A failed balance read must stop the count from opening with an empty
    // or zero-filled sheet. The operator can retry once the source is back.
    throw new Error(`Stock Count starting balances are unavailable: ${balances.error}`);
  }
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

    if (!postedCounts) throw new Error("Posted stock count history returned no data.");
    const countIds = postedCounts.map((count) => count.id);
    if (countIds.length) {
      const { data: postedLines, error: postedLinesError } = await supabase
        .from("stock_count_lines")
        .select("stock_count_id,item_id,physical_qty")
        .in("stock_count_id", countIds);
      if (postedLinesError) throw new Error(postedLinesError.message);
      if (!postedLines) throw new Error("Posted stock count lines returned no data.");

      const linesByCount = new Map(postedLines.map((line) => [`${line.stock_count_id}:${line.item_id}`, line.physical_qty]));
      for (const count of postedCounts) {
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
      // A zero with no posted movement is not a verified balance. Keep the
      // physical count blank so the operator must observe and enter it rather
      // than accidentally confirming an invented zero.
      physical_qty: lastPostedPhysicalByItem.get(row.item_id)
        ?? (row.last_movement || Number(row.current_qty) !== 0 ? row.current_qty : null),
      prefill_source: lastPostedPhysicalByItem.has(row.item_id)
        ? ("last_posted_count" as const)
        : row.last_movement || Number(row.current_qty) !== 0
          ? ("ledger_balance" as const)
          : ("unavailable" as const),
      uom: row.base_unit,
    })) satisfies StockCountSeedLine[];
}
