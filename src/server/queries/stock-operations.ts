import { isMockMode, mockBranches, mockItems, mockProfile, mockStockTransferLines, mockStockTransfers, mockStockWastage, mockStockWastageLines } from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
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
const OPERATION_PAGE_SIZE = 12;
const TRANSFER_SORT_COLUMNS = new Set(["transfer_no", "transfer_date", "status", "updated_at"]);
const WASTAGE_SORT_COLUMNS = new Set(["wastage_no", "wastage_date", "status", "reason", "updated_at"]);

function requestedPage(pageValue?: string) {
  const parsed = Number(pageValue ?? "1");
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 1) : 1;
}

function pageRange(pageValue?: string) {
  if (pageValue === "all") return null;
  const page = requestedPage(pageValue);
  return { from: (page - 1) * OPERATION_PAGE_SIZE, to: page * OPERATION_PAGE_SIZE - 1 };
}

function databasePagination<T>(rows: T[], totalRows: number | null, pageValue?: string) {
  const total = totalRows ?? rows.length;
  const totalPages = Math.max(Math.ceil(total / OPERATION_PAGE_SIZE), 1);
  const page = pageValue === "all" ? 1 : Math.min(requestedPage(pageValue), totalPages);
  return { rows, totalRows: total, page, pageSize: OPERATION_PAGE_SIZE, totalPages };
}

function safeSearch(value?: string) {
  return value?.trim().replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&") || null;
}

