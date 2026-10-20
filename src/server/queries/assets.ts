import { todayInKualaLumpur } from "@/lib/business-date";
import { addDays } from "@/lib/production-planning/forecast";
import { cache } from "react";
import { canAccessAssetManagement } from "@/lib/asset-access";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { requirePermission } from "@/server/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";

export type AssetLocation = { id: string; source_name: string; branch_id: string | null; kind: "branch" | "event" | "other" };
export type Asset = { id: string; asset_code: string; item_name: string; source_data: Record<string, unknown>; current_details: Record<string, unknown>; updated_at: string; original_record_access?: boolean };
export type AssetSummary = Pick<Asset, "id" | "asset_code" | "item_name"> & { current_details?: Record<string, unknown>; audits?: {location_id:string;result:string|null;date:string|null}[] };
export type AssetAttachment = { id: string; asset_id: string | null; maintenance_id: string | null; location_id: string | null; created_at: string; url: string; storage_path: string | null; verified_at: string | null; source_data: Record<string, unknown> };
function exactAssetCount(value: unknown): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) throw new Error("Asset result count unavailable.");
  return value;
}
const attachmentColumns = "id,asset_id,maintenance_id,location_id,created_at,url,storage_path,verified_at,source_data";
export type AssetHolding = { asset_id: string; location_id: string; quantity: number | null; condition?:string|null; status?:string|null; latest_check_result?:string|null };
export type AssetOverview = { assetCount: number; knownQuantity: number; unknownHoldings: number; attentionAssets: number; openMaintenance: number; inTransitQuantity: number; locations: { id: string; name: string; assetCount: number; quantity: number | null }[]; checkDate: string; checklist: { id: string; name: string; kind: "branch" | "event" | "other"; open: boolean; reason: string | null; expected: number; checked: number; submitted?: boolean }[]; maintenanceTrend: { date: string; count: number }[]; issueTrend: { date: string; count: number | null; checked: number }[]; maintenanceByStatus: { status: string; count: number }[] };
export type AssetRecord = { id: string; asset_id: string | null; reported_by?: string; location_id?: string; from_location_id?: string; to_location_id?: string; source_id?: string; status?: string; priority?: string; description?: string; reason?: string; quantity?: number | null; author_name?: string; created_at?: string; check_date?: string; result?: string; source_data: Record<string, unknown> };
export type AssetView = "overview" | "assets" | "checklist" | "maintenance" | "transfers";

export const getAssetRegistration = cache(async () => {
  const actor = await requireActiveTenantActor(); await requirePermission("assets.manage");
  const db = looseSupabase(await createClient());
  const activation = await db.rpc("asset_company_live", { p_company: actor.companyId });
  if (activation.error || activation.data === null) throw new Error(activation.error?.message ?? "Asset activation unavailable.");
  if (activation.data !== true) return { active: false, locations: [] as AssetLocation[] };
  const result = await db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id", actor.companyId).order("source_name");
  if (result.error || result.data === null) throw new Error(result.error?.message ?? "Asset locations unavailable.");
  return { active: true, locations: result.data as AssetLocation[] };
});

