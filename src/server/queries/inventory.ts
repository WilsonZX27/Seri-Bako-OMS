import { createClient } from "@/lib/supabase/server";
import { shiftBusinessDate, todayInKualaLumpur } from "@/lib/business-date";
import { logServerWarning } from "@/server/observability/logger";
import {
  getMockLowStockItems,
  getMockStockBalances,
  isMockMode,
  mockBranches,
  mockItems,
  mockStockTransactions,
} from "@/lib/mock-mode";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { requireDetailRow } from "@/server/queries/detail";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type StockTransaction = Database["public"]["Tables"]["stock_transactions"]["Row"];
type StockLedgerViewRow = Database["public"]["Views"]["stock_ledger_view"]["Row"];
type StockCardResult = {
  rows: StockLedgerViewRow[];
  unavailable: boolean;
};
type LowStockRow = Database["public"]["Views"]["stock_balances_view"]["Row"] & {
  stock_status: "out_of_stock" | "low_stock";
  suggested_reorder_qty: number;
};
type StockBalanceRow = {
  item_id: string;
  item_code: string;
  item_name: string;
  supplier_id: string | null;
  supplier_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  available_qty: number;
  reserved_qty: number;
  current_qty: number;
  purchase_unit: string;
  base_unit: string;
  conversion_to_base_unit: number;
  average_cost: number;
  inventory_value: number;
  last_movement: string | null;
  item_status: string;
  status: string;
};

type InventoryDashboardRpc = {
  inventory_value: number;
  total_active_items: number;
  low_stock_items_count: number;
  negative_stock: number;
  todays_movements: number;
  todays_receiving: number;
  todays_transfers: number;
  pending_adjustments: number;
  stock_count_due: number;
  recent_transactions: Array<{
    id: string;
    item_id: string;
    item_name: string;
    base_unit: string;
    transaction_date: string;
    transaction_type: StockTransaction["transaction_type"];
    quantity_in: number;
    quantity_out: number;
  }>;
  top_purchased_items: Array<{ name: string; qty: number }>;
  top_consumed_items: Array<{ name: string; qty: number }>;
  low_stock_rows: Array<Database["public"]["Tables"]["stock_balances_summary"]["Row"]>;
};

const INVENTORY_DASHBOARD_NUMERIC_FIELDS = [
  "inventory_value",
  "total_active_items",
  "low_stock_items_count",
  "negative_stock",
  "todays_movements",
  "todays_receiving",
  "todays_transfers",
  "pending_adjustments",
  "stock_count_due",
] as const;

function isCompleteInventoryDashboardRpc(value: unknown): value is InventoryDashboardRpc {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  const hasFiniteNumber = (field: string) => {
    const fieldValue = summary[field];
    return fieldValue !== null && fieldValue !== undefined && Number.isFinite(Number(fieldValue));
  };
  return INVENTORY_DASHBOARD_NUMERIC_FIELDS.every(hasFiniteNumber)
    && Array.isArray(summary.recent_transactions)
    && Array.isArray(summary.top_purchased_items)
    && Array.isArray(summary.top_consumed_items)
    && Array.isArray(summary.low_stock_rows);
}

export type InventoryDailyMovementRow = {
  transaction_date: string;
  inbound_entries: number;
  outbound_entries: number;
  movement_entries: number;
};

const MAX_INVENTORY_DASHBOARD_FALLBACK_BALANCES = 2_000;
const MAX_INVENTORY_DAILY_MOVEMENT_FALLBACK_ROWS = 10_000;
const INVENTORY_READ_RETRY_DELAYS_MS = [350, 900] as const;

type InventoryReadResponse = {
  error: { code?: string | null; message?: string | null } | null;
};

function isRetryableInventoryReadError(error: InventoryReadResponse["error"]) {
  if (!error) return false;
  const code = String(error.code ?? "").toUpperCase();
  if (["500", "57014", "PGRST002", "PGRST003", "502", "503", "504"].includes(code)) return true;
  return /(?:internal server error|timeout|timed out|temporarily unavailable|network|fetch failed|connection reset)/i.test(error.message ?? "");
}

// The summary RPC is already bounded server-side. Keep this named boundary
// for the dashboard contract. Retry only transient read failures; a final
// failure still reaches the existing explicit unavailable/fallback path.
async function boundedInventoryInsight<T extends InventoryReadResponse>(operation: () => PromiseLike<T>): Promise<T> {
  let result = await operation();
  for (const delayMs of INVENTORY_READ_RETRY_DELAYS_MS) {
    if (!isRetryableInventoryReadError(result.error)) return result;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await operation();
  }
  return result;
}

function inventoryPeriodRange(period: "7d" | "30d" | "month") {
  const end = todayInKualaLumpur();
  const start = period === "month" ? `${end.slice(0, 7)}-01` : shiftBusinessDate(end, -(period === "7d" ? 6 : 29));
  return { start, end };
}

function mockInventoryDailyMovement(period: "7d" | "30d" | "month"): InventoryDailyMovementRow[] {
  const { start, end } = inventoryPeriodRange(period);
  const activity = new Map<string, Omit<InventoryDailyMovementRow, "transaction_date">>();
  for (const row of mockStockTransactions) {
    if (row.status !== "posted" || row.transaction_date < start || row.transaction_date > end) continue;
    const current = activity.get(row.transaction_date) ?? { inbound_entries: 0, outbound_entries: 0, movement_entries: 0 };
    current.inbound_entries += Number(row.quantity_in) > 0 ? 1 : 0;
    current.outbound_entries += Number(row.quantity_out) > 0 ? 1 : 0;
    current.movement_entries += 1;
    activity.set(row.transaction_date, current);
  }
  const dates: InventoryDailyMovementRow[] = [];
  for (let cursor = new Date(`${start}T00:00:00Z`); cursor <= new Date(`${end}T00:00:00Z`); cursor = new Date(cursor.getTime() + 86_400_000)) {
    const transactionDate = cursor.toISOString().slice(0, 10);
    dates.push({ transaction_date: transactionDate, ...(activity.get(transactionDate) ?? { inbound_entries: 0, outbound_entries: 0, movement_entries: 0 }) });
  }
  return dates;
}

