import { isMockMode, mockBranches, mockProducts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { paginateRows } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import type { Database } from "@/types/database";

type Filters = Record<string, string | undefined>;
type RecordRow = Database["public"]["Tables"]["outlet_daily_records"]["Row"];
type LineRow = Database["public"]["Tables"]["outlet_daily_record_lines"]["Row"];
type TrendPeriod = "7" | "30" | "month";
type TrendStatus = "all" | "evening_completed" | "reviewed";
type TrendTotals = { received: number; leftover: number; wastage: number; movement: number };

export type OutletDailyRecordRow = RecordRow & {
  branch_name: string;
  submitted_by_name: string | null;
  total_received: number;
  total_leftover: number;
  total_wastage: number;
  wastage_percent: number;
};

const todayInKualaLumpur = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const totals = (lines: LineRow[]) => {
  const totalReceived = lines.reduce((sum, line) => sum + Number(line.morning_received_qty), 0);
  const totalLeftover = lines.reduce((sum, line) => sum + Number(line.evening_leftover_qty), 0);
  const totalWastage = lines.reduce((sum, line) => sum + Number(line.wastage_qty), 0);
  return {
    total_received: totalReceived,
    total_leftover: totalLeftover,
    total_wastage: totalWastage,
    wastage_percent: totalReceived > 0 ? (totalWastage / totalReceived) * 100 : 0,
  };
};

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const trendDateRange = (period: TrendPeriod) => {
  const end = todayInKualaLumpur();
  return { start: period === "month" ? `${end.slice(0, 8)}01` : shiftDate(end, period === "30" ? -29 : -6), end };
};

const emptyTrendTotals = (): TrendTotals => ({ received: 0, leftover: 0, wastage: 0, movement: 0 });
const addTrendLine = (target: TrendTotals, line: LineRow) => {
  const received = Number(line.morning_received_qty);
  const leftover = Number(line.evening_leftover_qty);
  const wastage = Number(line.wastage_qty);
  target.received += received;
  target.leftover += leftover;
  target.wastage += wastage;
  target.movement += Math.max(received - leftover - wastage, 0);
};
const wastagePercent = (totals: TrendTotals) => totals.received > 0 ? (totals.wastage / totals.received) * 100 : 0;

export async function getOutletDailyFormOptions() {
  if (isMockMode()) {
    const branches = mockBranches.filter((row) => row.status === "active");
    return {
      branches,
      products: mockProducts.filter((row) => row.status === "active"),
      defaultBranchId: branches.length === 1 ? branches[0].id : undefined,
    };
  }
  const db = await createClient();
  const profile = await getCurrentProfile();
  const canViewAll = await hasPermission("outlet_daily_record.view_all");
  const [{ data: branches, error: branchError }, { data: products, error: productError }] = await Promise.all([
    db.from("branches").select("id,branch_code,branch_name,branch_type,status,default_location_id").eq("status", "active").is("deleted_at", null).order("branch_name"),
    db.from("products").select("id,product_code,product_name,category,selling_unit,status").eq("status", "active").order("product_name"),
  ]);
  if (branchError) throw new Error(branchError.message);
  if (productError) throw new Error(productError.message);
  const activeBranches = branches ?? [];
  const profileDefaultBranchId = profile && "default_branch_id" in profile ? profile.default_branch_id : null;
  if (canViewAll) return {
    branches: activeBranches,
    products: products ?? [],
    defaultBranchId: activeBranches.some((row) => row.id === profileDefaultBranchId)
      ? profileDefaultBranchId ?? undefined
      : activeBranches.length === 1 ? activeBranches[0].id : undefined,
  };
  const { data: assignments, error } = await db.from("staff_branches").select("branch_id").eq("staff_id", profile?.id ?? "");
  if (error) throw new Error(error.message);
  const allowed = new Set([profileDefaultBranchId, ...(assignments ?? []).map((row) => row.branch_id)].filter(Boolean));
  const allowedBranches = activeBranches.filter((row) => allowed.has(row.id));
  return {
    branches: allowedBranches,
    products: products ?? [],
    defaultBranchId: allowedBranches.some((row) => row.id === profileDefaultBranchId)
      ? profileDefaultBranchId ?? undefined
      : allowedBranches.length === 1 ? allowedBranches[0].id : undefined,
  };
}

async function loadRows() {
  if (isMockMode()) return [] as OutletDailyRecordRow[];
  const db = await createClient();
  const [{ data, error }, { data: lines }, { data: branches }, { data: staffs }] = await Promise.all([
    db.from("outlet_daily_records").select("*").order("record_date", { ascending: false }).order("updated_at", { ascending: false }),
    db.from("outlet_daily_record_lines").select("*"),
    db.from("branches").select("id,branch_name"),
    db.from("staffs").select("id,full_name"),
  ]);
  if (error) throw new Error(error.message);
  const branchNames = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const staffNames = new Map((staffs ?? []).map((row) => [row.id, row.full_name]));
  return ((data ?? []) as RecordRow[]).map((record) => ({
    ...record,
    branch_name: branchNames.get(record.branch_id) ?? "Unknown outlet",
    submitted_by_name: record.submitted_by ? staffNames.get(record.submitted_by) ?? null : null,
    ...totals(((lines ?? []) as LineRow[]).filter((line) => line.record_id === record.id)),
  }));
}

export async function getOutletDailyRecords(filters: Filters = {}) {
  const allRows = await loadRows();
  const rows = allRows.filter((row) =>
    (!filters.date || row.record_date === filters.date)
    && (!filters.branch || filters.branch === "all" || row.branch_id === filters.branch)
    && (!filters.status || filters.status === "all" || row.status === filters.status));
  const today = todayInKualaLumpur();
  const todayRows = allRows.filter((row) => row.record_date === today && row.status !== "void");
  return {
    ...paginateRows(rows, filters.page, 15),
    summary: {
      today,
      today_records: todayRows.length,
      today_received: todayRows.reduce((sum, row) => sum + row.total_received, 0),
      missing_evening: todayRows.filter((row) => ["draft", "morning_recorded"].includes(row.status)).length,
      needs_review: allRows.filter((row) => row.status === "evening_completed").length,
    },
  };
}

export async function getOutletDailyRecord(id: string) {
  if (isMockMode()) throw new Error("Outlet daily records require migration 064.");
  const db = await createClient();
  const [{ data: record, error }, { data: lines, error: linesError }, { data: branches }, { data: products }, { data: staffs }] = await Promise.all([
    db.from("outlet_daily_records").select("*").eq("id", id).single(),
    db.from("outlet_daily_record_lines").select("*").eq("record_id", id),
    db.from("branches").select("id,branch_name"),
    db.from("products").select("id,product_code,product_name,category,selling_unit,status"),
    db.from("staffs").select("id,full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  const typedRecord = record as RecordRow;
  const typedLines = (lines ?? []) as LineRow[];
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  return {
    record: {
      ...typedRecord,
      branch_name: branches?.find((branch) => branch.id === typedRecord.branch_id)?.branch_name ?? "Unknown outlet",
      submitted_by_name: staffs?.find((staff) => staff.id === typedRecord.submitted_by)?.full_name ?? null,
      reviewed_by_name: staffs?.find((staff) => staff.id === typedRecord.reviewed_by)?.full_name ?? null,
      ...totals(typedLines),
    },
    lines: typedLines.map((line) => ({ ...line, product: productMap.get(line.product_id) })),
  };
}

export async function getOutletDailyDemandTrend(filters: Filters = {}) {
  const period = (["7", "30", "month"].includes(filters.period ?? "") ? filters.period : "7") as TrendPeriod;
  const status = (["all", "evening_completed", "reviewed"].includes(filters.status ?? "") ? filters.status : "all") as TrendStatus;
  const { start, end } = trendDateRange(period);
  const options = await getOutletDailyFormOptions();
  const branchId = filters.branch && filters.branch !== "all" ? filters.branch : undefined;
  const productId = filters.product && filters.product !== "all" ? filters.product : undefined;
  if (branchId && !options.branches.some((branch) => branch.id === branchId)) throw new Error("Selected outlet is not available.");
  if (productId && !options.products.some((product) => product.id === productId)) throw new Error("Selected product is not available.");
  if (isMockMode()) return buildDemandTrend({ records: [], lines: [], branches: options.branches, products: options.products, start, end, period, status, branchId, productId });

  const db = await createClient();
  if (!await hasPermission("outlet_daily_record.view")) throw new Error("Missing permission: outlet_daily_record.view");
  let recordsQuery = db.from("outlet_daily_records").select("*").gte("record_date", start).lte("record_date", end).order("record_date");
  if (branchId) recordsQuery = recordsQuery.eq("branch_id", branchId);
  const { data: records, error } = await recordsQuery;
  if (error) throw new Error(error.message);
  const typedRecords = (records ?? []) as RecordRow[];
  const recordIds = typedRecords.map((record) => record.id);
  const { data: lines, error: linesError } = recordIds.length
    ? await db.from("outlet_daily_record_lines").select("*").in("record_id", recordIds)
    : { data: [], error: null };
  if (linesError) throw new Error(linesError.message);
  return buildDemandTrend({ records: typedRecords, lines: (lines ?? []) as LineRow[], branches: options.branches, products: options.products, start, end, period, status, branchId, productId });
}

function buildDemandTrend({ records, lines, branches, products, start, end, period, status, branchId, productId }: {
  records: RecordRow[];
  lines: LineRow[];
  branches: Awaited<ReturnType<typeof getOutletDailyFormOptions>>["branches"];
  products: Awaited<ReturnType<typeof getOutletDailyFormOptions>>["products"];
  start: string;
  end: string;
  period: TrendPeriod;
  status: TrendStatus;
  branchId?: string;
  productId?: string;
}) {
  const reliable = records.filter((record) => ["evening_completed", "reviewed"].includes(record.status) && (status === "all" || record.status === status));
  const reliableIds = new Set(reliable.map((record) => record.id));
  const trendLines = lines.filter((line) => reliableIds.has(line.record_id) && (!productId || line.product_id === productId));
  const branchNames = new Map(branches.map((branch) => [branch.id, branch.branch_name]));
  const productNames = new Map(products.map((product) => [product.id, product.product_name]));
  const recordById = new Map(records.map((record) => [record.id, record]));
  const summary = emptyTrendTotals();
  const productsById = new Map<string, TrendTotals>();
  const outletsById = new Map<string, TrendTotals>();
  const daysByDate = new Map<string, TrendTotals>();
  const productRecordIds = new Map<string, Set<string>>();
  const outletRecordIds = new Map<string, Set<string>>();
  for (const record of reliable) {
    const ids = outletRecordIds.get(record.branch_id) ?? new Set<string>();
    ids.add(record.id); outletRecordIds.set(record.branch_id, ids);
  }
  for (const line of trendLines) {
    addTrendLine(summary, line);
    const record = recordById.get(line.record_id);
    if (!record) continue;
    const productTotals = productsById.get(line.product_id) ?? emptyTrendTotals();
    addTrendLine(productTotals, line); productsById.set(line.product_id, productTotals);
    const ids = productRecordIds.get(line.product_id) ?? new Set<string>();
    ids.add(line.record_id); productRecordIds.set(line.product_id, ids);
    const outletTotals = outletsById.get(record.branch_id) ?? emptyTrendTotals();
    addTrendLine(outletTotals, line); outletsById.set(record.branch_id, outletTotals);
    const dayTotals = daysByDate.get(record.record_date) ?? emptyTrendTotals();
    addTrendLine(dayTotals, line); daysByDate.set(record.record_date, dayTotals);
  }
  const expectedDays = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000 + 1) * (branchId ? 1 : branches.length);
  const completedOutletDays = new Set(reliable.map((record) => `${record.branch_id}:${record.record_date}`)).size;
  const incompleteRecords = records.filter((record) => ["draft", "morning_recorded"].includes(record.status)).length;
  const coveragePercent = expectedDays ? (completedOutletDays / expectedDays) * 100 : 0;
  const confidence = coveragePercent >= 80 ? "High" : coveragePercent >= 50 ? "Medium" : "Low";
  const toRows = (source: Map<string, TrendTotals>, nameFor: (id: string) => string) => [...source].map(([id, totals]) => ({ id, name: nameFor(id), ...totals, wastage_percent: wastagePercent(totals) }));
  const productRows = toRows(productsById, (id) => productNames.get(id) ?? "Archived product").map((row) => ({ ...row, completed_records: productRecordIds.get(row.id)?.size ?? 0, low_sample: (productRecordIds.get(row.id)?.size ?? 0) < 3 }));
  const outletRows = branches.filter((branch) => !branchId || branch.id === branchId).map((branch) => {
    const outletTotals = outletsById.get(branch.id) ?? emptyTrendTotals();
    const completed_records = outletRecordIds.get(branch.id)?.size ?? 0;
    return { id: branch.id, name: branchNames.get(branch.id) ?? "Unknown outlet", ...outletTotals, wastage_percent: wastagePercent(outletTotals), completed_records, no_completed_records: completed_records === 0 };
  });
  const dailyRows = toRows(daysByDate, (id) => id).sort((left, right) => left.name.localeCompare(right.name));
  return {
    filters: { period, status, branch: branchId ?? "all", product: productId ?? "all", start, end },
    branches,
    products,
    summary: { ...summary, wastage_percent: wastagePercent(summary) },
    coverage: { completed: completedOutletDays, expected: expectedDays, incomplete: incompleteRecords, missing: Math.max(expectedDays - completedOutletDays, 0), percent: coveragePercent, confidence },
    top_moving_products: [...productRows].sort((left, right) => right.movement - left.movement).slice(0, 10),
    top_wastage_products: [...productRows].sort((left, right) => right.wastage - left.wastage).slice(0, 10),
    outlets: outletRows.sort((left, right) => right.movement - left.movement),
    daily: dailyRows,
  };
}