export const getAssetWorkspace = cache(async (view: AssetView, page = 1, query = "", date = "", status = "", locationId = "", sort = "code", category = "") => {
  const actor = await requireActiveTenantActor();
  if ((view === "overview") && !canAccessAssetManagement(actor.roleCode)) throw new Error("Asset management role required.");
  if (view === "maintenance" && !canAccessAssetManagement(actor.roleCode)) await requirePermission("assets.report");
  await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const company = actor.companyId;
  const activation = await db.rpc("asset_company_live", { p_company: company });
  if (activation.error || activation.data === null) throw new Error(activation.error?.message ?? "Asset activation could not be verified.");
  if (activation.data !== true) return { active: false, view, page, query, locations: [] as AssetLocation[], overview: null as AssetOverview | null, assets: [] as AssetSummary[], holdings: [] as AssetHolding[], records: [] as AssetRecord[], total: 0, maintenanceSummary: null as Record<string,number> | null, filterOptions: {categories:[] as string[],statuses:[] as string[]} };
  const locationsResult = await db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id", company).order("source_name");
  if (locationsResult.error || locationsResult.data === null) throw new Error(locationsResult.error?.message ?? "Asset locations unavailable.");
  const locations = locationsResult.data as AssetLocation[];
  if (locationId && !locations.some(location => location.id === locationId)) throw new Error("Asset location unavailable.");
  let maintenanceSummary: Record<string,number> | null = null;
  let filterOptions = {categories:[] as string[],statuses:[] as string[]};
  let overview: AssetOverview | null = null;
  let assets: AssetSummary[] = [], holdings: AssetHolding[] = [], records: AssetRecord[] = [], total = 0;
  if (view === "overview" || view === "checklist") {
    const checkDate = date || todayInKualaLumpur(); addDays(checkDate, 0);
    const result = await db.rpc(view === "checklist" ? "get_asset_checklist_summary" : "get_asset_overview", { p_date: checkDate });
    if (result.error || !result.data) throw new Error(result.error?.message ?? "Asset summary unavailable.");
    overview = result.data as AssetOverview;
    const submitted = new Set<string>();
    for (let offset = 0; ; offset += 500) {
      const checks = await db.from("asset_daily_checks").select("id,location_id").eq("company_id", company).eq("check_date", checkDate).not("source_data", "cs", '{"Count Confirmation":true}').order("id").range(offset, offset + 499);
      if (checks.error || !checks.data) throw new Error("Checklist submission status unavailable.");
      for (const check of checks.data) submitted.add(String(check.location_id));
      if (checks.data.length < 500) break;
    }
    overview.checklist = overview.checklist.map(location => ({ ...location, submitted: submitted.has(location.id) }));
  }
  if (view === "assets") {
    const result=await db.rpc("get_asset_register",{p_page:page,p_query:query,p_location:locationId || null,p_sort:sort,p_status:status,p_category:category});
    if(result.error || !result.data) throw new Error(result.error?.message ?? "Asset register unavailable.");
    const register=result.data as {assets:AssetSummary[];holdings:AssetHolding[];total:number;filterOptions:typeof filterOptions};
    total=exactAssetCount(register.total);
    if(!Array.isArray(register.assets)||!Array.isArray(register.holdings)||!Array.isArray(register.filterOptions?.categories)||!Array.isArray(register.filterOptions?.statuses)) throw new Error("Asset register unavailable.");
    assets=register.assets;holdings=register.holdings;filterOptions=register.filterOptions;
  } else if (view === "overview") {
    for(let offset=0;;offset+=500) {
      const result = await db.from("asset_maintenance").select("*").eq("company_id",company).order("id").range(offset,offset+499);
      if(result.error || result.data === null) throw new Error(result.error?.message ?? "Open maintenance unavailable.");
      records.push(...(result.data as AssetRecord[]).filter(row=>!["closed","resolved","cancelled"].includes((row.status ?? "").toLowerCase())));
      if(result.data.length<500) break;
    }
    const ids=[...new Set(records.flatMap(row=>row.asset_id ? [row.asset_id] : []))];
    for(let offset=0;offset<ids.length;offset+=100) {
      const result=await db.from("assets").select("id,asset_code,item_name,current_details").eq("company_id",company).in("id",ids.slice(offset,offset+100));
      if(result.error || result.data === null) throw new Error(result.error?.message ?? "Maintenance assets unavailable.");
      assets.push(...result.data as AssetSummary[]);
    }
  } else {
    const table = view === "checklist" ? "asset_daily_checks" : view === "maintenance" ? "asset_maintenance" : "asset_transfers";
    let request = db.from(table).select("*", { count: "exact" }).eq("company_id", company);
    if (locationId && view !== "transfers") request = request.eq("location_id", locationId);
    if (status && (view === "maintenance" || view === "transfers")) request = request.eq("status", status);
    const recordDate = date || (view === "checklist" ? todayInKualaLumpur() : "");
    if (recordDate && /^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
      if (view === "checklist") request = request.eq("check_date", recordDate);
      if (view === "maintenance") {
        const next = addDays(recordDate, 1);
        request = request.gte("source_data->>Created Date", recordDate).lt("source_data->>Created Date", next);
      }
    }
    const result = await request.order(view === "checklist" ? "check_date" : view === "maintenance" ? "source_data->>Created Date" : "created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
    if (result.error || result.data === null) throw new Error(result.error?.message ?? "Asset records unavailable.");
    records = result.data as AssetRecord[]; total = exactAssetCount(result.count);
    const ids = [...new Set(records.flatMap(r => r.asset_id ? [r.asset_id] : []))];
    if (ids.length) {
      const result = await db.from("assets").select("id,asset_code,item_name,current_details").eq("company_id", company).in("id", ids);
      if (result.error || result.data === null) throw new Error(result.error?.message ?? "Related assets unavailable.");
      assets = result.data as AssetSummary[];
    }
  }
  if(view === "maintenance") {
    maintenanceSummary={"Total tickets":0,"Outstanding":0,"Processed":0,"Cancelled":0};
    for(let offset=0;;offset+=500) {
      let summary=db.from("asset_maintenance").select("status").eq("company_id",company);
      if(locationId)summary=summary.eq("location_id",locationId);
      if(date && /^\d{4}-\d{2}-\d{2}$/.test(date))summary=summary.gte("source_data->>Created Date",date).lt("source_data->>Created Date",addDays(date,1));
      const result=await summary.order("id").range(offset,offset+499);
      if(result.error || result.data===null)throw new Error("Maintenance summary unavailable.");
      for(const row of result.data){const state=String(row.status??"").toLowerCase();maintenanceSummary["Total tickets"]++;maintenanceSummary[state==="cancelled"?"Cancelled":["closed","resolved"].includes(state)?"Processed":"Outstanding"]++;}
      if(result.data.length<500)break;
    }
  }
  return { active: true, view, page, query, locations, overview, assets, holdings, records, total, filterOptions, maintenanceSummary };
});

export async function getAssetDetail(id: string) {
  const actor = await requireActiveTenantActor();
  await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const results = await Promise.all([
    db.rpc("get_asset_identity", { p_asset: id }),
    db.from("asset_holdings").select("asset_id,location_id,quantity").eq("company_id", actor.companyId).eq("asset_id", id),
    db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id", actor.companyId).order("source_name"),
    db.from("asset_maintenance").select("*").eq("company_id", actor.companyId).eq("asset_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("asset_transfers").select("*").eq("company_id", actor.companyId).eq("asset_id", id).order("created_at", { ascending: false }).limit(50),
    db.from("asset_master_updates").select("*").eq("company_id", actor.companyId).eq("asset_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(50),
    db.from("asset_attachments").select(attachmentColumns, { count: "exact" }).eq("company_id", actor.companyId).eq("asset_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(5),
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  if (!results[0].data) return null;
  if (typeof results[6].count !== "number") throw new Error("Attachment count unavailable.");
  for (const result of results.slice(1)) if (result.data === null) throw new Error("Asset details unavailable.");
  return { asset: results[0].data as Asset, holdings: results[1].data as AssetHolding[], locations: results[2].data as AssetLocation[], maintenance: results[3].data as AssetRecord[], transfers: results[4].data as AssetRecord[], masterUpdates: results[5].data as { id: string; author_name: string; created_at: string; source_data: Record<string, unknown> }[], attachments: results[6].data as AssetAttachment[], attachmentTotal: exactAssetCount(results[6].count) };
}

export async function getAssetInspection(id: string) {
  const first = await getAssetLocation(id, 1);
  if (!first) return null;
  if (first.total > 5000) throw new Error("This location exceeds the checklist submission limit.");
  const holdings = [...first.holdings];
  const assets = [...first.assets];
  for (let page = 2; (page - 1) * 50 < first.total; page++) {
    const next = await getAssetLocation(id, page);
    if (!next || next.total !== first.total) throw new Error("Location assets changed. Reload the checklist.");
    holdings.push(...next.holdings);
    assets.push(...next.assets);
  }
  if (holdings.length !== first.total || new Set(holdings.map(row => row.asset_id)).size !== first.total) throw new Error("Location assets changed. Reload the checklist.");
  return { ...first, holdings, assets };
}

export async function getAssetLocation(id: string, page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) throw new Error("Choose a valid asset history page.");
  const actor = await requireActiveTenantActor();
  await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const location = await db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id", actor.companyId).eq("id", id).maybeSingle();
  if (location.error) throw new Error(location.error.message);
  if (!location.data) return null;
  const result = await db.from("asset_holdings").select("asset_id,location_id,quantity", { count: "exact" }).eq("company_id", actor.companyId).eq("location_id", id).order("asset_id").range((page - 1) * 50, page * 50 - 1);
  if (result.error || result.data === null) throw new Error(result.error?.message ?? "Location holdings unavailable.");
  const holdings = result.data as AssetHolding[];
  let assets: AssetSummary[] = [];
  if (holdings.length) {
    const rows = await db.from("assets").select("id,asset_code,item_name,current_details").eq("company_id", actor.companyId).in("id", holdings.map(h => h.asset_id));
    if (rows.error || rows.data === null) throw new Error(rows.error?.message ?? "Location assets unavailable.");
    const metadata = await db.rpc("get_asset_register_source_fields", { p_assets: holdings.map(h => h.asset_id) });
    if (metadata.error || metadata.data === null) throw new Error(metadata.error?.message ?? "Location asset categories unavailable.");
    const sourceFields = new Map((metadata.data as { asset_id: string; details: Record<string, unknown> }[]).map(row => [row.asset_id, row.details]));
    assets = (rows.data as AssetSummary[]).map(asset => ({ ...asset, current_details: { ...sourceFields.get(asset.id), ...asset.current_details } }));
  }
  return { location: location.data as AssetLocation, holdings, assets, total: exactAssetCount(result.count) };
}

export async function getAssetMaintenanceDetail(id: string, page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) throw new Error("Choose a valid asset history page.");
  const actor = await requireActiveTenantActor();
  if (!canAccessAssetManagement(actor.roleCode)) await requirePermission("assets.report");
  await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const [request, history, attachments] = await Promise.all([
    db.from("asset_maintenance").select("*").eq("company_id", actor.companyId).eq("id", id).maybeSingle(),
    db.from("asset_maintenance_updates").select("*", { count: "exact" }).eq("company_id", actor.companyId).eq("maintenance_id", id).order("source_data->>Update Date", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1),
    db.from("asset_attachments").select(attachmentColumns, { count: "exact" }).eq("company_id", actor.companyId).eq("maintenance_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(5),
  ]);
  if (request.error || history.error || attachments.error) throw new Error(request.error?.message ?? history.error?.message ?? attachments.error?.message);
  if (!request.data) return null;
  if (history.data === null || attachments.data === null || typeof attachments.count !== "number") throw new Error("Maintenance history or attachments unavailable.");
  const location = await db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id",actor.companyId).eq("id",request.data.location_id).maybeSingle();
  if (location.error) throw new Error(location.error.message);
  return { location: location.data as AssetLocation | null, request: request.data as AssetRecord, history: history.data as { id: string; source_id: string; author_name: string; source_data: Record<string, unknown>; created_at: string }[], total: exactAssetCount(history.count), attachments: attachments.data as AssetAttachment[], attachmentTotal: exactAssetCount(attachments.count) };
}

export async function getAssetMasterHistory(id: string, page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) throw new Error("Choose a valid asset history page.");
  const actor = await requireActiveTenantActor(); await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const asset = await db.rpc("get_asset_identity", { p_asset: id });
  if (asset.error) throw new Error(asset.error.message);
  if (!asset.data) return null;
  const history = await db.from("asset_master_updates").select("*", { count: "exact" }).eq("company_id", actor.companyId).eq("asset_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1);
  if (history.error || history.data === null) throw new Error(history.error?.message ?? "Master history unavailable.");
  return { asset: asset.data as AssetSummary & { source_data: Record<string, unknown> }, history: history.data as { id: string; author_name: string; created_at: string; source_data: Record<string, unknown> }[], total: exactAssetCount(history.count) };
}

/** Full attachment history stays bounded and ordered independently of detail previews. */
export async function getAssetAttachmentRegister(kind: "asset" | "maintenance", id: string, page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) throw new Error("Choose a valid attachment page.");
  const actor = await requireActiveTenantActor(); await requirePermission("assets.view");
  if (kind === "maintenance" && !canAccessAssetManagement(actor.roleCode)) await requirePermission("assets.report");
  const db = looseSupabase(await createClient());
  const parent = await db.from(kind === "asset" ? "assets" : "asset_maintenance")
    .select(kind === "asset" ? "id,asset_code,item_name,current_details" : "id,source_id,asset_id")
    .eq("company_id", actor.companyId).eq("id", id).maybeSingle();
  if (parent.error) throw new Error(parent.error.message);
  if (!parent.data) return null;
  const attachments = await db.from("asset_attachments").select(attachmentColumns, { count: "exact" })
    .eq("company_id", actor.companyId).eq(kind === "asset" ? "asset_id" : "maintenance_id", id)
    .order("created_at", { ascending: false }).order("id", { ascending: false })
    .range((page - 1) * 50, page * 50 - 1);
  if (attachments.error || attachments.data === null || typeof attachments.count !== "number") throw new Error(attachments.error?.message ?? "Attachment history unavailable.");
  return { label: String(kind === "asset" ? parent.data.asset_code : parent.data.source_id ?? "Maintenance request"), attachments: attachments.data as AssetAttachment[], total: attachments.count };
}

export async function getAssetTransferDetail(id: string, page: number) {
  if (!Number.isSafeInteger(page) || page < 1 || page > 1_000_000) throw new Error("Choose a valid transfer history page.");
  const actor = await requireActiveTenantActor(); await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const transfer = await db.from("asset_transfers").select("*").eq("company_id", actor.companyId).eq("id", id).maybeSingle();
  if (transfer.error) throw new Error(transfer.error.message);
  if (!transfer.data) return null;
  const row = transfer.data as AssetRecord;
  if (!row.from_location_id || !row.to_location_id) throw new Error("Transfer locations unavailable.");
  const [asset, locations, history] = await Promise.all([
    db.from("assets").select("id,asset_code,item_name,current_details").eq("company_id", actor.companyId).eq("id", row.asset_id).maybeSingle(),
    db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id", actor.companyId).in("id", [row.from_location_id, row.to_location_id]),
    db.from("asset_transfer_updates").select("id,author_name,created_at,source_data", { count: "exact" }).eq("company_id", actor.companyId).eq("transfer_id", id).order("created_at", { ascending: false }).order("id", { ascending: false }).range((page - 1) * 50, page * 50 - 1),
  ]);
  if (asset.error || locations.error || history.error) throw new Error(asset.error?.message ?? locations.error?.message ?? history.error?.message);
  if (!asset.data || locations.data === null || history.data === null || typeof history.count !== "number") throw new Error("Transfer details unavailable.");
  return { transfer: row, asset: asset.data as AssetSummary, locations: locations.data as AssetLocation[], history: history.data as { id: string; author_name: string; created_at: string; source_data: Record<string, unknown> }[], total: history.count };
}

/** Location-scoped choices for reporting; ordinary staff never receive company-wide assets. */
export async function getMaintenanceReportOptions() {
  const actor = await requireActiveTenantActor();
  await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const locations = await db.from("asset_locations").select("id,source_name,branch_id,kind").eq("company_id",actor.companyId).order("source_name");
  if (locations.error || !locations.data) throw new Error("Locations unavailable. Try again.");
  const choices: {id:string;locationId:string;label:string}[]=[];
  for (let offset=0; ; offset+=500) {
    const result=await db.from("asset_holdings").select("asset_id,location_id,quantity,assets!inner(id,asset_code,item_name)").eq("company_id",actor.companyId).order("id").range(offset,offset+499);
    if(result.error || !result.data) throw new Error("Assets unavailable. Try again.");
    for(const row of result.data) {
      const asset=Array.isArray(row.assets) ? row.assets[0] : row.assets;
      if(asset && (row.quantity===null || Number(row.quantity)>0)) choices.push({id:String(row.asset_id),locationId:String(row.location_id),label:`${asset.item_name} · ${asset.asset_code}`});
    }
    if(result.data.length<500) break;
    if(offset>=9500) throw new Error("Too many asset choices. Contact your manager.");
  }
  return {locations:locations.data as AssetLocation[],choices};
}

/** Existing daily checks are immutable; quantity confirmations are a separate workflow. */
export async function hasAssetChecklistSubmission(locationId: string, date: string) {
  const actor = await requireActiveTenantActor();
  const db = looseSupabase(await createClient());
  const result = await db.from("asset_daily_checks").select("id").eq("company_id", actor.companyId).eq("location_id", locationId).eq("check_date", date).not("source_data", "cs", '{"Count Confirmation":true}').limit(1);
  if (result.error) throw new Error("Checklist submission status unavailable.");
  return Boolean(result.data?.length);
}

/** Reuse only values visible to the authenticated tenant actor; no elevated client. */
export const getAssetMasterOptions = cache(async () => {
  const actor = await requireActiveTenantActor();
  await requirePermission("assets.manage");
  const db = looseSupabase(await createClient());
  const choices: Record<string, Set<string>> = { "Department / Area": new Set(), Category: new Set() };
  const collect = (raw: unknown) => {
    const details = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    for (const key of Object.keys(choices)) {
      const value = details?.[key];
      if (typeof value === "string" && value.trim()) choices[key].add(value.trim());
    }
  };
  for (let offset = 0;; offset += 500) {
    const rows = await db.from("assets").select("id,current_details").eq("company_id", actor.companyId).order("id").range(offset, offset + 499);
    if (rows.error || !rows.data) throw new Error(rows.error?.message ?? "Asset choices unavailable.");
    const source = rows.data.length ? await db.rpc("get_asset_register_source_fields", { p_assets: rows.data.map(row => String(row.id)) }) : { data: [], error: null };
    if (source.error || !source.data) throw new Error(source.error?.message ?? "Asset source choices unavailable.");
    for (const row of source.data as {details: unknown}[]) collect(row.details);
    for (const row of rows.data) collect(row.current_details);
    if (rows.data.length < 500) break;
  }
  for (let offset = 0;; offset += 500) {
    const history = await db.from("asset_master_updates").select("id,source_data").eq("company_id", actor.companyId).order("id").range(offset, offset + 499);
    if (history.error || !history.data) throw new Error(history.error?.message ?? "Asset history choices unavailable.");
    for (const row of history.data) for (const key of ["Details", "Details Before", "Details After"]) collect((row.source_data as Record<string, unknown> | null)?.[key]);
    if (history.data.length < 500) break;
  }
  const people: {id: string; full_name: string; staff_code: string | null}[] = [];
  for (let offset = 0;; offset += 500) {
    const result = await db.from("staffs").select("id,full_name,staff_code").eq("company_id", actor.companyId).eq("status", "active").is("deleted_at", null).not("auth_user_id", "is", null).order("id").range(offset, offset + 499);
    if (result.error || !result.data) throw new Error(result.error?.message ?? "OMS users unavailable.");
    people.push(...result.data as typeof people);
    if (result.data.length < 500) break;
  }
  return { fields: Object.fromEntries(Object.entries(choices).map(([key, values]) => [key, [...values].sort()])), people };
});

/** Read the immutable submitted checklist under the same tenant and RLS scope. */
export async function getAssetChecklistRecords(locationId: string, date: string) {
  const actor = await requireActiveTenantActor();
  await requirePermission("assets.view");
  const db = looseSupabase(await createClient());
  const records: { id: string; asset_id: string; result: string; quantity: number | null; author_name: string; created_at: string }[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db.from("asset_daily_checks").select("id,asset_id,result,quantity,author_name,created_at").eq("company_id", actor.companyId).eq("location_id", locationId).eq("check_date", date).not("source_data", "cs", '{"Count Confirmation":true}').order("created_at").order("id").range(offset, offset + 499);
    if (result.error || !result.data) throw new Error("Checklist records unavailable.");
    records.push(...result.data as typeof records);
    if (result.data.length < 500) break;
  }
  return records;
}
