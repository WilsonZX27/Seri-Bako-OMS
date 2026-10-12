import { productAvailableOn } from "@/lib/production-planning/availability";
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
type ContextOptions = { view?: "generation" | "plan" | "settings" | "events"; kitchens?: PlanningBranch[] };
export async function loadPlanningContext(db: LooseSupabase, companyId: string, kitchenId: string, date: string, options: ContextOptions = {}) {
  const view = options.view ?? "generation";
  const needsRules = view === "generation" || view === "settings";
  const needsEvents = view === "generation" || view === "events";
  const [branches, products, routes, settings, batches, minimums, events, holidayLinks] = await Promise.all([
    complete(() => { const query = db.from("branches").select("id,branch_name,branch_type", { count: "exact" }).eq("company_id", companyId).eq("status", "active").is("deleted_at", null); return options.kitchens ? query.eq("branch_type", "outlet") : query; }),
    complete(() => db.from("products").select("id,product_code,product_name,category,display_order,selling_unit,available_from,available_until", { count: "exact" }).eq("company_id", companyId).eq("status", "active").is("deleted_at", null)),
    complete(() => db.from("branch_supply_routes").select("id,destination_branch_id,effective_to", { count: "exact" }).eq("company_id", companyId).eq("source_branch_id", kitchenId).eq("status", "active").eq("is_primary", true).lte("effective_from", date)),
    rows(db.from("production_planning_settings").select("kitchen_id,enabled,draft_time,buffer_percent,max_decrease_percent,recipients").eq("company_id", companyId).eq("kitchen_id", kitchenId)),
    needsRules ? complete(() => db.from("production_batch_rules").select("*", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId), ["product_id"]) : Promise.resolve([]),
    needsRules ? complete(() => db.from("production_outlet_minimums").select("*", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId), ["branch_id", "product_id"]) : Promise.resolve([]),
    needsEvents ? complete(() => { const query=db.from("production_planning_events").select("*", { count: "exact" }).eq("company_id", companyId); return (view==="events"?query:query.eq("kitchen_id",kitchenId)).gte("event_date", view === "events" ? date : addDays(date, -56)).lte("event_date", view === "events" ? addDays(date, 90) : date); }) : Promise.resolve([]),
    view === "generation" ? rows(db.from("public_holiday_branches").select("branch_id,holiday_id").eq("company_id", companyId).eq("holiday_date", date).limit(1000)) : Promise.resolve([]),
  ]);
  const kitchens = options.kitchens ?? branches.filter((b) => b.branch_type === "central_kitchen") as unknown as PlanningBranch[];
  const routeIds = new Set(routes.filter((r) => !r.effective_to || String(r.effective_to) >= date).map((r) => r.destination_branch_id));
  const outlets = branches.filter((b) => view==="events"?b.branch_type==="outlet":routeIds.has(b.id)) as unknown as PlanningBranch[];
  const food = (products.filter((p) => String(p.category).trim().toLowerCase() !== "packaging") as unknown as PlanningProduct[]).sort(compareProductDisplayOrder);
  const holidayIds = [...new Set(holidayLinks.map((h) => String(h.holiday_id)))];
  const holidays = holidayIds.length ? await rows(db.from("public_holidays").select("id,name").eq("company_id", companyId).in("id", holidayIds)) : [];
  const holidayNames = new Map(holidays.map((h) => [h.id, h.name]));
  const config = (settings[0] ?? { kitchen_id: kitchenId, enabled: false, draft_time: "20:00:00", buffer_percent: 10, max_decrease_percent: 10, recipients: [] }) as unknown as PlanningConfig;
  return { kitchens, outlets, products: view === "generation" ? food.filter(p=>productAvailableOn(p,date)) : food, config, batches, minimums, events: events as unknown as PlanningEvent[], holidays: holidayLinks.filter((h) => routeIds.has(h.branch_id)).map((h) => ({ branch_id: String(h.branch_id), name: String(holidayNames.get(h.holiday_id) ?? "Public holiday") })) };
}
export async function buildPlanPayload(db: LooseSupabase, companyId: string, kitchenId: string, date: string) {
  const context = await loadPlanningContext(db, companyId, kitchenId, date);
  if (!context.kitchens.some((k) => k.id === kitchenId)) throw new Error("Kitchen access is required.");
  // A manual-only plan cannot infer demand from receipts. Do not read eight weeks
  // of records merely to discard their inferred quantities. Mixed plans retain
  // the full food-record completeness check before any same-day recommendation.
  const needsHistory = context.outlets.length > 0 && context.products.some(product => context.batches.some(batch => batch.product_id === product.id && batch.forecast_basis === "same_day"));
  const historyRecords = needsHistory ? await complete(() => db.from("outlet_daily_records").select("id,branch_id,record_date", { count: "exact" }).eq("company_id", companyId).in("branch_id", context.outlets.map(b => b.id)).gte("record_date", addDays(date, -56)).lt("record_date", date).in("status", ["evening_completed", "reviewed"])) : [];
  const recordMap = new Map(historyRecords.filter((r) => context.outlets.some((b) => b.id === r.branch_id)).map((r) => [String(r.id), r]));
  const ids = [...recordMap.keys()];
  const historyLines: Record<string, unknown>[] = [];
  // Bounded IN clauses avoid URL limits; every chunk is read to an exact count.
  for (let offset = 0; offset < ids.length; offset += 400) {
    const chunks = [0, 100, 200, 300].map(start => ids.slice(offset + start, offset + start + 100)).filter(chunk => chunk.length);
    const results = await Promise.all(chunks.map(chunk => complete(() => db.from("outlet_daily_record_lines").select("id,record_id,product_id,morning_received_qty,morning_received_provided,evening_leftover_qty,wastage_qty,wastage_provided,stockout", { count: "exact" }).in("record_id", chunk))));
    for (const result of results) historyLines.push(...result);
  }
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
    points.push({ recordId: String(record.id), date: dateValue, received: Number(line.morning_received_qty), leftover: Number(line.evening_leftover_qty), wastage: Number(line.wastage_qty), receivedProvided: line.morning_received_provided === true, completed: line.wastage_provided === true && !incompleteRecords.has(String(record.id)), specialEvent, stockout: line.stockout === true, stockoutObserved: typeof line.stockout === "boolean" });
    series.set(key, points);
  }
  const events = context.events.filter((e) => e.confirmed && e.event_date === date);
  const availableIds=new Set(context.products.map(p=>p.id));
  if(events.some(e=>e.lines.some(line=>!availableIds.has(line.product_id))))throw new Error("A confirmed event contains a product outside its supply period. Review the event before recalculating.");
  const allocations: Allocation[] = [];
  const product_lines: ProductionLine[] = [];
  for (const product of context.products) {
    const batch = context.batches.find((b) => b.product_id === product.id);
    const onOrder=batch?.forecast_basis === "on_order";
    if(onOrder&&!events.some(event=>event.lines.some(line=>line.product_id===product.id)))continue;
    let demand = 0, manual = false;
    for (const branch of context.outlets) {
      const rule = context.minimums.find((m) => m.branch_id === branch.id && m.product_id === product.id);
      const minimum = rule ? Number(rule.minimum_qty) : null;
      const evidence = recommendQuantity(series.get(`${branch.id}:${product.id}`) ?? [], date, minimum, Number(context.config.buffer_percent), Number(context.config.max_decrease_percent));
      if (batch?.forecast_basis !== "same_day") { evidence.stockoutRisk = false; evidence.method = "manual"; evidence.suggested = null; evidence.weightedMovement = null; evidence.reductionFloor = null; evidence.manualReason = "Multi-day or unconfirmed shelf-life: daily receipts cannot establish demand. Manager quantity required."; }
      const event_qty = events.filter((e) => e.branch_id === branch.id).reduce((sum,e) => sum+e.lines.filter((l) => l.product_id===product.id).reduce((s,l) => s+Number(l.qty),0),0);
      if(onOrder){evidence.suggested=0;evidence.minimum=0;evidence.manualReason="By order only: confirmed orders determine the quantity.";}
      const suggested_qty = evidence.suggested === null ? null : evidence.suggested + event_qty;
      allocations.push({ product_id: product.id, branch_id: branch.id, suggested_qty, approved_qty: suggested_qty, minimum_qty: minimum, reason: "", evidence, event_qty });
      if (suggested_qty === null) manual = true; else demand += suggested_qty;
    }
    const event_qty = events.filter((e) => !e.branch_id).reduce((sum,e) => sum+e.lines.filter((l) => l.product_id===product.id).reduce((s,l) => s+Number(l.qty),0),0);
    const yield_per_tray = batch ? Number(batch.yield_per_tray) : null;
    product_lines.push({ tray_mode: "automatic", product_id: product.id, yield_per_tray, trays: manual || !yield_per_tray ? null : Math.ceil((demand + event_qty) / yield_per_tray), retained_qty: 0, actual_qty: null, reason: "", event_qty });
  }
  return { kitchen_id: kitchenId, delivery_date: date, buffer_percent: Number(context.config.buffer_percent), max_decrease_percent: Number(context.config.max_decrease_percent), forecast_version: FORECAST_VERSION, product_lines, allocations, events, holidays: context.holidays };
}
export async function loadPlans(db: LooseSupabase, companyId: string, kitchenId: string, date: string, selectedId?: string): Promise<Plan[]> {
  const plans = (await complete(() => db.from("production_plans").select("id,company_id,kitchen_id,delivery_date,version,revision,status,buffer_percent,max_decrease_percent,created_at,approved_at", { count: "exact" }).eq("company_id", companyId).eq("kitchen_id", kitchenId).eq("delivery_date", date))).sort((a,b) => Number(b.version)-Number(a.version));
  if (!plans.length) return [];
  const selected = plans.find(plan => plan.id === selectedId) ?? plans[0];
  // Historical versions contribute selector metadata only. Forecast evidence and
  // allocations are read for the chosen version, never for every revision.
  const [snapshot, products, allocations] = await Promise.all([
    rows(db.from("production_plans").select("id,events,holidays").eq("company_id", companyId).eq("id", selected.id).limit(1)),
    complete(() => db.from("production_plan_products").select("*", { count: "exact" }).eq("plan_id", selected.id), ["product_id"]),
    complete(() => db.from("production_plan_allocations").select("*", { count: "exact" }).eq("plan_id", selected.id), ["branch_id", "product_id"]),
  ]);
  if (!snapshot[0]) throw new Error("This plan is no longer available. Reload to retry.");
  return plans.map(plan => ({ ...plan, events: plan.id === selected.id ? snapshot[0].events : [], holidays: plan.id === selected.id ? snapshot[0].holidays : [], product_lines: plan.id === selected.id ? products : [], allocations: plan.id === selected.id ? allocations : [] })) as unknown as Plan[];
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
