import { createClient } from "@/lib/supabase/server";
import {
  getMockLowStockItems,
  getMockStockBalances,
  isMockMode,
  mockBranches,
  mockItems,
  mockLocations,
  mockStockTransactions,
} from "@/lib/mock-mode";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type StockTransaction = Database["public"]["Tables"]["stock_transactions"]["Row"];
type StockLedgerViewRow = Database["public"]["Views"]["stock_ledger_view"]["Row"];
type StockBalanceDetail = Database["public"]["Views"]["stock_balances_view"]["Row"] & {
  barcode: string | null;
  image_url: string | null;
  available_qty: number;
  reserved_qty: number;
  status: string;
};
type LowStockRow = Database["public"]["Views"]["stock_balances_view"]["Row"] & {
  stock_status: "out_of_stock" | "low_stock";
  suggested_reorder_qty: number;
};

function warnOptionalInventoryQuery(name: string, error: { message?: string } | null | undefined) {
  if (error) console.warn(`[inventory] Optional ${name} query failed: ${error.message ?? "Unknown error"}`);
}

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], defaultSort: keyof T) {
  const search = filters.search?.trim().toLowerCase();
  const type = filters.type && filters.type !== "all" ? filters.type : null;
  const location = filters.location_id && filters.location_id !== "all" ? filters.location_id : null;
  const item = filters.item_id && filters.item_id !== "all" ? filters.item_id : null;
  const sort = filters.sort ?? String(defaultSort);
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
      const matchesType = type ? row.transaction_type === type : true;
      const matchesLocation = location ? row.location_id === location : true;
      const matchesItem = item ? row.item_id === item : true;
      return matchesSearch && matchesType && matchesLocation && matchesItem;
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
    .filter((row) => search ? [row.transaction_no, row.transaction_type, row.item_code, row.item_name, row.branch_name, row.location_name].some((value) => String(value ?? "").toLowerCase().includes(search)) : true)
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
  const location = mockLocations.find((row) => row.id === transaction.location_id) ?? null;
  const branch = mockBranches.find((row) => row.id === transaction.branch_id || row.id === location?.branch_id) ?? null;
  return { ...transaction, item, location, branch };
}

export async function getStockTransactions(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockTransactions.map((transaction) => hydrateTransaction(transaction as StockTransaction));
    return paginateRows(filterRows(rows, filters, ["transaction_no", "transaction_type", "remarks", "reference_type"], "transaction_date"), filters.page, 15);
  }

  const supabase = await createClient();
  const [
    { data: transactions, error: transactionsError },
    { data: items, error: itemsError },
    { data: locations, error: locationsError },
  ] = await Promise.all([
    supabase
      .from("stock_transactions")
      .select("*")
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("items").select("id, item_code, item_name, base_unit"),
    supabase.from("locations").select("id, location_code, location_name"),
  ]);

  if (transactionsError) throw new Error(transactionsError.message);
  if (itemsError) throw new Error(itemsError.message);
  if (locationsError) throw new Error(locationsError.message);

  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const locationById = new Map((locations ?? []).map((location) => [location.id, location]));

  const rows = (transactions ?? []).map((transaction) => ({
    ...transaction,
    item: itemById.get(transaction.item_id) ?? null,
    location: locationById.get(transaction.location_id) ?? null,
  }));
  return paginateRows(filterRows(rows, filters, ["transaction_no", "transaction_type", "remarks", "reference_type"], "transaction_date"), filters.page, 15);
}