async function getInventoryDailyMovementFromBaseTables(
  supabase: Awaited<ReturnType<typeof createClient>>,
  period: "7d" | "30d" | "month",
): Promise<InventoryDailyMovementRow[]> {
  const { start, end } = inventoryPeriodRange(period);
  const { data: transactions, error: transactionError } = await supabase
    .from("stock_transactions")
    .select("id,transaction_date,quantity_in,quantity_out")
    .eq("status", "posted")
    .gte("transaction_date", start)
    .lte("transaction_date", end)
    .order("transaction_date", { ascending: true })
    .limit(MAX_INVENTORY_DAILY_MOVEMENT_FALLBACK_ROWS + 1);
  if (transactionError) throw transactionError;
  if (!transactions) throw new Error("Inventory daily movement fallback returned no data.");
  if (transactions.length > MAX_INVENTORY_DAILY_MOVEMENT_FALLBACK_ROWS) {
    throw new Error(`Inventory daily movement fallback exceeded ${MAX_INVENTORY_DAILY_MOVEMENT_FALLBACK_ROWS} rows.`);
  }

  const transactionIds = (transactions ?? []).map((row) => row.id);
  const { data: lines, error: lineError } = transactionIds.length
    ? await supabase
      .from("stock_transaction_lines")
      .select("stock_transaction_id,quantity_in,quantity_out")
      .in("stock_transaction_id", transactionIds)
    : { data: [], error: null };
  if (lineError) throw lineError;
  if (transactionIds.length && !lines) throw new Error("Inventory daily movement lines fallback returned no data.");

  const parentById = new Map((transactions ?? []).map((row) => [row.id, row]));
  const lineCountByTransaction = new Map<string, number>();
  const activity = new Map<string, Omit<InventoryDailyMovementRow, "transaction_date">>();
  const add = (transactionDate: string, quantityIn: number, quantityOut: number) => {
    const current = activity.get(transactionDate) ?? { inbound_entries: 0, outbound_entries: 0, movement_entries: 0 };
    current.inbound_entries += quantityIn > 0 ? 1 : 0;
    current.outbound_entries += quantityOut > 0 ? 1 : 0;
    current.movement_entries += 1;
    activity.set(transactionDate, current);
  };

  for (const line of lines ?? []) {
    const parent = parentById.get(line.stock_transaction_id);
    if (!parent) continue;
    lineCountByTransaction.set(line.stock_transaction_id, (lineCountByTransaction.get(line.stock_transaction_id) ?? 0) + 1);
    add(parent.transaction_date, Number(line.quantity_in ?? 0), Number(line.quantity_out ?? 0));
  }
  for (const transaction of transactions ?? []) {
    // A transaction with detail lines is represented by those lines, not by
    // the parent header. This prevents double-counting movement activity.
    if (lineCountByTransaction.has(transaction.id)) continue;
    add(transaction.transaction_date, Number(transaction.quantity_in ?? 0), Number(transaction.quantity_out ?? 0));
  }

  const rows: InventoryDailyMovementRow[] = [];
  for (let cursor = new Date(`${start}T00:00:00Z`); cursor <= new Date(`${end}T00:00:00Z`); cursor = new Date(cursor.getTime() + 86_400_000)) {
    const transactionDate = cursor.toISOString().slice(0, 10);
    rows.push({ transaction_date: transactionDate, ...(activity.get(transactionDate) ?? { inbound_entries: 0, outbound_entries: 0, movement_entries: 0 }) });
  }
  return rows;
}

export async function getInventoryDailyMovement(period: "7d" | "30d" | "month" = "30d") {
  if (isMockMode()) return { rows: mockInventoryDailyMovement(period), unavailable: false };

  const supabase = await createClient();
  const { data, error } = await boundedInventoryInsight(() => supabase.rpc("get_inventory_daily_movement_summary", { p_period: period }));
  if (error || !data) {
    const readError = error ?? new Error("Inventory daily movement summary returned no data.");
    warnOptionalInventoryQuery("daily movement summary", readError);
    try {
      return { rows: await getInventoryDailyMovementFromBaseTables(supabase, period), unavailable: false };
    } catch (fallbackError) {
      warnOptionalInventoryQuery("daily movement summary table fallback", fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
      return { rows: [] as InventoryDailyMovementRow[], unavailable: true };
    }
  }
  return {
    rows: (data ?? []).map((row) => ({
      transaction_date: row.transaction_date,
      inbound_entries: Number(row.inbound_entries ?? 0),
      outbound_entries: Number(row.outbound_entries ?? 0),
      movement_entries: Number(row.movement_entries ?? 0),
    })),
    unavailable: false,
  };
}

async function getInventoryDashboardFallback(supabase: Awaited<ReturnType<typeof createClient>>, period: "7d" | "30d" | "month") {
  const today = todayInKualaLumpur();
  const periodStart = period === "7d"
    ? shiftBusinessDate(today, -6)
    : period === "month"
      ? `${today.slice(0, 7)}-01`
      : shiftBusinessDate(today, -29);
  const [balancesResult, transactionsResult, movementsTodayResult, receivingResult, transfersResult, stockCountResult] = await Promise.all([
    supabase
      .from("stock_balances_summary")
      .select("item_id, item_code, item_name, base_unit, branch_id, branch_name, current_qty, inventory_value, is_low_stock, shortage_quantity, status")
      .order("item_name", { ascending: true })
      .limit(MAX_INVENTORY_DASHBOARD_FALLBACK_BALANCES + 1),
    supabase.from("stock_transactions")
      .select("id, item_id, transaction_no, transaction_date, transaction_type, quantity_in, quantity_out")
      .eq("status", "posted")
      .gte("transaction_date", periodStart)
      .order("transaction_date", { ascending: false })
      .limit(8),
    supabase.from("stock_transactions").select("id", { count: "exact", head: true }).eq("status", "posted").eq("transaction_date", today),
    supabase.from("goods_receivings").select("id", { count: "exact", head: true }).eq("received_date", today).is("deleted_at", null),
    supabase.from("stock_transactions").select("id", { count: "exact", head: true }).eq("status", "posted").eq("transaction_date", today).in("transaction_type", ["transfer_in", "transfer_out"]),
    supabase.from("stock_counts").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "reviewed", "approved"]).is("deleted_at", null),
  ]);
  const fallbackBalancesTruncated = (balancesResult.data?.length ?? 0) > MAX_INVENTORY_DASHBOARD_FALLBACK_BALANCES;
  const balancesUnavailable = Boolean(balancesResult.error || !balancesResult.data || fallbackBalancesTruncated);
  const balances = balancesUnavailable ? [] : (balancesResult.data ?? []);
  const activeBalances = balances.filter((row) => row.status === "active");
  const lowStockRows = activeBalances
    .filter((row) => row.is_low_stock)
    .sort((left, right) => Number(right.shortage_quantity ?? 0) - Number(left.shortage_quantity ?? 0))
    .slice(0, 5);
  const transactionsUnavailable = Boolean(transactionsResult.error || !transactionsResult.data);
  const itemIds = [...new Set((transactionsResult.data ?? []).map((row) => row.item_id))];
  const { data: items, error: itemsError } = itemIds.length
    ? await supabase.from("items").select("id, item_name, base_unit").in("id", itemIds)
    : { data: [], error: null };
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const recentTransactions = (transactionsResult.data ?? []).map((transaction) => ({
    ...transaction,
    item: {
      id: transaction.item_id,
      item_name: itemById.get(transaction.item_id)?.item_name ?? "Unknown item",
      base_unit: itemById.get(transaction.item_id)?.base_unit ?? "",
    },
  }));
  const unavailable = {
    inventory: balancesUnavailable,
    movement: Boolean(transactionsUnavailable || movementsTodayResult.error || movementsTodayResult.count === null || itemsError || (itemIds.length > 0 && !items)),
    lowStock: Boolean(balancesResult.error || fallbackBalancesTruncated),
    stockCountDue: Boolean(stockCountResult.error || stockCountResult.count === null),
    todaysTransfers: Boolean(transfersResult.error || transfersResult.count === null),
    todaysReceiving: Boolean(receivingResult.error || receivingResult.count === null),
    pendingAdjustments: Boolean(stockCountResult.error || stockCountResult.count === null),
  };
  if (fallbackBalancesTruncated) {
    logServerWarning(
      new Error(`Dashboard fallback exceeded ${MAX_INVENTORY_DASHBOARD_FALLBACK_BALANCES} balances.`),
      { source: "inventory.optional.dashboard summary fallback limit" },
    );
  }
  warnOptionalInventoryQuery("dashboard summary fallback", balancesResult.error || transactionsResult.error || movementsTodayResult.error || receivingResult.error || transfersResult.error || stockCountResult.error || itemsError);
  return {
    inventoryValue: activeBalances.reduce((sum, row) => sum + Number(row.inventory_value ?? 0), 0),
    totalActiveItems: new Set(activeBalances.map((row) => row.item_id)).size,
    lowStockItems: activeBalances.filter((row) => row.is_low_stock).length,
    negativeStock: activeBalances.filter((row) => Number(row.current_qty ?? 0) < 0).length,
    todaysMovements: Number(movementsTodayResult.count ?? 0),
    todaysReceiving: Number(receivingResult.count ?? 0),
    todaysTransfers: Number(transfersResult.count ?? 0),
    pendingAdjustments: unavailable.pendingAdjustments ? 0 : Number(stockCountResult.count ?? 0),
    stockCountDue: Number(stockCountResult.count ?? 0),
    recentTransactions,
    topPurchasedItems: [],
    topConsumedItems: [],
    lowStockRows,
    inventoryUnavailable: unavailable.inventory,
    movementUnavailable: unavailable.movement,
    lowStockUnavailable: unavailable.lowStock,
    stockCountDueUnavailable: unavailable.stockCountDue,
    todaysTransfersUnavailable: unavailable.todaysTransfers,
    todaysReceivingUnavailable: unavailable.todaysReceiving,
    pendingAdjustmentsUnavailable: unavailable.pendingAdjustments,
    consumptionPeriod: period,
  };
}