function filterRows<T extends Record<string, unknown>>(rows: T[], filters: Filters, keys: (keyof T)[], dateKey: keyof T) {
  const search = filters.search?.toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const reason = filters.reason && filters.reason !== "all" ? filters.reason : null;
  const today = todayInKualaLumpur();
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
  const search = safeSearch(filters.search);
  const matchingBranches = search
    ? await supabase.from("branches").select("id").ilike("branch_name", `%${search}%`).limit(50)
    : { data: [], error: null };
  if (matchingBranches.error) throw new Error(matchingBranches.error.message);
  const matchingBranchIds = (matchingBranches.data ?? []).map((branch) => branch.id);
  const sort = TRANSFER_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "transfer_date";
  let query = supabase.from("stock_transfers").select("*", { count: "exact" }).is("deleted_at", null);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status as Transfer["status"]);
  if (filters.from) query = query.gte("transfer_date", filters.from);
  if (filters.to) query = query.lte("transfer_date", filters.to);
    if (filters.date === "today") query = query.eq("transfer_date", todayInKualaLumpur());
  if (search) {
    const branchFilters = matchingBranchIds.length
      ? `,from_branch_id.in.(${matchingBranchIds.join(",")}),to_branch_id.in.(${matchingBranchIds.join(",")})`
      : "";
    query = query.or(`transfer_no.ilike.%${search}%,status.ilike.%${search}%,remarks.ilike.%${search}%${branchFilters}`);
  }
  query = query.order(sort, { ascending: filters.dir === "asc" }).order("id", { ascending: false });
  const range = pageRange(filters.page);
  if (range) query = query.range(range.from, range.to);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const transferIds = (data ?? []).map((row) => row.id);
  const branchIds = [...new Set((data ?? []).flatMap((row) => [row.from_branch_id, row.to_branch_id]).filter((id): id is string => Boolean(id)))];
  const [{ data: lines, error: linesError }, { data: branches, error: branchesError }] = await Promise.all([
    transferIds.length ? supabase.from("stock_transfer_lines").select("stock_transfer_id").in("stock_transfer_id", transferIds) : Promise.resolve({ data: [], error: null }),
    branchIds.length ? supabase.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError) throw new Error(`Stock transfer lines could not be loaded: ${linesError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const displayMap = await resolveActorDisplayMap((data ?? []).map((row) => row.created_by));
  const rows = ((data ?? []) as Transfer[]).map((row) => ({ ...row, from_branch_name: row.from_branch_id ? branch.get(row.from_branch_id) ?? null : null, to_branch_name: row.to_branch_id ? branch.get(row.to_branch_id) ?? null : null, created_by_name: actorDisplayName(displayMap, row.created_by), line_count: (lines ?? []).filter((line) => line.stock_transfer_id === row.id).length }));
  return databasePagination(rows, count, filters.page);
}

export async function getStockTransfer(id: string) {
  if (isMockMode()) {
    const transfer = mockStockTransfers.find((row) => row.id === id);
    if (!transfer) throw new Error("Mock transfer not found");
    const lines = mockStockTransferLines.filter((line) => line.stock_transfer_id === id).map((line) => ({ ...line, received_quantity: 0, item: mockItems.find((item) => item.id === line.item_id) }));
    return { transfer: { ...transfer, from_branch_name: mockBranches.find((branch) => branch.id === transfer.from_branch_id)?.branch_name ?? null, to_branch_name: mockBranches.find((branch) => branch.id === transfer.to_branch_id)?.branch_name ?? null, line_count: lines.length }, lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("stock_transfers").select("*").eq("id", id).single(),
    supabase.from("stock_transfer_lines").select("*").eq("stock_transfer_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(`Stock transfer lines could not be loaded: ${linesError.message}`);
  const transfer = data as Transfer;
  const itemIds = [...new Set((lines ?? []).map((line) => line.item_id))];
  const branchIds = [...new Set([transfer.from_branch_id, transfer.to_branch_id].filter((branchId): branchId is string => Boolean(branchId)))];
  const [{ data: items, error: itemsError }, { data: branches, error: branchesError }] = await Promise.all([
    itemIds.length
      ? supabase.from("items").select("id,item_code,item_name,base_unit,item_image_url").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    branchIds.length
      ? supabase.from("branches").select("id, branch_name").in("id", branchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsError) throw new Error(`Items could not be loaded: ${itemsError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const itemMap = new Map((items ?? []).map((row) => [row.id, row]));
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  return { transfer: { ...transfer, from_branch_name: transfer.from_branch_id ? branch.get(transfer.from_branch_id) ?? null : null, to_branch_name: transfer.to_branch_id ? branch.get(transfer.to_branch_id) ?? null : null, line_count: (lines ?? []).length }, lines: ((lines ?? []) as TransferLine[]).map((line) => ({ ...line, item: itemMap.get(line.item_id) })) };
}

export async function getStockWastage(filters: Filters = {}) {
  if (isMockMode()) {
    const rows = mockStockWastage.map((row) => ({ ...row, branch_name: mockBranches.find((branch) => branch.id === row.branch_id)?.branch_name ?? null, created_by_name: row.created_by ? mockProfile.full_name : null, line_count: mockStockWastageLines.filter((line) => line.stock_wastage_id === row.id).length }));
    return paginateRows(filterRows(rows, filters, ["wastage_no", "status", "reason", "remarks", "branch_name"], "wastage_date"), filters.page, 12);
  }
  const supabase = await createClient();
  const search = safeSearch(filters.search);
  const matchingBranches = search
    ? await supabase.from("branches").select("id").ilike("branch_name", `%${search}%`).limit(50)
    : { data: [], error: null };
  if (matchingBranches.error) throw new Error(matchingBranches.error.message);
  const matchingBranchIds = (matchingBranches.data ?? []).map((branch) => branch.id);
  const sort = WASTAGE_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "wastage_date";
  let query = supabase.from("stock_wastage").select("*", { count: "exact" }).is("deleted_at", null);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status as Wastage["status"]);
  if (filters.reason && filters.reason !== "all") query = query.eq("reason", filters.reason as NonNullable<Wastage["reason"]>);
  if (filters.from) query = query.gte("wastage_date", filters.from);
  if (filters.to) query = query.lte("wastage_date", filters.to);
    if (filters.date === "today") query = query.eq("wastage_date", todayInKualaLumpur());
  if (search) {
    const branchFilter = matchingBranchIds.length ? `,branch_id.in.(${matchingBranchIds.join(",")})` : "";
    query = query.or(`wastage_no.ilike.%${search}%,status.ilike.%${search}%,reason.ilike.%${search}%,remarks.ilike.%${search}%${branchFilter}`);
  }
  query = query.order(sort, { ascending: filters.dir === "asc" }).order("id", { ascending: false });
  const range = pageRange(filters.page);
  if (range) query = query.range(range.from, range.to);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const wastageIds = (data ?? []).map((row) => row.id);
  const branchIds = [...new Set((data ?? []).map((row) => row.branch_id).filter((id): id is string => Boolean(id)))];
  const [{ data: lines, error: linesError }, { data: branches, error: branchesError }] = await Promise.all([
    wastageIds.length ? supabase.from("stock_wastage_lines").select("stock_wastage_id").in("stock_wastage_id", wastageIds) : Promise.resolve({ data: [], error: null }),
    branchIds.length ? supabase.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (linesError) throw new Error(`Wastage lines could not be loaded: ${linesError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const displayMap = await resolveActorDisplayMap((data ?? []).map((row) => row.created_by));
  const rows = ((data ?? []) as Wastage[]).map((row) => ({ ...row, branch_name: row.branch_id ? branch.get(row.branch_id) ?? null : null, created_by_name: actorDisplayName(displayMap, row.created_by), line_count: (lines ?? []).filter((line) => line.stock_wastage_id === row.id).length }));
  return databasePagination(rows, count, filters.page);
}

export async function getStockWastageDetail(id: string) {
  if (isMockMode()) {
    const wastage = mockStockWastage.find((row) => row.id === id);
    if (!wastage) throw new Error("Mock wastage not found");
    const lines = mockStockWastageLines.filter((line) => line.stock_wastage_id === id).map((line) => ({ ...line, item: mockItems.find((item) => item.id === line.item_id) }));
    return { wastage: { ...wastage, branch_name: mockBranches.find((branch) => branch.id === wastage.branch_id)?.branch_name ?? null, line_count: lines.length }, lines };
  }
  const supabase = await createClient();
  const [{ data, error }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("stock_wastage").select("*").eq("id", id).single(),
    supabase.from("stock_wastage_lines").select("*").eq("stock_wastage_id", id),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(`Wastage lines could not be loaded: ${linesError.message}`);
  const wastage = data as Wastage;
  const itemIds = [...new Set((lines ?? []).map((line) => line.item_id))];
  const [{ data: items, error: itemsError }, { data: branches, error: branchesError }] = await Promise.all([
    itemIds.length
      ? supabase.from("items").select("id,item_code,item_name,base_unit,item_image_url").in("id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    wastage.branch_id
      ? supabase.from("branches").select("id, branch_name").eq("id", wastage.branch_id)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (itemsError) throw new Error(`Items could not be loaded: ${itemsError.message}`);
  if (branchesError) throw new Error(`Branches could not be loaded: ${branchesError.message}`);
  const itemMap = new Map((items ?? []).map((row) => [row.id, row]));
  const branch = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  return { wastage: { ...wastage, branch_name: wastage.branch_id ? branch.get(wastage.branch_id) ?? null : null, line_count: (lines ?? []).length }, lines: ((lines ?? []) as WastageLine[]).map((line) => ({ ...line, item: itemMap.get(line.item_id) })) };
}

export async function getOperationSeedLines(branchId?: string) {
  const balances = await getStockBalanceDetails({ page: "all", branch_id: branchId });
  return balances.rows
    .filter((row) => branchId ? row.branch_id === branchId : true)
    .map((row) => ({ item_id: row.item_id, item_code: row.item_code, item_name: row.item_name, available_qty: row.current_qty, quantity: Math.min(Math.max(row.current_qty, 1), 5), uom: row.base_unit }));
}
