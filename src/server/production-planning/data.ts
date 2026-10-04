import type { LooseSupabase, LooseQuery } from "@/lib/supabase/loose";
import { addDays, recommendQuantity, FORECAST_VERSION, type HistoryPoint } from "@/lib/production-planning/forecast";
import type { Allocation, ProductionLine, PlanningProduct, PlanningBranch, PlanningConfig, PlanningEvent, Plan, DeliveryOrder } from "@/lib/production-planning/types";
import { compareProductDisplayOrder } from "@/lib/product-order";
import { readCompletePages } from "@/server/queries/read-complete-pages";

export async function complete<T extends Record<string, unknown>>(query: () => LooseQuery<T>, orderColumns = ["id"]): Promise<T[]> {
  return readCompletePages(async (from, to) => {
    let page = query();
    for (const column of orderColumns) page = page.order(column);
    const r = await page.range(from, to);
    return { ...r, count: r.count ?? null };
  });
}
async function rows<T extends Record<string, unknown>>(query: LooseQuery<T>) {
  const result = await query;
  if (result.error || !result.data) throw new Error(result.error?.message ?? "Planning data unavailable.");
  return result.data;
}
export async function loadPlanningContext(db: LooseSupabase, companyId: string, kitchenId: string, date: string) {
  const [branches, products, routes, settings, batches, minimums, events, holidayLinks] = await Promise.all([
    complete(() => db.from("branches").select("*", { count: "exact" }).eq("company_id", companyId).eq("status", "active").is("deleted_at", null)),
    complete(() => db.from("products").select("*", { count: "exact" }).eq("company_id", companyId).eq("status", "active").is("deleted_at", null)),
    complete(() => db.from("branch_supply_routes").select("*", { count: "exact" }).eq("company_id", companyId).eq("source_branch_id", kitchenId).eq("status", "active").eq("is_primary", true).lte("effective_from", date)),
    rows(db.from("production_planning_settings").select("*").eq("company_id", companyId).eq("kitchen_id", kitchenId)),
    complete(() => db.from("production_batch_rules").select("*", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId), ["product_id"]),
    complete(() => db.from("production_outlet_minimums").select("*", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId), ["branch_id", "product_id"]),
    complete(() => db.from("production_planning_events").select("*", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId).gte("event_date", addDays(date, -56)).lte("event_date", date)),
    rows(db.from("public_holiday_branches").select("branch_id,holiday_id").eq("company_id", companyId).eq("holiday_date", date).limit(1000)),
  ]);
  const kitchens = branches.filter((b) => b.branch_type === "central_kitchen") as unknown as PlanningBranch[];
  const routeIds = new Set(routes.filter((r) => !r.effective_to || String(r.effective_to) >= date).map((r) => r.destination_branch_id));
  const outlets = branches.filter((b) => routeIds.has(b.id)) as unknown as PlanningBranch[];
  const food = (products.filter((p) => String(p.category).toLowerCase() !== "packaging") as unknown as PlanningProduct[]).sort(compareProductDisplayOrder);
  const holidayIds = [...new Set(holidayLinks.map((h) => String(h.holiday_id)))];
  const holidays = holidayIds.length ? await rows(db.from("public_holidays").select("id,name").eq("company_id", companyId).in("id", holidayIds)) : [];
  const holidayNames = new Map(holidays.map((h) => [h.id, h.name]));
  const config = (settings[0] ?? { kitchen_id: kitchenId, enabled: false, draft_time: "20:00:00", buffer_percent: 10, max_decrease_percent: 10, recipients: [] }) as unknown as PlanningConfig;
  return { kitchens, outlets, products: food, config, batches, minimums, events: events as unknown as PlanningEvent[], holidays: holidayLinks.filter((h) => routeIds.has(h.branch_id)).map((h) => ({ branch_id: String(h.branch_id), name: String(holidayNames.get(h.holiday_id) ?? "Public holiday") })) };
}
export async function buildPlanPayload(db: LooseSupabase, companyId: string, kitchenId: string, date: string) {
  const context = await loadPlanningContext(db, companyId, kitchenId, date);
  if (!context.kitchens.some((k) => k.id === kitchenId)) throw new Error("Kitchen access is required.");
  const historyRecords = await complete(() => db.from("outlet_daily_records").select("*", { count: "exact" }).eq("company_id", companyId).gte("record_date", addDays(date, -56)).lt("record_date", date).in("status", ["evening_completed", "reviewed"]));
  const recordMap = new Map(historyRecords.filter((r) => context.outlets.some((b) => b.id === r.branch_id)).map((r) => [String(r.id), r]));
  const ids = [...recordMap.keys()];
  const historyLines: Record<string, unknown>[] = [];
  // Bounded IN clauses avoid URL limits; every chunk is read to an exact count.
  for (let i = 0; i < ids.length; i += 100) historyLines.push(...await complete(() => db.from("outlet_daily_record_lines").select("*", { count: "exact" }).in("record_id", ids.slice(i, i + 100))));
  const foodIds = new Set(context.products.map((p) => p.id));
  const incompleteRecords = new Set(historyLines.filter((l) => foodIds.has(String(l.product_id)) && (l.morning_received_provided !== true || l.wastage_provided !== true)).map((l) => String(l.record_id)));
  const series = new Map<string, HistoryPoint[]>();
  for (const line of historyLines) {
    const record = recordMap.get(String(line.record_id));
    if (!record) throw new Error("History changed during read. Retry generation.");
    const dateValue = String(record.record_date);
    const specialEvent = context.events.some((e) => e.confirmed && e.event_date === dateValue && e.branch_id === record.branch_id && e.lines.some((l) => l.product_id === line.product_id));
    const key = `${record.branch_id}:${line.product_id}`;
    const points = series.get(key) ?? [];
    points.push({ recordId: String(record.id), date: dateValue, received: Number(line.morning_received_qty), leftover: Number(line.evening_leftover_qty), wastage: Number(line.wastage_qty), receivedProvided: line.morning_received_provided === true, completed: line.wastage_provided === true && !incompleteRecords.has(String(record.id)), specialEvent, stockout: line.stockout === true });
    series.set(key, points);
  }
  const events = context.events.filter((e) => e.confirmed && e.event_date === date);
  const allocations: Allocation[] = [];
  const product_lines: ProductionLine[] = [];
  for (const product of context.products) {
    const batch = context.batches.find((b) => b.product_id === product.id);
    let demand = 0, manual = false;
    for (const branch of context.outlets) {
      const rule = context.minimums.find((m) => m.branch_id === branch.id && m.product_id === product.id);
      const minimum = rule ? Number(rule.minimum_qty) : null;
      const evidence = recommendQuantity(series.get(`${branch.id}:${product.id}`) ?? [], date, minimum, Number(context.config.buffer_percent), Number(context.config.max_decrease_percent));
      if (batch?.forecast_basis !== "same_day") { evidence.method = "manual"; evidence.suggested = null; evidence.weightedMovement = null; evidence.reductionFloor = null; evidence.manualReason = "Multi-day or unconfirmed shelf-life: daily receipts cannot establish demand. Manager quantity required."; }
      const event_qty = events.filter((e) => e.branch_id === branch.id).reduce((sum,e) => sum+e.lines.filter((l) => l.product_id===product.id).reduce((s,l) => s+Number(l.qty),0),0);
      const suggested_qty = evidence.suggested === null ? null : evidence.suggested + event_qty;
      allocations.push({ product_id: product.id, branch_id: branch.id, suggested_qty, approved_qty: suggested_qty, minimum_qty: minimum, reason: "", evidence, event_qty });
      if (suggested_qty === null) manual = true; else demand += suggested_qty;
    }
    const event_qty = events.filter((e) => !e.branch_id).reduce((sum,e) => sum+e.lines.filter((l) => l.product_id===product.id).reduce((s,l) => s+Number(l.qty),0),0);
    const yield_per_tray = batch ? Number(batch.yield_per_tray) : null;
    product_lines.push({ product_id: product.id, yield_per_tray, trays: manual || !yield_per_tray ? null : Math.ceil((demand + event_qty) / yield_per_tray), retained_qty: 0, actual_qty: null, reason: "", event_qty });
  }
  return { kitchen_id: kitchenId, delivery_date: date, buffer_percent: Number(context.config.buffer_percent), max_decrease_percent: Number(context.config.max_decrease_percent), forecast_version: FORECAST_VERSION, product_lines, allocations, events, holidays: context.holidays };
}
export async function loadPlans(db: LooseSupabase, companyId: string, kitchenId: string, date: string): Promise<Plan[]> {
  const plans = (await complete(() => db.from("production_plans").select("*", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId).eq("delivery_date", date))).sort((a,b) => Number(b.version)-Number(a.version));
  if (!plans.length) return [];
  const ids = plans.map((p) => p.id);
  const [products, allocations] = await Promise.all([
    complete(() => db.from("production_plan_products").select("*", { count: "exact" }).in("plan_id", ids), ["plan_id", "product_id"]),
    complete(() => db.from("production_plan_allocations").select("*", { count: "exact" }).in("plan_id", ids), ["plan_id", "branch_id", "product_id"]),
  ]);
  return plans.map((p) => ({ ...p, product_lines: products.filter((l) => l.plan_id===p.id), allocations: allocations.filter((l) => l.plan_id===p.id) })) as unknown as Plan[];
}
export async function loadDeliveryOrders(db: LooseSupabase, filters: { companyId: string; date?: string; id?: string; kitchenId?: string; branchId?: string; recordId?: string }): Promise<DeliveryOrder[]> {
  let query = db.from("production_delivery_orders").select("*").eq("company_id", filters.companyId).order("created_at");
  if (filters.date) query=query.eq("delivery_date", filters.date);
  if (filters.id) query=query.eq("id", filters.id);
  if (filters.kitchenId) query=query.eq("kitchen_id", filters.kitchenId);
  if (filters.branchId) query=query.eq("branch_id", filters.branchId);
  if (filters.recordId) query=query.eq("daily_record_id", filters.recordId);
  const orders = await rows(query.limit(501));
  if (orders.length > 500) throw new Error("Too many delivery orders. Choose a narrower scope.");
  if (!orders.length) return [];
  const lines = await complete(() => db.from("production_delivery_order_lines").select("*", { count: "exact" }).in("do_id", orders.map((d) => d.id)), ["do_id", "product_id"]);
  return orders.map((d) => ({ ...d, lines: lines.filter((l) => l.do_id === d.id).sort((a,b) => compareProductDisplayOrder({product_code:String(a.product_code),display_order:Number(a.display_order)},{product_code:String(b.product_code),display_order:Number(b.display_order)})) })) as unknown as DeliveryOrder[];
}