const INVENTORY_PAGE_SIZE = 15;

type PaginatedRows<T> = {
  rows: T[];
  totalRows: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error: string | null;
  unavailable?: boolean;
};

function databasePaginationOrError<T>(rows: T[], totalRows: number | null, pageValue: string | undefined, error: string | null, pageSize = INVENTORY_PAGE_SIZE): PaginatedRows<T> {
  return { ...databasePagination(rows, totalRows, pageValue, pageSize), error };
}
const LEDGER_SORT_COLUMNS = new Set(["transaction_no", "transaction_date", "transaction_type", "item_code", "item_name", "branch_name", "quantity_in", "quantity_out", "running_balance"]);
const TRANSACTION_SORT_COLUMNS = new Set(["transaction_no", "transaction_date", "transaction_type", "status", "created_at", "posted_at"]);
const BALANCE_SORT_COLUMNS = new Set(["item_code", "item_name", "branch_name", "current_qty", "average_cost", "inventory_value", "last_movement"]);
const STOCK_CARD_FALLBACK_LIMIT = 5_000;
const STOCK_CARD_OPENING_FALLBACK_LIMIT = 20_000;

function warnOptionalInventoryQuery(name: string, error: { message?: string } | null | undefined) {
  if (error) logServerWarning(error, { source: `inventory.optional.${name}` });
}

function requestedPage(pageValue?: string) {
  const parsed = Number(pageValue ?? "1");
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 1) : 1;
}

function databasePagination<T>(rows: T[], totalRows: number | null, pageValue: string | undefined, pageSize = INVENTORY_PAGE_SIZE) {
  const total = totalRows ?? rows.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const page = pageValue === "all" ? 1 : Math.min(requestedPage(pageValue), totalPages);
  return { rows, totalRows: total, page, pageSize, totalPages };
}

function pageRange(pageValue: string | undefined, pageSize = INVENTORY_PAGE_SIZE) {
  if (pageValue === "all") return null;
  const page = requestedPage(pageValue);
  return { from: (page - 1) * pageSize, to: page * pageSize - 1 };
}