export async function getStockBalances() {
  if (isMockMode()) {
    return getMockStockBalances();
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_balances_view")
    .select("*")
    .order("item_name", { ascending: true });

  if (error) {
    warnOptionalInventoryQuery("stock balances", error);
    return [];
  }
  return data;
}

export async function getStockTransaction(id: string) {
  if (isMockMode()) {
    const row = mockStockTransactions.find((transaction) => transaction.id === id);
    if (!row) throw new Error("Mock stock transaction not found");
    return hydrateTransaction(row as StockTransaction);
  }

  const supabase = await createClient();
  const [{ data, error }, { data: items }, { data: locations }, { data: branches }] = await Promise.all([
    supabase.from("stock_transactions").select("*").eq("id", id).single(),
    supabase.from("items").select("id, item_code, item_name, base_unit, barcode, internal_barcode, item_image_url"),
    supabase.from("locations").select("id, location_code, location_name, branch_id"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const locationById = new Map((locations ?? []).map((location) => [location.id, location]));
  const branchById = new Map((branches ?? []).map((branch) => [branch.id, branch]));
  const location = locationById.get(data.location_id) ?? null;
  return {
    ...data,
    item: itemById.get(data.item_id) ?? null,
    location,
    branch: data.branch_id ? branchById.get(data.branch_id) ?? null : location?.branch_id ? branchById.get(location.branch_id) ?? null : null,
  };
}

export async function getStockLedger(filters: Filters = {}) {
  if (isMockMode()) {
    const sorted = mockStockTransactions
      .map((transaction) => hydrateTransaction(transaction as StockTransaction))
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime() || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const balanceByKey = new Map<string, number>();
    const ledger = sorted.map((row) => {
      const key = `${row.item_id}:${row.location_id}`;
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
        barcode: row.item?.barcode ?? row.item?.internal_barcode ?? null,
        image_url: row.item?.item_image_url ?? null,
        branch_id: row.branch?.id ?? null,
        branch_name: row.branch?.branch_name ?? null,
        location_id: row.location_id,
        location_name: row.location?.location_name ?? "-",
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
  const { data, error } = await supabase.from("stock_ledger_view").select("*").order("transaction_date", { ascending: false });
  if (error) {
    warnOptionalInventoryQuery("Movement Ledger", error);
    return paginateRows([] as StockLedgerViewRow[], filters.page, filters.page === "all" ? 1 : 15);
  }
  const filtered = filterLedgerRows(data ?? [], filters);
  return paginateRows(filtered, filters.page, filters.page === "all" ? Math.max(filtered.length, 1) : 15);
}

export async function getStockBalanceDetails(filters: Filters = {}) {
  const aggregateByBranch = filters.view !== "location";
  if (isMockMode()) {
    const ledger = await getStockLedger({ sort: "transaction_date", dir: "asc" });
    const allRows = ledger.rows;
    const grouped = new Map<string, (typeof allRows)[number][]>();
    allRows.forEach((row) => {
      const key = `${row.item_id}:${row.location_id}`;
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
        base_unit: latest.base_unit,
        barcode: item?.barcode ?? item?.internal_barcode ?? null,
        image_url: item?.item_image_url ?? null,
        branch_id: latest.branch_id,
        branch_name: latest.branch_name,
        location_id: latest.location_id,
        location_name: latest.location_name,
        available_qty: currentQty,
        reserved_qty: 0,
        current_qty: currentQty,
        average_cost: avgCost,
        inventory_value: currentQty * avgCost,
        last_movement: latest.transaction_date,
        status: currentQty < 0 ? "negative" : currentQty <= (item?.safety_stock ?? 0) ? "low_stock" : "ok",
      };
    });
    const displayRows = aggregateByBranch ? aggregateStockByBranch(rows) : rows;
    const filtered = filterRows(displayRows, filters, ["item_code", "item_name", "barcode", "branch_name", "location_name", "status"], "item_name");
    return paginateRows(filtered, filters.page, filters.page === "all" ? Math.max(filtered.length, 1) : 15);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("stock_balances_view").select("*").order("item_name", { ascending: true });
  if (error) {
    warnOptionalInventoryQuery("stock balance details", error);
    return paginateRows([] as StockBalanceDetail[], filters.page, filters.page === "all" ? 1 : 15);
  }
  const rows = (data ?? []).map((row) => ({
    ...row,
    barcode: null,
    image_url: null,
    available_qty: row.current_qty,
    reserved_qty: 0,
    status: row.current_qty < 0 ? "negative" : "ok",
  }));
  const displayRows = aggregateByBranch ? aggregateStockByBranch(rows) : rows;
  const filtered = filterRows(displayRows, filters, ["item_code", "item_name", "branch_name", "location_name", "status"], "item_name");
  return paginateRows(filtered, filters.page, filters.page === "all" ? Math.max(filtered.length, 1) : 15);
}

function aggregateStockByBranch<T extends {
  item_id: string;
  item_code: string;
  item_name: string;
  base_unit: string;
  barcode: string | null;
  image_url: string | null;
  branch_id: string | null;
  branch_name: string | null;
  location_id: string;
  location_name: string;
  available_qty: number;
  reserved_qty: number;
  current_qty: number;
  average_cost: number;
  inventory_value: number;
  last_movement: string | null;
  status: string;
}>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  rows.forEach((row) => {
    const key = `${row.branch_id ?? "no-branch"}:${row.item_id}`;
    grouped.set(key, [...(grouped.get(key) ?? []), row]);
  });

  return Array.from(grouped.values()).map((rowsForKey) => {
    const first = rowsForKey[0];
    const currentQty = rowsForKey.reduce((sum, row) => sum + Number(row.current_qty), 0);
    const availableQty = rowsForKey.reduce((sum, row) => sum + Number(row.available_qty), 0);
    const reservedQty = rowsForKey.reduce((sum, row) => sum + Number(row.reserved_qty), 0);
    const inventoryValue = rowsForKey.reduce((sum, row) => sum + Number(row.inventory_value), 0);
    const averageCost = currentQty > 0 ? inventoryValue / currentQty : first.average_cost;
    const lastMovement = rowsForKey.map((row) => row.last_movement).filter(Boolean).sort().at(-1) ?? null;

    return {
      ...first,
      location_id: `${first.branch_id ?? "no-branch"}:all`,
      location_name: "All locations",
      available_qty: availableQty,
      reserved_qty: reservedQty,
      current_qty: currentQty,
      average_cost: averageCost,
      inventory_value: inventoryValue,
      last_movement: lastMovement,
      status: currentQty < 0 ? "negative" : rowsForKey.some((row) => row.status === "low_stock") ? "low_stock" : "ok",
    };
  });
}

export async function getInventoryDashboard(period: "7d" | "30d" | "month" = "30d") {
  const balances = await getStockBalanceDetails({ page: "all" });
  const ledger = await getStockLedger({ page: "all" });
  const rows = balances.rows;
  const movements = ledger.rows;
  const today = new Date().toISOString().slice(0, 10);
  let operationCounts = {
    totalActiveItems: mockItems.filter((item) => item.status === "active").length,
    todaysReceiving: movements.filter((row) => row.transaction_date === today && row.transaction_type === "purchase").length,
    todaysTransfers: movements.filter((row) => row.transaction_date === today && ["transfer_in", "transfer_out"].includes(row.transaction_type)).length,
    pendingAdjustments: 0,
    stockCountDue: 0,
  };
  if (!isMockMode()) {
    const supabase = await createClient();
    const [items, receiving, transfers, pendingAdjustments, stockCountDue] = await Promise.all([
      supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
      supabase.from("goods_receivings").select("id", { count: "exact", head: true }).eq("received_date", today).is("deleted_at", null),
      supabase.from("stock_transfers").select("id", { count: "exact", head: true }).eq("transfer_date", today).is("deleted_at", null),
      supabase.from("stock_counts").select("id", { count: "exact", head: true }).in("status", ["reviewed", "approved"]).is("deleted_at", null),
      supabase.from("stock_counts").select("id", { count: "exact", head: true }).in("status", ["draft", "submitted", "reviewed", "approved"]).is("deleted_at", null),
    ]);
    for (const result of [items, receiving, transfers, pendingAdjustments, stockCountDue]) {
      if (result.error) warnOptionalInventoryQuery("dashboard counter", result.error);
    }
    operationCounts = {
      totalActiveItems: items.count ?? 0,
      todaysReceiving: receiving.count ?? 0,
      todaysTransfers: transfers.count ?? 0,
      pendingAdjustments: pendingAdjustments.count ?? 0,
      stockCountDue: stockCountDue.count ?? 0,
    };
  }
  const periodStart = new Date();
  if (period === "7d") periodStart.setDate(periodStart.getDate() - 7);
  else if (period === "30d") periodStart.setDate(periodStart.getDate() - 30);
  else periodStart.setDate(1);
  const purchased = new Map<string, number>();
  const consumed = new Map<string, number>();
  movements.forEach((row) => {
    if (row.quantity_in > 0 && row.transaction_type === "purchase") purchased.set(row.item_name, (purchased.get(row.item_name) ?? 0) + row.quantity_in);
    if (row.quantity_out > 0 && row.transaction_type === "production_usage" && new Date(row.transaction_date) >= periodStart) consumed.set(row.item_name, (consumed.get(row.item_name) ?? 0) + row.quantity_out);
  });
  const top = (map: Map<string, number>) => Array.from(map.entries()).map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty).slice(0, 5);
  const lowStockRows = await getLowStockItems();
  return {
    inventoryValue: rows.reduce((sum, row) => sum + row.inventory_value, 0),
    totalActiveItems: operationCounts.totalActiveItems,
    lowStockItems: rows.filter((row) => row.status === "low_stock").length,
    negativeStock: rows.filter((row) => row.current_qty < 0).length,
    todaysMovements: movements.filter((row) => row.transaction_date === today).length,
    todaysReceiving: operationCounts.todaysReceiving,
    todaysTransfers: operationCounts.todaysTransfers,
    pendingAdjustments: operationCounts.pendingAdjustments,
    stockCountDue: operationCounts.stockCountDue,
    recentTransactions: movements.slice(0, 8),
    topPurchasedItems: top(purchased),
    topConsumedItems: top(consumed),
    lowStockRows,
    consumptionPeriod: period,
  };
}

export async function getStockCard(filters: Filters = {}) {
  const ledger = await getStockLedger({ ...filters, page: "all" });
  const itemId = filters.item_id;
  const rows = (itemId ? ledger.rows.filter((row) => row.item_id === itemId) : ledger.rows)
    .filter((row) => filters.from ? row.transaction_date >= filters.from : true)
    .filter((row) => filters.to ? row.transaction_date <= filters.to : true);
  return rows.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
}

export async function getLowStockItems(filters: Filters = {}) {
  if (isMockMode()) {
    return getMockLowStockItems().map((row) => ({
      ...row,
      purchase_unit: row.base_unit,
      conversion_to_base_unit: 1,
      status: "active" as const,
      branch_id: null,
      branch_name: null,
      location_id: "mock",
      location_name: "All locations",
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
  const { data, error } = await supabase.from("stock_balances_view").select("*").order("item_name", { ascending: true });
  if (error) {
    warnOptionalInventoryQuery("low stock items", error);
    return [];
  }
  const search = filters.search?.trim().toLowerCase();
  const branchId = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const rows = ((data ?? []) as Database["public"]["Views"]["stock_balances_view"]["Row"][])
    .filter((row) => row.status === "active")
    .filter((row) => branchId ? row.branch_id === branchId : true)
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
