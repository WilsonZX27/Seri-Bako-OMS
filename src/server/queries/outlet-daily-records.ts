import { isMockMode, mockBranches, mockProducts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { paginateRows } from "@/lib/table-state";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import type { Database } from "@/types/database";
import { compareProductDisplayOrder, sortProductsForDisplay } from "@/lib/product-order";

type Filters = Record<string, string | undefined>;
type RecordRow = Database["public"]["Tables"]["outlet_daily_records"]["Row"];
type LineRow = Database["public"]["Tables"]["outlet_daily_record_lines"]["Row"];
type TrendPeriod = "7" | "30" | "month";
type TrendStatus = "all" | "evening_completed" | "reviewed";
type TrendTotals = { received: number; leftover: number; wastage: number; movement: number };

export type OutletDailyRecordRow = RecordRow & {
  branch_name: string;
  submitted_by_name: string | null;
  total_sent: number;
  total_received: number;
  total_leftover: number;
  total_wastage: number;
  wastage_percent: number;
};

export type OutletDailyDefaultLine = Pick<LineRow, "morning_received_qty" | "wastage_qty" | "wastage_reason" | "notes">;

export type OutletDailyCompletionStatus = RecordRow["status"] | "missing";
export type OutletDailyCompletionCell = {
  branch_id: string;
  branch_name: string;
  record_date: string;
  record_id: string | null;
  status: OutletDailyCompletionStatus;
};

const todayInKualaLumpur = () => new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date());