async function getStockCardFromBaseTables(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filters: Filters,
  from: string,
  to: string,
): Promise<StockCardResult> {
  let transactionQuery = supabase
    .from("stock_transactions")
    .select("id,transaction_no,document_id,branch_id,item_id,transaction_type,transaction_date,quantity_in,quantity_out,unit_cost,total_cost,status,posted_at,reference_type,reference_id,created_by,created_at")
    .eq("status", "posted")
    .gte("transaction_date", from)
    .lte("transaction_date", to)
    .order("transaction_date", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(STOCK_CARD_FALLBACK_LIMIT + 1);
  const itemId = filters.item_id && filters.item_id !== "all" ? filters.item_id : null;
  const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  if (itemId) transactionQuery = transactionQuery.eq("item_id", itemId);
  if (branchId) transactionQuery = transactionQuery.eq("branch_id", branchId);
  const { data: transactionData, error: transactionError } = await transactionQuery;
  if (transactionError) throw transactionError;
  if (!transactionData) throw new Error("Stock Card transaction fallback returned no data.");
  const transactions = transactionData;
  if (transactions.length > STOCK_CARD_FALLBACK_LIMIT) {
    throw new Error(`Stock Card fallback exceeded ${STOCK_CARD_FALLBACK_LIMIT} rows.`);
  }

  // The fallback must remain bounded too. Historical opening quantities come
  // from the maintained daily read model; querying the raw transaction stream
  // here would simply recreate the 57014 timeout that caused this fallback.
  let openingQuery = supabase
    .from("inventory_daily_summary")
    .select("item_id,branch_id,quantity_in,quantity_out", { count: "exact" })
    .lt("transaction_date", from)
    .limit(STOCK_CARD_OPENING_FALLBACK_LIMIT + 1);
  if (itemId) openingQuery = openingQuery.eq("item_id", itemId);
  if (branchId) openingQuery = openingQuery.eq("branch_id", branchId);
  const { data: openingData, error: openingError, count: openingCount } = await openingQuery;
  if (openingError) throw openingError;
  if (!openingData || openingCount === null || openingCount > STOCK_CARD_OPENING_FALLBACK_LIMIT) {
    throw new Error(`Stock Card opening fallback exceeded ${STOCK_CARD_OPENING_FALLBACK_LIMIT} summary rows.`);
  }
  const openingByKey = new Map<string, number>();
  for (const row of openingData) {
    const key = `${row.item_id}:${row.branch_id}`;
    openingByKey.set(key, (openingByKey.get(key) ?? 0) + Number(row.quantity_in ?? 0) - Number(row.quantity_out ?? 0));
  }

  const transactionIds = transactions.map((row) => row.id);
  const { data: lineData, error: lineError } = transactionIds.length
    ? await supabase
      .from("stock_transaction_lines")
      .select("id,stock_transaction_id,item_id,branch_id,quantity_in,quantity_out,unit_cost,total_cost,reference_type,reference_id,created_at")
      .in("stock_transaction_id", transactionIds)
    : { data: [], error: null };
  if (lineError) throw lineError;
  if (transactionIds.length && !lineData) throw new Error("Stock Card line fallback returned no data.");
  const lines = lineData ?? [];
  const itemIds = [...new Set([...transactions.map((row) => row.item_id), ...lines.map((row) => row.item_id).filter((id): id is string => Boolean(id))])];
  const branchIds = [...new Set([...transactions.map((row) => row.branch_id).filter((id): id is string => Boolean(id)), ...lines.map((row) => row.branch_id).filter((id): id is string => Boolean(id))])];
  const [{ data: items, error: itemsError }, { data: branches, error: branchesError }] = await Promise.all([
    itemIds.length ? supabase.from("items").select("id,item_code,item_name,base_unit").in("id", itemIds) : Promise.resolve({ data: [], error: null }),
    branchIds.length ? supabase.from("branches").select("id,branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsError) throw itemsError;
  if (branchesError) throw branchesError;
  if ((itemIds.length && !items) || (branchIds.length && !branches)) throw new Error("Stock Card reference fallback returned no data.");
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
  const linesByTransaction = new Map<string, typeof lines>();
  for (const line of lines) linesByTransaction.set(line.stock_transaction_id, [...(linesByTransaction.get(line.stock_transaction_id) ?? []), line]);

  const expanded = transactions.flatMap((transaction) => {
    const transactionLines = linesByTransaction.get(transaction.id) ?? [];
    const sourceLines = transactionLines.length ? transactionLines : [null];
    return sourceLines.map((line) => {
      const resolvedItemId = line?.item_id ?? transaction.item_id;
      const resolvedBranchId = line?.branch_id ?? transaction.branch_id;
      const item = itemById.get(resolvedItemId);
      return {
        stock_transaction_id: transaction.id,
        transaction_no: transaction.transaction_no,
        transaction_date: transaction.transaction_date,
        transaction_type: transaction.transaction_type,
        status: transaction.status,
        document_id: transaction.document_id,
        reference_type: line?.reference_type ?? transaction.reference_type,
        reference_id: line?.reference_id ?? transaction.reference_id,
        created_by: transaction.created_by,
        posted_at: transaction.posted_at,
        stock_transaction_line_id: line?.id ?? null,
        item_id: resolvedItemId,
        item_code: item?.item_code ?? "",
        item_name: item?.item_name ?? "Unavailable item",
        base_unit: item?.base_unit ?? "",
        branch_id: resolvedBranchId,
        branch_name: resolvedBranchId ? branchById.get(resolvedBranchId) ?? null : null,
        quantity_in: Number(line?.quantity_in ?? transaction.quantity_in ?? 0),
        quantity_out: Number(line?.quantity_out ?? transaction.quantity_out ?? 0),
        unit_cost: Number(line?.unit_cost ?? transaction.unit_cost ?? 0),
        total_cost: Number(line?.total_cost ?? transaction.total_cost ?? (Number(line?.unit_cost ?? transaction.unit_cost ?? 0) * Math.max(Number(line?.quantity_in ?? transaction.quantity_in ?? 0), Number(line?.quantity_out ?? transaction.quantity_out ?? 0)))),
        created_at: line?.created_at ?? transaction.created_at,
      };
    });
  }).sort((left, right) => `${left.transaction_date}|${left.created_at}|${left.stock_transaction_id}|${left.stock_transaction_line_id ?? ""}`.localeCompare(`${right.transaction_date}|${right.created_at}|${right.stock_transaction_id}|${right.stock_transaction_line_id ?? ""}`));

  const runningByKey = new Map<string, number>(openingByKey);
  const rows = expanded.map((row) => {
    const key = `${row.item_id}:${row.branch_id ?? ""}`;
    const runningBalance = (runningByKey.get(key) ?? 0) + row.quantity_in - row.quantity_out;
    runningByKey.set(key, runningBalance);
    return { ...row, running_balance: runningBalance } as StockLedgerViewRow;
  }).filter((row) => row.transaction_date >= from);
  const search = filters.search?.trim().toLowerCase();
  const source = filters.source?.trim().toLowerCase();
  const type = filters.type && filters.type !== "all" ? filters.type : null;
  const direction = filters.direction && filters.direction !== "all" ? filters.direction : null;
  const filtered = rows
    .filter((row) => search ? [row.transaction_no, row.transaction_type, row.item_code, row.item_name, row.branch_name].some((value) => String(value ?? "").toLowerCase().includes(search)) : true)
    .filter((row) => source ? [row.reference_type, row.reference_id, row.transaction_no].some((value) => String(value ?? "").toLowerCase().includes(source)) : true)
    .filter((row) => type ? row.transaction_type === type : true)
    .filter((row) => direction === "inbound" ? row.quantity_in > 0 : direction === "outbound" ? row.quantity_out > 0 : true);
  return { rows: filtered, unavailable: false };
}

function searchExpression(columns: string[], value: string | undefined) {
  const search = value?.trim();
  if (!search) return null;
  // PostgREST's `or` syntax uses commas and parentheses as control characters.
  // Remove those delimiters and escape LIKE wildcards before embedding a value.
  const term = search.replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
  return columns.map((column) => `${column}.ilike.%${term}%`).join(",");
}

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  const type = filters.type && filters.type !== "all" ? filters.type : null;
  const item = filters.item_id && filters.item_id !== "all" ? filters.item_id : null;
  const sort = filters.sort ?? String(defaultSort);
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
      const matchesType = type ? row.transaction_type === type : true;
      const matchesItem = item ? row.item_id === item : true;
      return matchesSearch && matchesType && matchesItem;
    })
    .sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

function filterLedgerRows(rows: StockLedgerViewRow[], filters: Filters) {
  const search = filters.search?.trim().toLowerCase();
  const source = filters.source?.trim().toLowerCase();
  const type = filters.type && filters.type !== "all" ? filters.type : null;
  const branch = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const item = filters.item_id && filters.item_id !== "all" ? filters.item_id : null;
  const direction = filters.direction && filters.direction !== "all" ? filters.direction : null;
  const from = filters.from;
  const to = filters.to;
  const sort = filters.sort ?? "transaction_date";
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => search ? [row.transaction_no, row.transaction_type, row.item_code, row.item_name, row.branch_name].some((value) => String(value ?? "").toLowerCase().includes(search)) : true)
    .filter((row) => source ? [row.reference_type, row.reference_id, row.transaction_no].some((value) => String(value ?? "").toLowerCase().includes(source)) : true)
    .filter((row) => type ? row.transaction_type === type : true)
    .filter((row) => branch ? row.branch_id === branch : true)
    .filter((row) => item ? row.item_id === item : true)
    .filter((row) => direction === "inbound" ? Number(row.quantity_in) > 0 : direction === "outbound" ? Number(row.quantity_out) > 0 : true)
    .filter((row) => from ? row.transaction_date >= from : true)
    .filter((row) => to ? row.transaction_date <= to : true)
    .sort((a, b) => compareTableValues(a[sort as keyof StockLedgerViewRow], b[sort as keyof StockLedgerViewRow], dir));
}

function hydrateTransaction(transaction: StockTransaction) {
  const item = mockItems.find((row) => row.id === transaction.item_id) ?? null;
  const branch = mockBranches.find((row) => row.id === transaction.branch_id) ?? null;
  return { ...transaction, item, branch };
}

export async function getStockTransactions(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockTransactions.map((transaction) => hydrateTransaction(transaction as StockTransaction));
    return paginateRows(filterRows(rows, filters, ["transaction_no", "transaction_type", "remarks", "reference_type"], "transaction_date"), filters.page, 15);
  }

  const supabase = await createClient();
  const sort = TRANSACTION_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "transaction_date";
  const ascending = filters.dir === "asc";
  let query = supabase.from("stock_transactions").select("*", { count: "exact" });
  if (filters.type && filters.type !== "all") query = query.eq("transaction_type", filters.type as StockTransaction["transaction_type"]);
  if (filters.item_id && filters.item_id !== "all") query = query.eq("item_id", filters.item_id);
  if (filters.branch_id && filters.branch_id !== "all") query = query.eq("branch_id", filters.branch_id);
  if (filters.from) query = query.gte("transaction_date", filters.from);
  if (filters.to) query = query.lte("transaction_date", filters.to);
  const search = searchExpression(["transaction_no", "transaction_type", "remarks", "reference_type"], filters.search);
  if (search) query = query.or(search);
  query = query.order(sort, { ascending }).order("created_at", { ascending: false });
  const range = pageRange(filters.page);
  if (range) query = query.range(range.from, range.to);

  const { data: transactions, error: transactionsError, count } = await query;
  if (transactionsError) throw new Error(transactionsError.message);

  const itemIds = [...new Set((transactions ?? []).map((transaction) => transaction.item_id))];
  const branchIds = [...new Set((transactions ?? []).map((transaction) => transaction.branch_id).filter((id): id is string => Boolean(id)))];
  const [{ data: items, error: itemsError }, { data: branches, error: branchesError }] = await Promise.all([
    itemIds.length
      ? supabase.from("items").select("id, item_code, item_name, base_unit").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    branchIds.length
      ? supabase.from("branches").select("id, branch_code, branch_name").in("id", branchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (branchesError) throw new Error(branchesError.message);

  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch]));

  const rows = (transactions ?? []).map((transaction) => ({
    ...transaction,
    item: itemById.get(transaction.item_id) ?? null,
    branch: transaction.branch_id ? branchById.get(transaction.branch_id) ?? null : null,
  }));
  return databasePagination(rows, count, filters.page);
}

