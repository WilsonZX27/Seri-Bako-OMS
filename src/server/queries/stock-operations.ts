import { isMockMode, mockBranches, mockItems, mockProfile, mockStockTransferLines, mockStockTransfers, mockStockWastage, mockStockWastageLines } from "@/lib/mock-mode";
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
  const reason = filters.reason && filters.reason !== "all" ? filters.reason : null;
  const today = new Date().toISOString().slice(0, 10);
  const date = filters.date === "today" ? today : null;
  const sort = filters.sort ?? String(dateKey);
  const dir = filters.dir ?? "desc";
  return rows.filter((row) => {
    const matchesSearch = search ? keys.some((key) => String(row[key] ?? "").toLowerCase().includes(search)) : true;
    const matchesStatus = status ? row.status === status : true;
    const matchesReason = reason ? row.reason === reason : true;
    const matchesFrom = filters.from ? String(row[dateKey] ?? "") >= filters.from : true;
    const matchesTo = filters.to ? String(row[dateKey] ?? "") <= filters.to : true;
    const matchesDate = date ? String(row[dateKey] ?? "") === date : true;
    return matchesSearch && matchesStatus && matchesReason && matchesFrom && matchesTo && matchesDate;
  }).sort((a, b) => compareTableValues(a[sort], b[sort], dir));
}

