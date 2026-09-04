import { isMockMode, mockBranches, mockProducts } from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
import { createClient } from "@/lib/supabase/server";
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile, requireReadRows } from "@/server/queries/common";
import { requireDetailRow } from "@/server/queries/detail";
import type { Database } from "@/types/database";
import { compareProductDisplayOrder, sortProductsForDisplay } from "@/lib/product-order";

type Filters = Record<string, string | undefined>;
type RecordRow = Database["public"]["Tables"]["outlet_daily_records"]["Row"];
type LineRow = Database["public"]["Tables"]["outlet_daily_record_lines"]["Row"];
type TrendPeriod = "7" | "30" | "month";
type TrendStatus = "all" | "evening_completed";
type TrendTotals = { received: number; leftover: number; wastage: number; movement: number };

type ActivityMetadata = {
  changed_lines?: Array<{ fields?: unknown; before?: unknown; after?: unknown }>;
  notes_changed?: boolean;
  previous_status?: string | null;
  target_status?: string | null;
};

function activityDisplayMessage(message: string, metadata: unknown) {
  if (message !== "Outlet daily values updated" || !metadata || typeof metadata !== "object") return message;
  const detail = metadata as ActivityMetadata;
  const fields = new Set((detail.changed_lines ?? []).flatMap((line) => {
    if (Array.isArray(line.fields)) return line.fields.filter((field): field is string => typeof field === "string");
    if (!line.before || !line.after || typeof line.before !== "object" || typeof line.after !== "object") return [];
    const before = line.before as Record<string, unknown>;
    const after = line.after as Record<string, unknown>;
    return Object.keys(after).filter((field) => JSON.stringify(before[field] ?? null) !== JSON.stringify(after[field] ?? null));
  }));
  const labels = [
    fields.has("qty_sent") ? "Qty Sent" : null,
    fields.has("received") ? "Received" : null,
    fields.has("leftover") ? "Leftover" : null,
    fields.has("wastage") || fields.has("reason") ? "Wastage" : null,
    fields.has("comment") || detail.notes_changed ? "Notes" : null,
    detail.previous_status !== detail.target_status ? "Status" : null,
  ].filter((label): label is string => Boolean(label));
  return labels.length ? `${labels.join(" · ")} updated` : message;
}

export async function getOutletDailyActivity(recordId: string) {
  if (isMockMode()) return [];
  const db = await createClient();
  const { data, error } = await db.from("activity_logs").select("id,activity_type,message,metadata,created_at,created_by").eq("entity_type", "outlet_daily_record").eq("entity_id", recordId).order("created_at", { ascending: false }).limit(40);
  if (error) throw new Error(error.message);
  const actorIds = [...new Set((data ?? []).map((entry) => entry.created_by).filter(Boolean))] as string[];
  const actors = actorIds.length ? await db.from("staffs").select("id,full_name").in("id", actorIds) : { data: [], error: null };
  if (actors.error) throw new Error(actors.error.message);
  const names = new Map((actors.data ?? []).map((actor) => [actor.id, actor.full_name]));
  const normalized = (data ?? []).map((entry) => ({
    ...entry,
    display_message: activityDisplayMessage(entry.message, entry.metadata),
    actor_name: entry.created_by ? names.get(entry.created_by) ?? "Staff" : "System",
  }));
  return normalized.filter((entry, index) => {
    const newer = normalized[index - 1];
    if (!newer || newer.created_by !== entry.created_by || newer.display_message !== entry.display_message) return true;
    const secondsApart = Math.abs(new Date(newer.created_at).getTime() - new Date(entry.created_at).getTime()) / 1_000;
    return secondsApart > 60;
  });
}

export type OutletDailyRecordRow = RecordRow & {
  branch_name: string;
  created_by_name: string | null;
  updated_by_name: string | null;
  total_sent: number | null;
  total_received: number | null;
  received_state: "verified" | "unavailable";
  received_pending_lines: number;
  received_zero_with_sent: boolean;
  total_leftover: number;
  total_wastage: number;
  wastage_percent: number | null;
  qty_sent_state: "confirmed" | "draft" | "missing";
};

export type OutletDailyDefaultLine = {
  morning_received_qty: number | null;
  wastage_qty: LineRow["wastage_qty"];
  wastage_reason: LineRow["wastage_reason"];
  notes: LineRow["notes"];
};

