import { isMockMode, mockItems, mockLocations, mockProfile, mockStockTransferLines, mockStockTransfers, mockStockWastage, mockStockWastageLines } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows } from "@/lib/table-state";
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";
import { getStockBalanceDetails } from "@/server/queries/inventory";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type Transfer = Database["public"]["Tables"]["stock_transfers"]["Row"];
type TransferLine = Database["public"]["Tables"]["stock_transfer_lines"]["Row"];
type Wastage = Database["public"]["Tables"]["stock_wastage"]["Row"];
type WastageLine = Database["public"]["Tables"]["stock_wastage_lines"]["Row"];

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], dateKey: keyof T) {
  const search = filters.search?.toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const location = filters.location_id && filters.location_id !== "all" ? filters.location_id : null;
  const reason = filters.reason && filters.reason !== "all" ? filters.reason : null;
  const today = new Date().toISOString().slice(0, 10);
  const date = filters.date === "today" ? today : null;
  const sort = filters.sort ?? String(dateKey);
  const dir = filters.dir ?? "desc";
  return rows.filter((row) => {
    const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
    const matchesStatus = status ? row.status === status : true;
    const matchesLocation = location ? row.location_id === location || row.from_location_id === location || row.to_location_id === location : true;
    const matchesReason = reason ? row.reason === reason : true;
    const matchesFrom = filters.from ? String(row[dateKey] ?? "") >= filters.from : true;
    const matchesTo = filters.to ? String(row[dateKey] ?? "") <= filters.to : true;
    const matchesDate = date ? String(row[dateKey] ?? "") === date : true;
    return matchesSearch && matchesStatus && matchesLocation && matchesReason && matchesFrom && matchesTo && matchesDate;
  }).sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

function locName(id: string | null) {
  return mockLocations.find((row) => row.id === id)?.location_name ?? null;
}

export async function getStockTransfers(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockTransfers.map((row) => ({
      ...row,
      from_location_name: locName(row.from_location_id),
      to_location_name: locName(row.to_location_id),
      created_by_name: row.created_by ? mockProfile.full_name : null,
      line_count: mockStockTransferLines.filter((line) => line.stock_transfer_id === row.id).length,
    }));
    return paginateRows(filterRows(rows, filters, ["transfer_no", "status", "remarks", "from_location_name", "to_location_name"], "transfer_date"), filters.page, 12);
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines }, { data: locations }] = await Promise.all([
    supabase.from("stock_transfers").select("*").is("deleted_at", null),
    supabase.from("stock_transfer_lines").select("*"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  const loc = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const displayMap = await resolveActorDisplayMap((data ?? []).map((row) => row.created_by));
  const rows = ((data ?? []) as Transfer[]).map((row) => ({ ...row, from_location_name: loc.get(row.from_location_id) ?? null, to_location_name: loc.get(row.to_location_id) ?? null, created_by_name: actorDisplayName(displayMap, row.created_by), line_count: (lines ?? []).filter((line) => line.stock_transfer_id === row.id).length }));
  return paginateRows(filterRows(rows, filters, ["transfer_no", "status", "remarks", "from_location_name", "to_location_name"], "transfer_date"), filters.page, 12);
}

export async function getStockTransfer(id: string) {
  if (isMockMode()) {
    const transfer = mockStockTransfers.find((row) => row.id === id);
    if (!transfer) throw new Error("Mock transfer not found");
    const lines = mockStockTransferLines.filter((line) => line.stock_transfer_id === id).map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { transfer: { ...transfer, from_location_name: locName(transfer.from_location_id), to_location_name: locName(transfer.to_location_id), line_count: lines.length }, lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines }, { data: items }, { data: locations }] = await Promise.all([
    supabase.from("stock_transfers").select("*").eq("id", id).single(),
    supabase.from("stock_transfer_lines").select("*").eq("stock_transfer_id", id),
    supabase.from("items").select("id,item_code,item_name,base_unit,barcode,internal_barcode,item_image_url"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  const itemMap = new Map((items ?? []).map((row) => [row.id, row]));
  const loc = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const transfer = data as Transfer;
  return { transfer: { ...transfer, from_location_name: loc.get(transfer.from_location_id) ?? null, to_location_name: loc.get(transfer.to_location_id) ?? null, line_count: (lines ?? []).length }, lines: ((lines ?? []) as TransferLine[]).map((line) => ({ ...line, item: itemMap.get(line.item_id) })) };
}

export async function getStockWastage(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockWastage.map((row) => ({ ...row, location_name: locName(row.location_id), created_by_name: row.created_by ? mockProfile.full_name : null, line_count: mockStockWastageLines.filter((line) => line.stock_wastage_id === row.id).length }));
    return paginateRows(filterRows(rows, filters, ["wastage_no", "status", "reason", "remarks", "location_name"], "wastage_date"), filters.page, 12);
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines }, { data: locations }] = await Promise.all([
    supabase.from("stock_wastage").select("*").is("deleted_at", null),
    supabase.from("stock_wastage_lines").select("*"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  const loc = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const displayMap = await resolveActorDisplayMap((data ?? []).map((row) => row.created_by));
  const rows = ((data ?? []) as Wastage[]).map((row) => ({ ...row, location_name: loc.get(row.location_id) ?? null, created_by_name: actorDisplayName(displayMap, row.created_by), line_count: (lines ?? []).filter((line) => line.stock_wastage_id === row.id).length }));
  return paginateRows(filterRows(rows, filters, ["wastage_no", "status", "reason", "remarks", "location_name"], "wastage_date"), filters.page, 12);
}

export async function getStockWastageDetail(id: string) {
  if (isMockMode()) {
    const wastage = mockStockWastage.find((row) => row.id === id);
    if (!wastage) throw new Error("Mock wastage not found");
    const lines = mockStockWastageLines.filter((line) => line.stock_wastage_id === id).map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { wastage: { ...wastage, location_name: locName(wastage.location_id), line_count: lines.length }, lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines }, { data: items }, { data: locations }] = await Promise.all([
    supabase.from("stock_wastage").select("*").eq("id", id).single(),
    supabase.from("stock_wastage_lines").select("*").eq("stock_wastage_id", id),
    supabase.from("items").select("id,item_code,item_name,base_unit,barcode,internal_barcode,item_image_url"),
    supabase.from("locations").select("id, location_name"),
  ]);
  if (error) throw new Error(error.message);
  const itemMap = new Map((items ?? []).map((row) => [row.id, row]));
  const loc = new Map((locations ?? []).map((row) => [row.id, row.location_name]));
  const wastage = data as Wastage;
  return { wastage: { ...wastage, location_name: loc.get(wastage.location_id) ?? null, line_count: (lines ?? []).length }, lines: ((lines ?? []) as WastageLine[]).map((line) => ({ ...line, item: itemMap.get(line.item_id) })) };
}

export async function getOperationSeedLines(locationId?: string, branchId?: string) {
  const balances = await getStockBalanceDetails({ page: "all", view: locationId ? "location" : "branch" });
  return balances.rows
    .filter((row) => locationId ? row.location_id === locationId : true)
    .filter((row) => branchId ? row.branch_id === branchId : true)
    .slice(0, 8)
    .map((row) => ({ item_id: row.item_id, item_code: row.item_code, item_name: row.item_name, barcode: row.barcode, available_qty: row.current_qty, quantity: Math.min(Math.max(row.current_qty, 1), 5), uom: row.base_unit }));
}