export async function getStockTransfers(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockTransfers.map((row) => ({
      ...row,
      from_branch_name: mockBranches.find((branch) => branch.id === row.from_branch_id)?.branch_name ?? null,
      to_branch_name: mockBranches.find((branch) => branch.id === row.to_branch_id)?.branch_name ?? null,
      created_by_name: row.created_by ? mockProfile.full_name : null,
      line_count: mockStockTransferLines.filter((line) => line.stock_transfer_id === row.id).length,
    }));
    return paginateRows(filterRows(rows, filters, ["transfer_no", "status", "remarks", "from_branch_name", "to_branch_name"], "transfer_date"), filters.page, 12);
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: branches, error: branchesError }] = await Promise.all([
    supabase.from("stock_transfers").select("*").is("deleted_at", null),
    supabase.from("stock_transfer_lines").select("*"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(`Stock transfer lines could not be loaded: ${linesError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const displayMap = await resolveActorDisplayMap((data ?? []).map((row) => row.created_by));
  const rows = ((data ?? []) as Transfer[]).map((row) => ({ ...row, from_branch_name: row.from_branch_id ? branch.get(row.from_branch_id) ?? null : null, to_branch_name: row.to_branch_id ? branch.get(row.to_branch_id) ?? null : null, created_by_name: actorDisplayName(displayMap, row.created_by), line_count: (lines ?? []).filter((line) => line.stock_transfer_id === row.id).length }));
  return paginateRows(filterRows(rows, filters, ["transfer_no", "status", "remarks", "from_branch_name", "to_branch_name"], "transfer_date"), filters.page, 12);
}

export async function getStockTransfer(id: string) {
  if (isMockMode()) {
    const transfer = mockStockTransfers.find((row) => row.id === id);
    if (!transfer) throw new Error("Mock transfer not found");
    const lines = mockStockTransferLines.filter((line) => line.stock_transfer_id === id).map((line) => ({ ...line, received_quantity: 0, item: mockItems.find((item) => item.id === line.item_id) }));
    return { transfer: { ...transfer, from_branch_name: mockBranches.find((branch) => branch.id === transfer.from_branch_id)?.branch_name ?? null, to_branch_name: mockBranches.find((branch) => branch.id === transfer.to_branch_id)?.branch_name ?? null, line_count: lines.length }, lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: items, error: itemsError }, { data: branches, error: branchesError }] = await Promise.all([
    supabase.from("stock_transfers").select("*").eq("id", id).single(),
    supabase.from("stock_transfer_lines").select("*").eq("stock_transfer_id", id),
    supabase.from("items").select("id,item_code,item_name,base_unit,item_image_url"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(`Stock transfer lines could not be loaded: ${linesError.message}`);
  if (itemsError) throw new Error(`Items could not be loaded: ${itemsError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const itemMap = new Map((items ?? []).map((row) => [row.id, row]));
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const transfer = data as Transfer;
  return { transfer: { ...transfer, from_branch_name: transfer.from_branch_id ? branch.get(transfer.from_branch_id) ?? null : null, to_branch_name: transfer.to_branch_id ? branch.get(transfer.to_branch_id) ?? null : null, line_count: (lines ?? []).length }, lines: ((lines ?? []) as TransferLine[]).map((line) => ({ ...line, item: itemMap.get(line.item_id) })) };
}

export async function getStockWastage(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockWastage.map((row) => ({ ...row, branch_name: mockBranches.find((branch) => branch.id === row.branch_id)?.branch_name ?? null, created_by_name: row.created_by ? mockProfile.full_name : null, line_count: mockStockWastageLines.filter((line) => line.stock_wastage_id === row.id).length }));
    return paginateRows(filterRows(rows, filters, ["wastage_no", "status", "reason", "remarks", "branch_name"], "wastage_date"), filters.page, 12);
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: branches, error: branchesError }] = await Promise.all([
    supabase.from("stock_wastage").select("*").is("deleted_at", null),
    supabase.from("stock_wastage_lines").select("*"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(`Wastage lines could not be loaded: ${linesError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const displayMap = await resolveActorDisplayMap((data ?? []).map((row) => row.created_by));
  const rows = ((data ?? []) as Wastage[]).map((row) => ({ ...row, branch_name: row.branch_id ? branch.get(row.branch_id) ?? null : null, created_by_name: actorDisplayName(displayMap, row.created_by), line_count: (lines ?? []).filter((line) => line.stock_wastage_id === row.id).length }));
  return paginateRows(filterRows(rows, filters, ["wastage_no", "status", "reason", "remarks", "branch_name"], "wastage_date"), filters.page, 12);
}

export async function getStockWastageDetail(id: string) {
  if (isMockMode()) {
    const wastage = mockStockWastage.find((row) => row.id === id);
    if (!wastage) throw new Error("Mock wastage not found");
    const lines = mockStockWastageLines.filter((line) => line.stock_wastage_id === id).map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { wastage: { ...wastage, branch_name: mockBranches.find((branch) => branch.id === wastage.branch_id)?.branch_name ?? null, line_count: lines.length }, lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }, { data: items, error: itemsError }, { data: branches, error: branchesError }] = await Promise.all([
    supabase.from("stock_wastage").select("*").eq("id", id).single(),
    supabase.from("stock_wastage_lines").select("*").eq("stock_wastage_id", id),
    supabase.from("items").select("id,item_code,item_name,base_unit,item_image_url"),
    supabase.from("branches").select("id, branch_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(`Wastage lines could not be loaded: ${linesError.message}`);
  if (itemsError) throw new Error(`Items could not be loaded: ${itemsError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const itemMap = new Map((items ?? []).map((row) => [row.id, row]));
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const wastage = data as Wastage;
  return { wastage: { ...wastage, branch_name: wastage.branch_id ? branch.get(wastage.branch_id) ?? null : null, line_count: (lines ?? []).length }, lines: ((lines ?? []) as WastageLine[]).map((line) => ({ ...line, item: itemMap.get(line.item_id) })) };
}

export async function getOperationSeedLines(branchId?: string) {
  const balances = await getStockBalanceDetails({ page: "all" });
  return balances.rows
    .filter((row) => branchId ? row.branch_id === branchId : true)
    .map((row) => ({ item_id: row.item_id, item_code: row.item_code, item_name: row.item_name, available_qty: row.current_qty, quantity: Math.min(Math.max(row.current_qty, 1), 5), uom: row.base_unit }));
}