export type OutletDailyCompletionStatus = RecordRow["status"] | "missing";
export type OutletDailyCompletionCell = {
  branch_id: string;
  branch_name: string;
  record_date: string;
  record_id: string | null;
  status: OutletDailyCompletionStatus;
  sales_review_status: RecordRow["sales_review_status"] | null;
};

export type OutletDailyWastageCostSummary = {
  state: "verified" | "partial" | "unavailable";
  amount: number | null;
  wastage_qty: number;
  priced_lines: number;
  unavailable_lines: number;
};

const isPackagingCategory = (category: string | null | undefined) => category?.trim().toLowerCase() === "packaging";

const totals = (lines: LineRow[], operationalProductIds?: Set<string>) => {
  const operationalLines = operationalProductIds ? lines.filter((line) => operationalProductIds.has(line.product_id)) : lines;
  const qtySentState = lines.length > 0 && lines.every((line) => line.qty_sent_source === "authorized_confirmed" || line.qty_sent_confirmed)
    ? "confirmed" as const
    : lines.some((line) => line.qty_sent_source === "authorized_draft")
      ? "draft" as const
      : "missing" as const;
  // A database default of 0 is not proof that the kitchen sent zero. Only a
  // fully authorised set of lines may produce a numeric operational total;
  // missing or draft lines stay explicitly unavailable to every consumer.
  const totalSent = qtySentState === "confirmed"
    ? lines.reduce((sum, line) => sum + Number(line.qty_sent), 0)
    : null;
  // `morning_received_qty` has a database default of 0. Its dedicated
  // provenance flag distinguishes an explicit zero from that transport
  // default. An empty line set, or an unproven default zero, must never be
  // rendered as a real operational total.
  const receivedValues = operationalLines.map((line) => {
    const received = Number(line.morning_received_qty);
    const explicitlyProvided = receivedValueIsTrusted(line);
    return explicitlyProvided && Number.isFinite(received) ? received : null;
  });
  const receivedState = operationalLines.length > 0 && receivedValues.every((value) => value !== null) ? "verified" as const : "unavailable" as const;
  const receivedPendingLines = receivedValues.filter((value) => value === null).length;
  const totalReceived = receivedState === "verified"
    ? receivedValues.reduce<number>((sum, value) => sum + (value ?? 0), 0)
    : null;
  // A confirmed zero can be valid (for example, an outlet received nothing),
  // but it is operationally suspicious when the same record says the kitchen
  // sent stock. Keep the value authoritative and surface the reconciliation
  // cue instead of silently presenting a healthy-looking zero.
  const receivedZeroWithSent = totalReceived === 0 && totalSent !== null && totalSent > 0;
  const totalLeftover = lines.reduce((sum, line) => sum + Number(line.evening_leftover_qty), 0);
  const totalWastage = operationalLines.reduce((sum, line) => sum + Number(line.wastage_qty), 0);
  return {
    total_sent: totalSent,
    total_received: totalReceived,
    received_state: receivedState,
    received_pending_lines: receivedPendingLines,
    received_zero_with_sent: receivedZeroWithSent,
    total_leftover: totalLeftover,
    total_wastage: totalWastage,
    wastage_percent: totalReceived !== null && totalReceived > 0 ? (totalWastage / totalReceived) * 100 : null,
    qty_sent_state: qtySentState,
  };
};

type ReceivedProvenance = Pick<LineRow, "morning_received_qty" | "qty_sent_estimated"> & {
  morning_received_provided?: boolean;
};

const receivedValueIsTrusted = (line: ReceivedProvenance) => {
  const received = Number(line.morning_received_qty);
  // Migration 151 gives this fact an explicit name. During a rolling deploy,
  // migration 145's `qty_sent_estimated` remains the backwards-compatible
  // provenance source: that column is populated only when the outlet supplied
  // a received value, including an explicit zero. Never fall back to
  // `qty_sent_source`, which describes the sent quantity rather than receipt.
  const provided = typeof line.morning_received_provided === "boolean"
    ? line.morning_received_provided
    : line.qty_sent_estimated !== null || received !== 0;
  return Number.isFinite(received) && provided;
};

