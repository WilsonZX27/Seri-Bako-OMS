import { isMockMode, mockBranches, mockItems, mockLocations, mockProfile, mockStockCountLines, mockStockCounts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { getStockBalanceDetails } from "@/server/queries/inventory";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type StockCount = Database["public"]["Tables"]["stock_counts"]["Row"];
type StockCountLine = Database["public"]["Tables"]["stock_count_lines"]["Row"];

export type StockCountRow = StockCount & {
  branch_name: string | null;
  location_name: string | null;
  counted_by_name: string | null;
  line_count: number;
  high_variance_count: number;
};

export type StockCountLineRow = StockCountLine & {
  item?: Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "item_image_url">;
};

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

function hydrateCount(row: StockCount, lines: StockCountLine[]): StockCountRow {
  const branch = mockBranches.find((item) => item.id === row.branch_id);
  const location = mockLocations.find((item) => item.id === row.location_id);
  const ownLines = lines.filter((line) => line.stock_count_id === row.id);
  return {
    ...row,
    branch_name: branch?.branch_name ?? null,
    location_name: location?.location_name ?? null,
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
  const [{ data, error }, { data: lines }, { data: branches }, { data: locations }] = await Promise.all([
    supabase.from("stock_counts").select("*").is("deleted_at", null).order("updated_at", { ascending: false }),
    supabase.from("stock_count_lines").select("*"),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const locationById = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const rows = ((data ?? []) as StockCount[]).map((row) => {
    const ownLines = ((lines ?? []) as StockCountLine[]).filter((line) => line.stock_count_id === row.id);
    return {
      ...row,
      branch_name: row.branch_id ? branchById.get(row.branch_id) ?? null : null,
      location_name: locationById.get(row.location_id) ?? null,
      counted_by_name: row.counted_by,
      line_count: ownLines.length,
      high_variance_count: ownLines.filter((line) => Math.abs(line.variance_percent) > row.tolerance_percent).length,
    };
  });
  return paginateRows(filterRows(rows, filters, ["count_no", "status", "branch_name", "remarks"], "updated_at"), filters.page, 12);
}

export async function getStockCount(id: string) {
  if (isMockMode()) {
    const count = mockStockCounts.find((row) => row.id === id);
    if (!count) throw new Error("Mock stock count not found");
    const lines = mockStockCountLines
      .filter((line) => line.stock_count_id === id)
      .map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { count: hydrateCount(count as StockCount, mockStockCountLines as StockCountLine[]), lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: items }, { data: branches }, { data: locations }] = await Promise.all([
    supabase.from("stock_counts").select("*").eq("id", id).single(),
    supabase.from("stock_count_lines").select("*").eq("stock_count_id", id),
    supabase.from("items").select("id, item_code, item_name, base_unit, item_image_url"),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const itemById = new Map((items ?? []).map((row) => [row.id, row]));
  const branchById = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const locationById = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const count = data as StockCount;
  const ownLines = (lines ?? []) as StockCountLine[];
  return {
    count: {
      ...count,
      branch_name: count.branch_id ? branchById.get(count.branch_id) ?? null : null,
      location_name: locationById.get(count.location_id) ?? null,
      counted_by_name: count.counted_by,
      line_count: ownLines.length,
      high_variance_count: ownLines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent).length,
    },
    lines: ownLines.map((line) => ({ ...line, item: itemById.get(line.item_id) })),
  };
}

export async function getStockCountSeedLines(locationId?: string, branchId?: string) {
  const balances = await getStockBalanceDetails({ page: "all", view: locationId ? "location" : "branch" });
  return balances.rows
    .filter((row) => (locationId ? row.location_id === locationId : true))
    .filter((row) => (branchId ? row.branch_id === branchId : true))
    .map((row) => ({
      item_id: row.item_id,
      item_code: row.item_code,
      item_name: row.item_name,
      theoretical_qty: row.current_qty,
      physical_qty: row.current_qty,
      uom: row.base_unit,
    }));
}