const totals = (lines: LineRow[]) => {
  const totalSent = lines.reduce((sum, line) => sum + Number(line.qty_sent), 0);
  const totalReceived = lines.reduce((sum, line) => sum + Number(line.morning_received_qty), 0);
  const totalLeftover = lines.reduce((sum, line) => sum + Number(line.evening_leftover_qty), 0);
  const totalWastage = lines.reduce((sum, line) => sum + Number(line.wastage_qty), 0);
  return {
    total_sent: totalSent,
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
const planningNumber = (value: string | undefined, fallback: number, minimum: number, maximum: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
};

async function getOutletDailyDefaults(db: Awaited<ReturnType<typeof createClient>>, branchIds: string[], recordDate: string) {
  if (!branchIds.length) return {} as Record<string, Record<string, OutletDailyDefaultLine>>;
  const cutoff = shiftDate(recordDate, -56);
  const weekday = new Date(`${recordDate}T00:00:00Z`).getUTCDay();
  const { data: records, error: recordError } = await db
    .from("outlet_daily_records")
    .select("id,branch_id,record_date,status")
    .in("branch_id", branchIds)
    .gte("record_date", cutoff)
    .lt("record_date", recordDate)
    .neq("status", "void")
    .order("record_date", { ascending: false });
  if (recordError) throw new Error(recordError.message);
  const chosen = new Map<string, string>();
  for (const record of records ?? []) {
    if (!chosen.has(record.branch_id) && new Date(`${record.record_date}T00:00:00Z`).getUTCDay() === weekday) chosen.set(record.branch_id, record.id);
  }
  for (const record of records ?? []) {
    if (!chosen.has(record.branch_id)) chosen.set(record.branch_id, record.id);
  }
  const recordIds = [...chosen.values()];
  if (!recordIds.length) return {} as Record<string, Record<string, OutletDailyDefaultLine>>;
  const { data: lines, error: lineError } = await db
    .from("outlet_daily_record_lines")
    .select("record_id,product_id,morning_received_qty,wastage_qty,wastage_reason,notes")
    .in("record_id", recordIds);
  if (lineError) throw new Error(lineError.message);
  const branchByRecord = new Map([...chosen.entries()].map(([branchId, recordId]) => [recordId, branchId]));
  return ((lines ?? []) as Pick<LineRow, "record_id" | "product_id" | "morning_received_qty" | "wastage_qty" | "wastage_reason" | "notes">[]).reduce<Record<string, Record<string, OutletDailyDefaultLine>>>((result, line) => {
    const branchId = branchByRecord.get(line.record_id);
    if (!branchId) return result;
    (result[branchId] ??= {})[line.product_id] = {
      morning_received_qty: line.morning_received_qty,
      wastage_qty: line.wastage_qty,
      wastage_reason: line.wastage_reason,
      notes: line.notes,
    };
    return result;
  }, {});
}

export async function getOutletDailyFormOptions(recordDate?: string) {
  if (isMockMode()) {
    const branches = mockBranches.filter((row) => row.status === "active");
    return {
      branches,
      products: sortProductsForDisplay(mockProducts.filter((row) => row.status === "active")),
      defaultBranchId: branches.length === 1 ? branches[0].id : undefined,
      defaultsByBranch: {},
    };
  }
  const db = await createClient();
  const profile = await getCurrentProfile();
  const canViewAll = await hasPermission("outlet_daily_record.view_all");
  const [{ data: branches, error: branchError }, { data: products, error: productError }] = await Promise.all([
    db.from("branches").select("id,branch_code,branch_name,branch_type,status").eq("branch_type", "outlet").eq("status", "active").is("deleted_at", null).order("branch_name"),
    db.from("products").select("id,product_code,product_name,category,selling_unit,status,display_order").eq("status", "active"),
  ]);
  if (branchError) throw new Error(branchError.message);
  if (productError) throw new Error(productError.message);
  const activeBranches = branches ?? [];
  const profileDefaultBranchId = profile && "default_branch_id" in profile ? profile.default_branch_id : null;
  if (canViewAll) {
    const branchesForForm = activeBranches;
    return {
      branches: branchesForForm,
      products: sortProductsForDisplay(products ?? []),
      defaultBranchId: branchesForForm.some((row) => row.id === profileDefaultBranchId)
        ? profileDefaultBranchId ?? undefined
        : branchesForForm.length === 1 ? branchesForForm[0].id : undefined,
      defaultsByBranch: recordDate ? await getOutletDailyDefaults(db, branchesForForm.map((branch) => branch.id), recordDate) : {},
    };
  }
  const { data: assignments, error } = await db.from("staff_branches").select("branch_id").eq("staff_id", profile?.id ?? "");
  if (error) throw new Error(error.message);
  const assignedBranchIds = [profileDefaultBranchId, ...(assignments ?? []).map((row) => row.branch_id)].filter((value): value is string => Boolean(value));
  const { data: suppliedDestinations, error: routeError } = assignedBranchIds.length
    ? await db.from("branch_supply_routes").select("destination_branch_id").in("source_branch_id", assignedBranchIds).eq("status", "active")
    : { data: [], error: null };
  if (routeError) throw new Error(routeError.message);
  const allowed = new Set([...assignedBranchIds, ...(suppliedDestinations ?? []).map((row) => row.destination_branch_id)]);
  const allowedBranches = activeBranches.filter((row) => allowed.has(row.id));
  return {
    branches: allowedBranches,
    products: sortProductsForDisplay(products ?? []),
    defaultBranchId: allowedBranches.some((row) => row.id === profileDefaultBranchId)
      ? profileDefaultBranchId ?? undefined
      : allowedBranches.length === 1 ? allowedBranches[0].id : undefined,
    defaultsByBranch: recordDate ? await getOutletDailyDefaults(db, allowedBranches.map((branch) => branch.id), recordDate) : {},
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
      today_sent: todayRows.reduce((sum, row) => sum + row.total_sent, 0),
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
    db.from("products").select("id,product_code,product_name,category,selling_unit,status,display_order"),
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
    lines: typedLines
      .map((line) => ({ ...line, product: productMap.get(line.product_id) }))
      .sort((a, b) => {
        if (!a.product) return 1;
        if (!b.product) return -1;
        return compareProductDisplayOrder(a.product, b.product);
      }),
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

export async function getOutletDailyCompletionMatrix(filters: Filters = {}) {
  const end = todayInKualaLumpur();
  const start = shiftDate(end, -6);
  const options = await getOutletDailyFormOptions();
  const selectedBranchId = filters.branch && filters.branch !== "all" ? filters.branch : undefined;
  if (selectedBranchId && !options.branches.some((branch) => branch.id === selectedBranchId)) throw new Error("Selected outlet is not available.");
  const branches = options.branches.filter((branch) => !selectedBranchId || branch.id === selectedBranchId);
  const dates = Array.from({ length: 7 }, (_, index) => shiftDate(start, index));
  if (isMockMode()) return buildOutletDailyCompletionMatrix({ branches, dates, records: [] });

  if (!await hasPermission("outlet_daily_record.view")) throw new Error("Missing permission: outlet_daily_record.view");
  const db = await createClient();
  let query = db
    .from("outlet_daily_records")
    .select("id,branch_id,record_date,status,updated_at")
    .gte("record_date", start)
    .lte("record_date", end)
    .order("updated_at", { ascending: false });
  if (selectedBranchId) query = query.eq("branch_id", selectedBranchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return buildOutletDailyCompletionMatrix({ branches, dates, records: (data ?? []) as Pick<RecordRow, "id" | "branch_id" | "record_date" | "status" | "updated_at">[] });
}

function buildOutletDailyCompletionMatrix({ branches, dates, records }: {
  branches: Awaited<ReturnType<typeof getOutletDailyFormOptions>>["branches"];
  dates: string[];
  records: Pick<RecordRow, "id" | "branch_id" | "record_date" | "status" | "updated_at">[];
}) {
  const recordByOutletDay = new Map<string, (typeof records)[number]>();
  for (const record of records) {
    const key = `${record.branch_id}:${record.record_date}`;
    const current = recordByOutletDay.get(key);
    if (!current || (current.status === "void" && record.status !== "void")) recordByOutletDay.set(key, record);
  }
  const rows = branches.map((branch) => ({
    branch_id: branch.id,
    branch_name: branch.branch_name,
    cells: dates.map<OutletDailyCompletionCell>((recordDate) => {
      const record = recordByOutletDay.get(`${branch.id}:${recordDate}`);
      return { branch_id: branch.id, branch_name: branch.branch_name, record_date: recordDate, record_id: record?.id ?? null, status: record?.status ?? "missing" };
    }),
  }));
  const cells = rows.flatMap((row) => row.cells);
  const completed = cells.filter((cell) => ["evening_completed", "reviewed"].includes(cell.status)).length;
  const incomplete = cells.filter((cell) => ["draft", "morning_recorded"].includes(cell.status)).length;
  const missing = cells.filter((cell) => cell.status === "missing").length;
  const voided = cells.filter((cell) => cell.status === "void").length;
  return {
    dates,
    rows,
    summary: { expected: cells.length, completed, incomplete, missing, voided },
  };
}

export async function getProductionPlanning(filters: Filters = {}) {
  const trend = await getOutletDailyDemandTrend(filters);
  return buildProductionPlanning(trend, filters);
}

function buildProductionPlanning(trend: Awaited<ReturnType<typeof getOutletDailyDemandTrend>>, filters: Filters = {}) {
  const buffer_percent = planningNumber(filters.buffer_percent, 10, 0, 100);
  const rounding_unit = planningNumber(filters.rounding_unit, 1, 0.01, 10_000);
  const planning_date = /^\d{4}-\d{2}-\d{2}$/.test(filters.planning_date ?? "") ? filters.planning_date! : todayInKualaLumpur();
  const target_days = planningNumber(filters.target_days, 1, 1, 30);
  const averageFor = (movement: number) => trend.coverage.completed ? movement / trend.coverage.completed : 0;
  const rows = trend.top_moving_products.map((product) => {
    const average_daily_movement = averageFor(product.movement);
    const calculated = average_daily_movement * target_days * (1 + buffer_percent / 100);
    const manual_review = trend.coverage.confidence === "Low" || product.low_sample;
    return {
      ...product,
      average_daily_movement,
      suggested_qty: manual_review ? null : Math.ceil(calculated / rounding_unit) * rounding_unit,
      planning_note: trend.coverage.confidence === "Low" ? "Review manually" : product.low_sample ? "Review manually" : trend.coverage.confidence === "Medium" ? "Suggested — check data" : "Suggested — HQ/kitchen check",
    };
  });
  return {
    ...trend,
    planning: {
      planning_date,
      buffer_percent,
      rounding_unit,
      target_days,
      rows,
      summary: {
        high: rows.filter((row) => trend.coverage.confidence === "High" && !row.low_sample).length,
        medium: rows.filter((row) => trend.coverage.confidence === "Medium" && !row.low_sample).length,
        manual: rows.filter((row) => row.planning_note === "Review manually").length,
      },
    },
  };
}

export async function getProductionDemandVariance(filters: Filters = {}) {
  const trend = await getOutletDailyDemandTrend(filters);
  return buildProductionDemandVariance(trend, filters);
}

function buildProductionDemandVariance(trend: Awaited<ReturnType<typeof getOutletDailyDemandTrend>>, filters: Filters = {}) {
  const signal = ["all", "over_supplied", "under_supplied", "balanced", "review_manual"].includes(filters.signal ?? "") ? filters.signal ?? "all" : "all";
  const all_rows = trend.product_outlets.map((row) => {
    const leftover_percent = row.received > 0 ? (row.leftover / row.received) * 100 : 0;
    const manual_review = trend.coverage.confidence === "Low" || row.low_sample;
    const variance_signal = manual_review
      ? "review_manual"
      : leftover_percent >= 20 || row.wastage_percent >= 10
        ? "over_supplied"
        : row.movement > 0 && leftover_percent <= 5
          ? "under_supplied"
          : "balanced";
    return { ...row, leftover_percent, variance_signal, manual_review };
  });
  const rows = all_rows.filter((row) => signal === "all" || row.variance_signal === signal);
  return {
    ...trend,
    variance: {
      signal,
      all_rows,
      rows,
      summary: {
        over_supplied: rows.filter((row) => row.variance_signal === "over_supplied").length,
        under_supplied: rows.filter((row) => row.variance_signal === "under_supplied").length,
        high_wastage: rows.filter((row) => row.wastage_percent >= 10).length,
        low_confidence: trend.coverage.confidence === "Low" ? rows.length : 0,
      },
    },
  };
}

export async function getOperationsControlCenterSummary() {
  const [outletResult, trendResult] = await Promise.allSettled([getOutletDailyRecords(), getOutletDailyDemandTrend({ period: "7" })]);
  const outlet = outletResult.status === "fulfilled" ? outletResult.value.summary : null;
  const trend = trendResult.status === "fulfilled" ? trendResult.value : null;
  const variance = trend ? buildProductionDemandVariance(trend) : null;
  const planning = trend ? buildProductionPlanning(trend) : null;
  return {
    outlet,
    demand: trend ? { coverage: trend.coverage, top_wastage_products: trend.top_wastage_products.slice(0, 3) } : null,
    variance: variance?.variance.summary ?? null,
    planning: planning?.planning.summary ?? null,
    unavailable: { outlet: !outlet, demand: !trend },
  };
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
  const productOutletsByKey = new Map<string, { product_id: string; branch_id: string; totals: TrendTotals; record_ids: Set<string> }>();
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
    const productOutletKey = `${line.product_id}:${record.branch_id}`;
    const productOutlet = productOutletsByKey.get(productOutletKey) ?? { product_id: line.product_id, branch_id: record.branch_id, totals: emptyTrendTotals(), record_ids: new Set<string>() };
    addTrendLine(productOutlet.totals, line); productOutlet.record_ids.add(line.record_id); productOutletsByKey.set(productOutletKey, productOutlet);
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
  const productOutletRows = [...productOutletsByKey.values()].map((row) => ({
    id: `${row.product_id}:${row.branch_id}`,
    product_id: row.product_id,
    product_name: productNames.get(row.product_id) ?? "Archived product",
    branch_id: row.branch_id,
    branch_name: branchNames.get(row.branch_id) ?? "Unknown outlet",
    ...row.totals,
    wastage_percent: wastagePercent(row.totals),
    completed_records: row.record_ids.size,
    low_sample: row.record_ids.size < 3,
  }));
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
    product_outlets: productOutletRows.sort((left, right) => right.movement - left.movement),
    daily: dailyRows,
  };
}