const shiftDate = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const trendDateRange = (period: TrendPeriod, requestedEnd?: string) => {
  const end = /^\d{4}-\d{2}-\d{2}$/.test(requestedEnd ?? "") ? requestedEnd! : todayInKualaLumpur();
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
  const trustedRecords = requireReadRows(records, "Outlet daily defaults records");
  const chosen = new Map<string, string>();
  for (const record of trustedRecords) {
    if (!chosen.has(record.branch_id) && new Date(`${record.record_date}T00:00:00Z`).getUTCDay() === weekday) chosen.set(record.branch_id, record.id);
  }
  for (const record of trustedRecords) {
    if (!chosen.has(record.branch_id)) chosen.set(record.branch_id, record.id);
  }
  const recordIds = [...chosen.values()];
  if (!recordIds.length) return {} as Record<string, Record<string, OutletDailyDefaultLine>>;
  const { data: lines, error: lineError } = await db
    .from("outlet_daily_record_lines")
    .select("record_id,product_id,morning_received_qty,qty_sent_estimated,wastage_qty,wastage_reason,notes")
    .in("record_id", recordIds);
  if (lineError) throw new Error(lineError.message);
  const trustedLines = requireReadRows(lines, "Outlet daily defaults lines");
  const branchByRecord = new Map([...chosen.entries()].map(([branchId, recordId]) => [recordId, branchId]));
  return (trustedLines as Pick<LineRow, "record_id" | "product_id" | "morning_received_qty" | "qty_sent_estimated" | "wastage_qty" | "wastage_reason" | "notes">[]).reduce<Record<string, Record<string, OutletDailyDefaultLine>>>((result, line) => {
    const branchId = branchByRecord.get(line.record_id);
    if (!branchId) return result;
    const received = receivedValueIsTrusted(line) ? Number(line.morning_received_qty) : null;
    const wastage = Number(line.wastage_qty);
    const hasRemark = Boolean(line.notes?.trim());
    // Defaults are suggestions for a new day, not a second source of truth.
    // Never carry an already-invalid wastage value into a new record: the
    // save RPC correctly rejects wastage above an unverified/zero receipt
    // unless the operator supplies a line remark, but a copied default should
    // not make a fresh record impossible to complete.
    const safeWastage = wastage > 0 && (received === null || wastage > received) && !hasRemark ? 0 : line.wastage_qty;
    (result[branchId] ??= {})[line.product_id] = {
      // Legacy rows used the database default 0 without recording that the
      // outlet actually entered zero. Never carry that zero into a new form.
      morning_received_qty: receivedValueIsTrusted(line) ? line.morning_received_qty : null,
      wastage_qty: safeWastage,
      wastage_reason: safeWastage === 0 ? null : line.wastage_reason,
      notes: safeWastage === 0 ? null : line.notes,
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
  const activeBranches = requireReadRows(branches, "Outlet daily branch options");
  const activeProducts = requireReadRows(products, "Outlet daily product options");
  const profileDefaultBranchId = profile && "default_branch_id" in profile ? profile.default_branch_id : null;
  if (canViewAll) {
    const branchesForForm = activeBranches;
    return {
      branches: branchesForForm,
      products: sortProductsForDisplay(activeProducts),
      defaultBranchId: branchesForForm.some((row) => row.id === profileDefaultBranchId)
        ? profileDefaultBranchId ?? undefined
        : branchesForForm.length === 1 ? branchesForForm[0].id : undefined,
      defaultsByBranch: recordDate ? await getOutletDailyDefaults(db, branchesForForm.map((branch) => branch.id), recordDate) : {},
    };
  }
  const { data: assignments, error } = await db.from("staff_branches").select("branch_id").eq("staff_id", profile?.id ?? "");
  if (error) throw new Error(error.message);
  const trustedAssignments = requireReadRows(assignments, "Outlet daily staff assignments");
  const assignedBranchIds = [profileDefaultBranchId, ...trustedAssignments.map((row) => row.branch_id)].filter((value): value is string => Boolean(value));
  const { data: suppliedDestinations, error: routeError } = assignedBranchIds.length
    ? await db.from("branch_supply_routes").select("destination_branch_id").in("source_branch_id", assignedBranchIds).eq("status", "active")
    : { data: [], error: null };
  if (routeError) throw new Error(routeError.message);
  const trustedDestinations = requireReadRows(suppliedDestinations as Array<{ destination_branch_id: string }> | null, "Outlet daily supply routes");
  const allowed = new Set([...assignedBranchIds, ...trustedDestinations.map((row) => row.destination_branch_id)]);
  const allowedBranches = activeBranches.filter((row) => allowed.has(row.id));
  return {
    branches: allowedBranches,
    products: sortProductsForDisplay(activeProducts),
    defaultBranchId: allowedBranches.some((row) => row.id === profileDefaultBranchId)
      ? profileDefaultBranchId ?? undefined
      : allowedBranches.length === 1 ? allowedBranches[0].id : undefined,
    defaultsByBranch: recordDate ? await getOutletDailyDefaults(db, allowedBranches.map((branch) => branch.id), recordDate) : {},
  };
}

async function hydrateRows(db: Awaited<ReturnType<typeof createClient>>, records: RecordRow[]) {
  if (!records.length) return [] as OutletDailyRecordRow[];
  const recordIds = records.map((record) => record.id);
  const branchIds = [...new Set(records.map((record) => record.branch_id))];
  const staffIds = [...new Set(records.flatMap((record) => [record.submitted_by, record.updated_by, record.created_by].filter((value): value is string => Boolean(value))))];
  const [{ data: lines, error: linesError }, { data: branches, error: branchesError }, actorDisplayMap] = await Promise.all([
    db.from("outlet_daily_record_lines").select("*").in("record_id", recordIds),
    db.from("branches").select("id,branch_name").in("id", branchIds),
    resolveActorDisplayMap(staffIds),
  ]);
  if (linesError) throw new Error(linesError.message);
  if (branchesError) throw new Error(branchesError.message);
  if (!lines || !branches) throw new Error("Outlet daily record details returned no data.");
  const productIds = [...new Set(lines.map((line) => line.product_id))];
  const { data: products, error: productsError } = productIds.length ? await db.from("products").select("id,category").in("id", productIds) : { data: [], error: null };
  if (productsError) throw new Error(productsError.message);
  const operationalProductIds = new Set((products ?? []).filter((product) => !isPackagingCategory(product.category)).map((product) => product.id));
  const branchNames = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
  const linesByRecord = new Map<string, LineRow[]>();
  for (const line of (lines ?? []) as LineRow[]) {
    const recordLines = linesByRecord.get(line.record_id) ?? [];
    recordLines.push(line);
    linesByRecord.set(line.record_id, recordLines);
  }
  return records.map((record) => ({
    ...record,
    branch_name: branchNames.get(record.branch_id) ?? "Unknown outlet",
    created_by_name: actorDisplayName(actorDisplayMap, record.created_by),
    updated_by_name: actorDisplayName(actorDisplayMap, record.updated_by ?? record.submitted_by ?? record.created_by),
    ...totals(linesByRecord.get(record.id) ?? [], operationalProductIds),
  }));
}

async function loadRows(filters: Filters = {}) {
  const db = await createClient();
  const pageSize = 15;
  const requestedPage = Math.max(Number.parseInt(filters.page ?? "1", 10) || 1, 1);
  let query = db.from("outlet_daily_records").select("*", { count: "exact" });
  if (filters.sent_state === "missing") {
    const { data: sentMissingLines, error: sentMissingError } = await db
      .from("outlet_daily_record_lines")
      .select("record_id")
      .in("qty_sent_source", ["unavailable", "legacy_unverified", "outlet_received_estimate"])
      .limit(5000);
    if (sentMissingError) throw new Error(sentMissingError.message);
    const recordIds = [...new Set((sentMissingLines ?? []).map((line) => line.record_id))];
    if (!recordIds.length) return { rows: [] as OutletDailyRecordRow[], totalRows: 0, page: 1, pageSize, totalPages: 1 };
    query = query.in("id", recordIds);
  }
  if (filters.date) query = query.eq("record_date", filters.date);
  if (filters.branch && filters.branch !== "all") query = query.eq("branch_id", filters.branch);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status as RecordRow["status"]);
  const sortColumns = { date: "record_date", outlet: "status", updated: "updated_at" } as const;
  const sortColumn = sortColumns[filters.sort as keyof typeof sortColumns] ?? "record_date";
  const ascending = filters.dir === "asc";
  const start = (requestedPage - 1) * pageSize;
  const { data, error, count } = await query
    .order(sortColumn, { ascending })
    .order(sortColumn === "updated_at" ? "record_date" : "updated_at", { ascending: false })
    .range(start, start + pageSize - 1);
  if (error) throw new Error(error.message);
  if (!data || count === null) throw new Error("Outlet daily record list returned no data.");
  const totalRows = count;
  const totalPages = Math.max(Math.ceil(totalRows / pageSize), 1);
  const page = Math.min(requestedPage, totalPages);
  // If a stale URL points past the last page, repeat the bounded query at the
  // actual final page instead of reading every record and slicing in memory.
  if (page !== requestedPage) return loadRows({ ...filters, page: String(page) });
  return { rows: await hydrateRows(db, data as RecordRow[]), totalRows, page, pageSize, totalPages };
}

export async function getOutletDailyRecords(filters: Filters = {}) {
  if (isMockMode()) {
    return { rows: [], totalRows: 0, page: 1, pageSize: 15, totalPages: 1, summary: { today: todayInKualaLumpur(), today_records: 0, today_sent: 0, today_received: 0, today_received_unavailable: 0, today_received_zero_with_sent: 0, missing_evening: 0, posted_today: 0 } };
  }
  const db = await createClient();
  const pageResult = await loadRows(filters);
  const today = todayInKualaLumpur();
  const { data: todayRecords, error: todayError } = await db
    .from("outlet_daily_records")
    .select("*")
    .eq("record_date", today)
    .neq("status", "void");
  if (todayError) throw new Error(todayError.message);
  if (!todayRecords) throw new Error("Outlet daily record summary returned no data.");
  const todayRows = await hydrateRows(db, todayRecords as RecordRow[]);
  return {
    ...pageResult,
    summary: {
      today,
      today_records: todayRows.length,
      today_sent: todayRows.length === 0
        ? 0
        : todayRows.every((row) => row.total_sent !== null)
          ? todayRows.reduce((sum, row) => sum + (row.total_sent ?? 0), 0)
          : null,
      today_received: todayRows.length > 0 && todayRows.every((row) => row.total_received !== null)
        ? todayRows.reduce((sum, row) => sum + (row.total_received ?? 0), 0)
        : null,
      today_received_unavailable: todayRows.filter((row) => row.total_received === null).length,
      today_received_zero_with_sent: todayRows.filter((row) => row.received_zero_with_sent).length,
      missing_evening: todayRows.filter((row) => ["draft", "morning_recorded"].includes(row.status)).length,
      // Outlet staff post the evening record directly. Keep the completed
      // count visible for operational context, but do not turn it into a
      // fictitious review queue.
      posted_today: todayRows.filter((row) => ["evening_completed", "reviewed"].includes(row.status)).length,
    },
  };
}

export async function getOutletDailyWastageCostSummary(recordDate = todayInKualaLumpur()): Promise<OutletDailyWastageCostSummary> {
  const unavailable = { state: "unavailable" as const, amount: null, wastage_qty: 0, priced_lines: 0, unavailable_lines: 0 };
  if (isMockMode() || !await hasPermission("outlet_daily_record.view_all")) return unavailable;
  const db = await createClient();
  const { data: records, error: recordError } = await db.from("outlet_daily_records").select("id").eq("record_date", recordDate).neq("status", "void");
  if (recordError) throw new Error(recordError.message);
  const recordIds = (records ?? []).map((record) => record.id);
  if (!recordIds.length) return { ...unavailable, state: "verified" };
  const { data: lines, error: lineError } = await db.from("outlet_daily_record_lines").select("product_id,wastage_qty").in("record_id", recordIds);
  if (lineError) throw new Error(lineError.message);
  const wastageLines = (lines ?? []).filter((line) => Number(line.wastage_qty) > 0);
  if (!wastageLines.length) return { ...unavailable, state: "verified" };
  const productIds = [...new Set(wastageLines.map((line) => line.product_id))];
  const [{ data: recipes, error: recipeError }] = await Promise.all([
    db.from("recipes").select("id,product_id").in("product_id", productIds).eq("status", "active").is("deleted_at", null),
  ]);
  if (recipeError) throw new Error(recipeError.message);
  const recipeIds = (recipes ?? []).map((recipe) => recipe.id);
  const { data: snapshots, error: snapshotError } = recipeIds.length
    ? await db.from("recipe_cost_snapshots").select("recipe_id,snapshot_no,cost_per_finished_unit").in("recipe_id", recipeIds).order("snapshot_no", { ascending: false })
    : { data: [], error: null };
  if (snapshotError) throw new Error(snapshotError.message);
  const recipeByProduct = new Map((recipes ?? []).map((recipe) => [recipe.product_id, recipe.id]));
  const costByRecipe = new Map<string, number>();
  for (const snapshot of snapshots ?? []) if (!costByRecipe.has(snapshot.recipe_id)) costByRecipe.set(snapshot.recipe_id, Number(snapshot.cost_per_finished_unit));
  let amount = 0;
  let pricedLines = 0;
  let unavailableLines = 0;
  let wastageQty = 0;
  for (const line of wastageLines) {
    const qty = Number(line.wastage_qty);
    wastageQty += qty;
    const recipeId = recipeByProduct.get(line.product_id);
    const unitCost = recipeId ? costByRecipe.get(recipeId) : undefined;
    if (unitCost === undefined || !Number.isFinite(unitCost)) unavailableLines += 1;
    else { amount += qty * unitCost; pricedLines += 1; }
  }
  return {
    state: unavailableLines === 0 ? "verified" : pricedLines === 0 ? "unavailable" : "partial",
    amount: pricedLines ? Number(amount.toFixed(4)) : null,
    wastage_qty: Number(wastageQty.toFixed(4)),
    priced_lines: pricedLines,
    unavailable_lines: unavailableLines,
  };
}

export async function getOutletDailyRecord(id: string) {
  if (isMockMode()) throw new Error("Outlet daily records require migration 064.");
  const db = await createClient();
  const [{ data: record, error }, { data: lines, error: linesError }, { data: sales, error: salesError }, { data: branches, error: branchesError }, { data: products, error: productsError }, { data: staffs, error: staffsError }] = await Promise.all([
    db.from("outlet_daily_records").select("*").eq("id", id).maybeSingle(),
    db.from("outlet_daily_record_lines").select("*").eq("record_id", id),
    db.from("outlet_daily_sales_breakdowns").select("channel,amount").eq("record_id", id),
    db.from("branches").select("id,branch_name"),
    db.from("products").select("id,product_code,product_name,category,selling_unit,status,display_order"),
    db.from("staffs").select("id,full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (linesError) throw new Error(linesError.message);
  if (salesError && !["42P01", "PGRST205"].includes(salesError.code ?? "")) throw new Error(salesError.message);
  if (branchesError) throw new Error(branchesError.message);
  if (productsError) throw new Error(productsError.message);
  if (staffsError) throw new Error(staffsError.message);
  const typedRecord = requireDetailRow(record, "Outlet daily record", id) as RecordRow;
  const typedLines = requireReadRows(lines, "Outlet daily record lines") as LineRow[];
  const trustedBranches = requireReadRows(branches, "Outlet daily record branches");
  const trustedProducts = requireReadRows(products, "Outlet daily record products");
  const trustedStaffs = requireReadRows(staffs, "Outlet daily record staff");
  const productMap = new Map(trustedProducts.map((product) => [product.id, product]));
  return {
    record: {
      ...typedRecord,
      branch_name: trustedBranches.find((branch) => branch.id === typedRecord.branch_id)?.branch_name ?? "Unknown outlet",
      created_by_name: trustedStaffs.find((staff) => staff.id === typedRecord.created_by)?.full_name ?? null,
      updated_by_name: trustedStaffs.find((staff) => staff.id === (typedRecord.updated_by ?? typedRecord.submitted_by ?? typedRecord.created_by))?.full_name ?? null,
      reviewed_by_name: trustedStaffs.find((staff) => staff.id === typedRecord.reviewed_by)?.full_name ?? null,
      ...totals(typedLines),
    },
    lines: typedLines
      .map((line) => ({ ...line, morning_received_provided: receivedValueIsTrusted(line), product: productMap.get(line.product_id) }))
      .sort((a, b) => {
        if (!a.product) return 1;
        if (!b.product) return -1;
        return compareProductDisplayOrder(a.product, b.product);
      }),
    sales: Object.fromEntries((sales ?? []).map((row) => [row.channel, row.amount])),
  };
}

export async function getOutletDailyDemandTrend(filters: Filters = {}) {
  const period = (["7", "30", "month"].includes(filters.period ?? "") ? filters.period : "7") as TrendPeriod;
  const status = (["all", "evening_completed"].includes(filters.status ?? "") ? filters.status : "all") as TrendStatus;
  const { start, end } = trendDateRange(period, filters.history_date);
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
  if (!records) throw new Error("Outlet daily demand records returned no data.");
  const typedRecords = records as RecordRow[];
  const recordIds = typedRecords.map((record) => record.id);
  const { data: lines, error: linesError } = recordIds.length
    ? await db.from("outlet_daily_record_lines").select("*").in("record_id", recordIds)
    : { data: [], error: null };
  if (linesError) throw new Error(linesError.message);
  if (!lines) throw new Error("Outlet daily demand lines returned no data.");
  return buildDemandTrend({ records: typedRecords, lines: lines as LineRow[], branches: options.branches, products: options.products, start, end, period, status, branchId, productId });
}

export async function getOutletDailyCompletionMatrix(filters: Filters = {}) {
  const end = /^\d{4}-\d{2}-\d{2}$/.test(filters.history_date ?? "") ? filters.history_date! : todayInKualaLumpur();
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
    .select("id,branch_id,record_date,status,sales_review_status,updated_at")
    .gte("record_date", start)
    .lte("record_date", end)
    .order("updated_at", { ascending: false });
  if (selectedBranchId) query = query.eq("branch_id", selectedBranchId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Outlet daily completion matrix returned no data.");
  return buildOutletDailyCompletionMatrix({ branches, dates, records: data as Pick<RecordRow, "id" | "branch_id" | "record_date" | "status" | "sales_review_status" | "updated_at">[] });
}

function buildOutletDailyCompletionMatrix({ branches, dates, records }: {
  branches: Awaited<ReturnType<typeof getOutletDailyFormOptions>>["branches"];
  dates: string[];
  records: Pick<RecordRow, "id" | "branch_id" | "record_date" | "status" | "sales_review_status" | "updated_at">[];
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
      return { branch_id: branch.id, branch_name: branch.branch_name, record_date: recordDate, record_id: record?.id ?? null, status: record?.status ?? "missing", sales_review_status: record?.sales_review_status ?? null };
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
  const operationalProductIds = new Set(products.filter((product) => !isPackagingCategory(product.category)).map((product) => product.id));
  const candidateReliable = records.filter((record) => ["evening_completed", "reviewed"].includes(record.status) && (status === "all" || record.status === status));
  const linesByRecord = new Map<string, LineRow[]>();
  for (const line of lines) {
    const recordLines = linesByRecord.get(line.record_id) ?? [];
    recordLines.push(line);
    linesByRecord.set(line.record_id, recordLines);
  }
  const reliable = candidateReliable.filter((record) => {
    const recordLines = (linesByRecord.get(record.id) ?? []).filter((line) => operationalProductIds.has(line.product_id));
    return recordLines.length > 0 && recordLines.every(receivedValueIsTrusted);
  });
  const reliableIds = new Set(reliable.map((record) => record.id));
  const trendLines = lines.filter((line) => operationalProductIds.has(line.product_id) && reliableIds.has(line.record_id) && (!productId || line.product_id === productId));
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
  const unavailableRecords = candidateReliable.length - reliable.length;
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
  // A zero denominator is not a 0% rate. Keep the record visible in the
  // operational list as "Unavailable", but exclude it from rate trends.
  const dailyRows = toRows(daysByDate, (id) => id).filter((row) => row.received > 0).sort((left, right) => left.name.localeCompare(right.name));
  return {
    filters: { period, status, branch: branchId ?? "all", product: productId ?? "all", start, end },
    branches,
    products,
    summary: { ...summary, wastage_percent: wastagePercent(summary) },
    coverage: { completed: completedOutletDays, expected: expectedDays, reliable_lines: trendLines.length, incomplete: incompleteRecords, unavailable: unavailableRecords, missing: Math.max(expectedDays - completedOutletDays, 0), percent: coveragePercent, confidence },
    top_moving_products: [...productRows].sort((left, right) => right.movement - left.movement).slice(0, 10),
    top_wastage_products: [...productRows].sort((left, right) => right.wastage - left.wastage).slice(0, 10),
    outlets: outletRows.sort((left, right) => right.movement - left.movement),
    product_outlets: productOutletRows.sort((left, right) => right.movement - left.movement),
    daily: dailyRows,
  };
}