export async function getStockBalances() {
  if (isMockMode()) {
    return getMockStockBalances();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_balances_summary")
    .select("*")
    .order("item_name", { ascending: true });

  if (error) {
    throw new Error(`Stock Balance could not be loaded: ${error.message}`);
  }
  if (!data) {
    throw new Error("Stock Balance data is temporarily unavailable.");
  }
  return data;
}

export async function getStockTransaction(id: string) {
  if (isMockMode()) {
    const row = requireDetailRow(mockStockTransactions.find((transaction) => transaction.id === id), "Stock transaction", id);
    return hydrateTransaction(row as StockTransaction);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("stock_transactions").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  const transaction = requireDetailRow(data, "Stock transaction", id);
  const [{ data: item, error: itemError }, { data: branch, error: branchError }] = await Promise.all([
    supabase.from("items").select("id, item_code, item_name, base_unit, item_image_url").eq("id", transaction.item_id).maybeSingle(),
    transaction.branch_id
      ? supabase.from("branches").select("id, branch_name").eq("id", transaction.branch_id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (itemError) throw new Error(itemError.message);
  if (branchError) throw new Error(branchError.message);
  return {
    ...transaction,
    item,
    branch,
  };
}

export async function getStockLedger(filters: Filters = {}) {
  if (isMockMode()) {
    const sorted = mockStockTransactions
      .map((transaction) => hydrateTransaction(transaction as StockTransaction))
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const balanceByKey = new Map<string, number>();
    const ledger = sorted.map((row) => {
      const key = `${row.item_id}:${row.branch_id}`;
      const balance = (balanceByKey.get(key) ?? 0) + row.quantity_in - row.quantity_out;
      balanceByKey.set(key, balance);
      return {
        stock_transaction_id: row.id,
        transaction_no: row.transaction_no,
        transaction_date: row.transaction_date,
        transaction_type: row.transaction_type,
        status: row.status,
        document_id: row.document_id,
        reference_type: row.reference_type,
        reference_id: row.reference_id,
        created_by: row.created_by,
        posted_at: row.posted_at,
        stock_transaction_line_id: null,
        item_id: row.item_id,
        item_code: row.item?.item_code ?? "",
        item_name: row.item?.item_name ?? "Unknown",
        base_unit: row.item?.base_unit ?? "",
        image_url: row.item?.item_image_url ?? null,
        branch_id: row.branch?.id ?? null,
        branch_name: row.branch?.branch_name ?? null,
        quantity_in: row.quantity_in,
        quantity_out: row.quantity_out,
        unit_cost: row.unit_cost ?? 0,
        total_cost: row.total_cost ?? (row.unit_cost ?? 0) * Math.max(row.quantity_in, row.quantity_out),
        running_balance: balance,
      };
    });
    const filtered = filterLedgerRows(ledger, filters);
    return paginateRows(filtered, filters.page, filters.page === "all" ? Math.max(filtered.length, 1) : 15);
  }

  const supabase = await createClient();
  const today = todayInKualaLumpur();
  const thirtyDaysAgo = shiftBusinessDate(today, -29);
  const from = filters.from || thirtyDaysAgo;
  const to = filters.to || today;
  const sort = LEDGER_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "transaction_date";
  const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const itemId = filters.item_id && filters.item_id !== "all" ? filters.item_id : null;
  const type = filters.type && filters.type !== "all" ? filters.type : null;
  const direction = filters.direction && filters.direction !== "all" ? filters.direction : null;
  const page = requestedPage(filters.page);
  const exportAll = filters.page === "all";
  const { data, error } = await boundedInventoryInsight(() => supabase.rpc("get_stock_ledger_bounded_page", {
    p_from: from,
    p_to: to,
    p_item_id: itemId,
    p_branch_id: branchId,
    p_transaction_type: type,
    p_direction: direction,
    p_search: filters.search?.trim() || null,
    p_source: filters.source?.trim() || null,
    p_sort: sort,
    p_dir: filters.dir === "asc" ? "asc" : "desc",
    p_offset: exportAll ? 0 : (page - 1) * INVENTORY_PAGE_SIZE,
    p_limit: exportAll ? 50000 : INVENTORY_PAGE_SIZE,
  }));
  if (error || !data) {
    const readError = error ?? new Error("Movement Ledger returned no data.");
    warnOptionalInventoryQuery("Movement Ledger", readError);
    try {
      const fallback = await getStockCardFromBaseTables(supabase, filters, from, to);
      const filtered = filterLedgerRows(fallback.rows, filters);
      return { ...databasePagination(filtered, filtered.length, filters.page), error: null, unavailable: false };
    } catch (fallbackError) {
      warnOptionalInventoryQuery("Movement Ledger table fallback", fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
      return { ...databasePagination([] as StockLedgerViewRow[], 0, filters.page), error: "Movement Ledger data is temporarily unavailable.", unavailable: true };
    }
  }
  const result = data;
  const totalRows = Number(result[0]?.total_count ?? 0);
  const rows = result.map((entry) => {
    const { total_count, ...row } = entry;
    void total_count;
    return row as StockLedgerViewRow;
  });
  return databasePagination(rows, totalRows, filters.page, exportAll ? Math.max(rows.length, 1) : INVENTORY_PAGE_SIZE);
}

export async function getStockBalanceDetails(filters: Filters = {}): Promise<PaginatedRows<StockBalanceRow>> {
  if (isMockMode()) {
    const ledger = await getStockLedger({ sort: "transaction_date", dir: "asc" });
    const allRows = ledger.rows;
    const grouped = new Map<string, (typeof allRows)[number][]>();
    allRows.forEach((row) => {
      const key = `${row.item_id}:${row.branch_id}`;
      grouped.set(key, [...(grouped.get(key) ?? []), row]);
    });
    const rows = Array.from(grouped.values()).map((rowsForKey) => {
      const latest = rowsForKey[rowsForKey.length - 1];
      const inbound = rowsForKey.filter((row) => row.quantity_in > 0);
      const totalIn = inbound.reduce((sum, row) => sum + row.quantity_in, 0);
      const avgCost = totalIn > 0 ? inbound.reduce((sum, row) => sum + row.total_cost, 0) / totalIn : 0;
      const item = mockItems.find((row) => row.id === latest.item_id);
      const currentQty = rowsForKey.reduce((sum, row) => sum + row.quantity_in - row.quantity_out, 0);
      return {
        item_id: latest.item_id,
        item_code: latest.item_code,
        item_name: latest.item_name,
        supplier_id: null,
        supplier_name: null,
        purchase_unit: latest.base_unit,
        base_unit: latest.base_unit,
        conversion_to_base_unit: 1,
        image_url: item?.item_image_url ?? null,
        branch_id: latest.branch_id,
        branch_name: latest.branch_name,
        available_qty: currentQty,
        reserved_qty: 0,
        current_qty: currentQty,
        average_cost: avgCost,
        inventory_value: currentQty * avgCost,
        last_movement: latest.transaction_date,
        item_status: item?.status ?? "unknown",
        status: currentQty < 0 ? "negative" : currentQty <= (item?.safety_stock ?? 0) ? "low_stock" : "ok",
      };
    });
    const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
    const scopeRows = branchId ? rows.filter((row) => row.branch_id === branchId) : rows;
    const filtered = filterRows(scopeRows, filters, ["item_code", "item_name", "branch_name", "status"], "item_name");
    return databasePaginationOrError(filtered, filtered.length, filters.page, null, filters.page === "all" ? Math.max(filtered.length, 1) : 15);
  }

  const supabase = await createClient();
  const sort = BALANCE_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "item_name";
  const ascending = filters.dir === "desc" ? false : true;
  const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  let query = supabase.from("stock_balances_summary").select("*", { count: "exact" });
  if (branchId) query = query.eq("branch_id", branchId);
  if (status === "negative") query = query.lt("current_qty", 0);
  if (status === "low_stock") query = query.gt("current_qty", 0).eq("is_low_stock", true);
  if (status === "ok") query = query.gte("current_qty", 0).or("is_low_stock.eq.false,current_qty.eq.0");
  const search = searchExpression(["item_code", "item_name", "branch_name"], filters.search);
  if (search) query = query.or(search);
  query = query.order(sort, { ascending }).order("item_id", { ascending: true });
  const range = pageRange(filters.page);
  if (range) query = query.range(range.from, range.to);
  const { data, error, count } = await query;
  if (error) {
    const message = `Stock Balance could not be loaded: ${error.message}`;
    warnOptionalInventoryQuery("Stock Balance details", error);
    return { ...databasePaginationOrError<StockBalanceRow>([], 0, filters.page, message), unavailable: true };
  }
  if (!data || count === null) {
    const message = "Stock Balance data is temporarily unavailable.";
    warnOptionalInventoryQuery("Stock Balance details", new Error(message));
    return { ...databasePaginationOrError<StockBalanceRow>([], 0, filters.page, message), unavailable: true };
  }
  const balanceRows = data;
  const itemIds = Array.from(new Set(balanceRows.map((row) => row.item_id))).slice(0, 500);
  const branchIds = Array.from(new Set(balanceRows.map((row) => row.branch_id).filter((id): id is string => Boolean(id))));
  const imageByItemId = new Map<string, string | null>();
  const itemDefaultById = new Map<string, { supplier_id: string | null; purchase_unit: string; base_unit: string; status: string }>();
  for (let offset = 0; offset < itemIds.length; offset += 100) {
    const images = await supabase
      .from("items")
      .select("id, item_image_url, supplier_id, purchase_unit, base_unit, status")
      .in("id", itemIds.slice(offset, offset + 100));
    if (images.error) {
      warnOptionalInventoryQuery("Stock Balance item images", images.error);
      break;
    }
    images.data?.forEach((item) => {
      imageByItemId.set(item.id, item.item_image_url);
      itemDefaultById.set(item.id, { supplier_id: item.supplier_id, purchase_unit: item.purchase_unit, base_unit: item.base_unit, status: item.status });
    });
  }
  const { data: branchMappings, error: branchMappingsError } = itemIds.length && branchIds.length
    ? await supabase.from("branch_supplier_items").select("branch_id, item_id, supplier_item_id, is_preferred").in("branch_id", branchIds).in("item_id", itemIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (branchMappingsError) warnOptionalInventoryQuery("Stock Balance branch sourcing", branchMappingsError);
  const supplierItemIds = [...new Set((branchMappings ?? []).map((mapping) => mapping.supplier_item_id))];
  const { data: supplierItems, error: supplierItemsError } = supplierItemIds.length
    ? await supabase.from("supplier_items").select("id, item_id, supplier_id, purchase_uom, conversion_to_base_uom").in("id", supplierItemIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (supplierItemsError) warnOptionalInventoryQuery("Stock Balance supplier relationships", supplierItemsError);
  const supplierIds = [...new Set([
    ...(supplierItems ?? []).map((relationship) => relationship.supplier_id),
    ...Array.from(itemDefaultById.values()).map((item) => item.supplier_id).filter((id): id is string => Boolean(id)),
  ])];
  const { data: suppliers, error: suppliersError } = supplierIds.length
    ? await supabase.from("suppliers").select("id, name").in("id", supplierIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (suppliersError) warnOptionalInventoryQuery("Stock Balance supplier names", suppliersError);
  const relationshipById = new Map((supplierItems ?? []).map((relationship) => [relationship.id, relationship]));
  const supplierNameById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier.name]));
  const rows = balanceRows.map((row) => ({
    ...(() => {
      if (branchMappingsError || suppliersError) return { ...row, supplier_id: null, supplier_name: null };
      const pairMappings = (branchMappings ?? []).filter((mapping) => mapping.branch_id === row.branch_id && mapping.item_id === row.item_id);
      if (!pairMappings.length) {
        const itemDefault = itemDefaultById.get(row.item_id);
        const supplierName = itemDefault?.supplier_id ? supplierNameById.get(itemDefault.supplier_id) : null;
        if (!itemDefault?.supplier_id || !supplierName) return { ...row, supplier_id: null, supplier_name: null };
        return {
          ...row,
          supplier_id: itemDefault.supplier_id,
          supplier_name: supplierName,
          purchase_unit: itemDefault.purchase_unit || itemDefault.base_unit,
        };
      }
      const chosen = pairMappings.find((mapping) => mapping.is_preferred) ?? (pairMappings.length === 1 ? pairMappings[0] : null);
      const relationship = chosen ? relationshipById.get(chosen.supplier_item_id) : null;
      const supplierName = relationship ? supplierNameById.get(relationship.supplier_id) : null;
      if (!relationship || relationship.item_id !== row.item_id || !supplierName) return { ...row, supplier_id: null, supplier_name: null };
      return {
        ...row,
        supplier_id: relationship.supplier_id,
        supplier_name: supplierName,
        purchase_unit: relationship.purchase_uom,
        conversion_to_base_unit: relationship.conversion_to_base_uom ?? row.conversion_to_base_unit,
      };
    })(),
    item_status: itemDefaultById.get(row.item_id)?.status ?? "unknown",
    image_url: imageByItemId.get(row.item_id) ?? null,
    available_qty: row.current_qty,
    reserved_qty: 0,
    status: Number(row.current_qty) < 0
      ? "negative"
      : Number(row.current_qty) <= Number(row.safety_stock ?? 0) && Number(row.current_qty) > 0
        ? "low_stock"
        : "ok",
  }));
  return databasePaginationOrError(rows, count, filters.page, null);
}

export async function getInventoryDashboard(period: "7d" | "30d" | "month" = "30d") {
  if (isMockMode()) {
    const balances = getMockStockBalances();
    const transactions = mockStockTransactions.slice(0, 8).map((row) => ({
      ...row,
      item: mockItems.find((item) => item.id === row.item_id) ?? null,
    }));
    return {
      inventoryValue: balances.reduce((sum, row) => sum + Number(row.current_stock ?? 0) * Number(row.cost ?? 0), 0),
      totalActiveItems: mockItems.filter((item) => item.status === "active").length,
      lowStockItems: balances.filter((row) => row.is_low_stock).length,
      negativeStock: balances.filter((row) => Number(row.current_stock ?? 0) < 0).length,
      todaysMovements: 0,
      todaysReceiving: 0,
      todaysTransfers: 0,
      pendingAdjustments: 0,
      stockCountDue: 0,
      recentTransactions: transactions,
      topPurchasedItems: [],
      topConsumedItems: [],
      lowStockRows: getMockLowStockItems().slice(0, 5).map((row) => ({
        ...row,
        autocount_code: null,
        branch_id: null,
        branch_name: null,
        current_qty: row.current_stock,
        total_quantity_in: row.current_stock,
        total_quantity_out: 0,
        inventory_value: row.current_stock * row.cost,
        average_cost: row.cost,
        last_movement: null,
        shortage_quantity: Math.max(Number(row.safety_stock) - Number(row.current_stock), 0),
      })),
      inventoryUnavailable: false,
      movementUnavailable: false,
      lowStockUnavailable: false,
      stockCountDueUnavailable: false,
      todaysTransfersUnavailable: false,
      todaysReceivingUnavailable: false,
      pendingAdjustmentsUnavailable: false,
      consumptionPeriod: period,
    };
  }

  const supabase = await createClient();
  const { data, error } = await boundedInventoryInsight(() => supabase.rpc("get_inventory_dashboard_summary", { p_period: period }));
  if (error || !data) {
    warnOptionalInventoryQuery("dashboard summary", error);
    return await getInventoryDashboardFallback(supabase, period);
  }

  if (!isCompleteInventoryDashboardRpc(data)) {
    logServerWarning(
      new Error("Inventory dashboard summary returned an incomplete payload."),
      { source: "inventory.optional.dashboard summary incomplete payload" },
    );
    return await getInventoryDashboardFallback(supabase, period);
  }

  const summary = data;
  return {
    inventoryValue: Number(summary.inventory_value ?? 0),
    totalActiveItems: Number(summary.total_active_items ?? 0),
    lowStockItems: Number(summary.low_stock_items_count ?? 0),
    negativeStock: Number(summary.negative_stock ?? 0),
    todaysMovements: Number(summary.todays_movements ?? 0),
    todaysReceiving: Number(summary.todays_receiving ?? 0),
    todaysTransfers: Number(summary.todays_transfers ?? 0),
    pendingAdjustments: Number(summary.pending_adjustments ?? 0),
    stockCountDue: Number(summary.stock_count_due ?? 0),
    recentTransactions: (summary.recent_transactions ?? []).map((transaction) => ({
      ...transaction,
      item: {
        id: transaction.item_id,
        item_name: transaction.item_name,
        base_unit: transaction.base_unit,
      },
    })),
    topPurchasedItems: summary.top_purchased_items ?? [],
    topConsumedItems: summary.top_consumed_items ?? [],
    lowStockRows: summary.low_stock_rows ?? [],
    inventoryUnavailable: false,
    movementUnavailable: false,
    lowStockUnavailable: false,
    stockCountDueUnavailable: false,
    todaysTransfersUnavailable: false,
    todaysReceivingUnavailable: false,
    pendingAdjustmentsUnavailable: false,
    consumptionPeriod: period,
  };
}

export async function getStockCardResult(filters: Filters = {}): Promise<StockCardResult> {
  if (!isMockMode()) {
    const today = todayInKualaLumpur();
    const from = filters.from || today;
    const to = filters.to || from;
    const supabase = await createClient();
    const { data, error } = await boundedInventoryInsight(() => supabase.rpc("get_stock_card_bounded", {
      p_from: from,
      p_to: to,
      p_item_id: filters.item_id && filters.item_id !== "all" ? filters.item_id : null,
      p_branch_id: filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null,
      p_transaction_type: filters.type && filters.type !== "all" ? filters.type : null,
      p_direction: filters.direction && filters.direction !== "all" ? filters.direction : null,
      p_search: filters.search?.trim() || null,
      p_source: filters.source?.trim() || null,
    }));
    if (error || !data) {
      const readError = error ?? new Error("Stock Card returned no data.");
      warnOptionalInventoryQuery("Stock Card", readError);
      try {
        // Do not fall back to stock_ledger_view: it computes an unbounded
        // running window before PostgREST filters and is the source of the
        // repeated statement timeouts in the supplied Supabase logs. The
        // table fallback keeps the same RLS boundary and computes balances
        // only after a strictly bounded date/read set is materialized.
        return await getStockCardFromBaseTables(supabase, filters, from, to);
      } catch (fallbackError) {
        warnOptionalInventoryQuery("Stock Card table fallback", fallbackError instanceof Error ? fallbackError : new Error(String(fallbackError)));
        return { rows: [], unavailable: true };
      }
    }
    return { rows: data, unavailable: false };
  }

  const ledger = await getStockLedger({ ...filters, page: "all" });
  const itemId = filters.item_id && filters.item_id !== "all" ? filters.item_id : null;
  const rows = (itemId ? ledger.rows.filter((row) => row.item_id === itemId) : ledger.rows)
    .filter((row) => filters.from ? row.transaction_date >= filters.from : true)
    .filter((row) => filters.to ? row.transaction_date <= filters.to : true);
  return {
    rows: rows.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()),
    unavailable: false,
  };
}

export async function getStockCard(filters: Filters = {}) {
  return (await getStockCardResult(filters)).rows;
}

async function loadLowStockItems(filters: Filters = {}) {
  if (isMockMode()) {
    return getMockLowStockItems().map((row) => ({
      ...row,
      purchase_unit: row.base_unit,
      conversion_to_base_unit: 1,
      status: "active" as const,
      branch_id: null,
      branch_name: null,
      total_quantity_in: row.current_stock,
      total_quantity_out: 0,
      current_qty: row.current_stock,
      average_cost: row.cost,
      inventory_value: row.current_stock * row.cost,
      last_movement: null,
      is_low_stock: true,
      stock_status: row.current_stock <= 0 ? "out_of_stock" as const : "low_stock" as const,
      suggested_reorder_qty: Math.max(Number(row.safety_stock) - Number(row.current_stock), Number(row.moq), 1),
    }));
  }

  const supabase = await createClient();
  let query = supabase
    .from("stock_balances_summary")
    .select("*")
    .eq("status", "active")
    .eq("is_low_stock", true)
    .order("shortage_quantity", { ascending: false })
    .order("item_name", { ascending: true });
  const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  if (branchId) query = query.eq("branch_id", branchId);
  const summaryResult = await query;
  const data = summaryResult.data;
  let error = summaryResult.error;
  let fallbackData: unknown[] | null = null;
  // The pre-aggregated summary can briefly be empty while its refresh trigger
  // catches up, and older linked deployments may not have the summary grant
  // yet. Keep the canonical view as a read-only fallback, while preserving a
  // successful empty result as the valid healthy state it represents.
  const summaryError = error ?? (data == null ? new Error("Low stock summary returned no data.") : null);
  if (summaryError || !data?.length) {
    warnOptionalInventoryQuery("low stock summary fallback", summaryError);
    let viewQuery = supabase
      .from("stock_balances_view")
      .select("*")
      .eq("status", "active")
      .order("shortage_quantity", { ascending: false })
      .order("item_name", { ascending: true });
    if (branchId) viewQuery = viewQuery.eq("branch_id", branchId);
    const viewResult = await viewQuery;
    if (viewResult.data?.length) {
      fallbackData = viewResult.data;
      error = null;
    } else if (viewResult.error) {
      warnOptionalInventoryQuery("low stock canonical fallback", viewResult.error);
      // Older linked deployments may still expose the original read-only
      // low_stock_items view while the pre-aggregated summary/view is being
      // repaired. Keep this as a final read-only compatibility path.
      if (!branchId) {
        const legacyResult = await supabase
          .from("low_stock_items")
          .select("*")
          .order("shortage_quantity", { ascending: false })
          .order("item_name", { ascending: true });
        if (legacyResult.data) {
          fallbackData = legacyResult.data;
          error = null;
        } else {
          warnOptionalInventoryQuery("low stock legacy fallback", legacyResult.error ?? viewResult.error);
          error = legacyResult.error ?? viewResult.error;
        }
      } else {
        // The legacy view has no branch key in the generated schema, so never
        // use it for a branch-scoped request.
        error = viewResult.error;
      }
    } else {
      fallbackData = viewResult.data ?? [];
      error = null;
    }
  }
  if (error) {
    warnOptionalInventoryQuery("low stock items", error);
    throw new Error(`Low stock could not be loaded: ${error.message}`);
  }
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const rows = ((fallbackData ?? data) as unknown as LowStockRow[])
    .filter((row) => search ? [row.item_code, row.item_name, row.branch_name, row.supplier_name].some((value) => String(value ?? "").toLowerCase().includes(search)) : true)
    .map((row) => {
      const current = Number(row.current_qty ?? row.current_stock ?? 0);
      const safety = Number(row.safety_stock ?? 0);
      const shortage = safety - current;
      const suggested = Math.max(shortage, Number(row.moq ?? 0), 1);
      return {
        ...row,
        stock_status: current <= 0 ? "out_of_stock" : "low_stock",
        suggested_reorder_qty: suggested,
      } satisfies LowStockRow;
    })
    .filter((row) => Number(row.current_qty ?? row.current_stock ?? 0) <= Number(row.safety_stock ?? 0) || Number(row.current_qty ?? row.current_stock ?? 0) <= 0)
    .filter((row) => status ? row.stock_status === status : true)
    .sort((a, b) => (a.stock_status === b.stock_status ? b.suggested_reorder_qty - a.suggested_reorder_qty : a.stock_status === "out_of_stock" ? -1 : 1));
  return rows;
}

export type LowStockResult = { rows: Awaited<ReturnType<typeof loadLowStockItems>>; count: number | null; unavailable: boolean };

export async function getLowStockResult(filters: Filters = {}): Promise<LowStockResult> {
  try {
    const rows = await loadLowStockItems(filters);
    return { rows, count: rows.length, unavailable: false };
  } catch (error) {
    warnOptionalInventoryQuery("low stock result", error instanceof Error ? error : new Error(String(error)));
    return { rows: [], count: null, unavailable: true };
  }
}

export async function getLowStockItems(filters: Filters = {}) {
  const result = await getLowStockResult(filters);
  if (result.unavailable) throw new Error("Low stock could not be loaded.");
  return result.rows;
}
