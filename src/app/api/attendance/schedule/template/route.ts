import { NextResponse } from "next/server";
import { GET as catalogGET } from "../import-catalog/route";
import { createHash } from "node:crypto";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { logServerError } from "@/server/observability/logger";
import { buildScheduleTemplate } from "@/lib/attendance/schedule-template-workbook";
import { parseScheduleTemplate } from "@/lib/attendance/schedule-template";
import type { ScheduleImportCatalog } from "@/lib/attendance/schedule-workbook";

const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
function validWeek(week: string) {
  const d = new Date(week + "T00:00:00Z");
  return /^\d{4}-\d{2}-\d{2}$/.test(week) && Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === week && d.getUTCDay() === 1;
}
async function currentCatalog(request: Request, week: string) {
  const actor = await requireActiveTenantActor();
  if (!await hasPermission("schedule.draft")) return null;
  const url = new URL(request.url); url.search = new URLSearchParams({ week }).toString();
  const response = await catalogGET(new Request(url, { headers: request.headers }));
  if (!response.ok) throw new Error("Catalogue unavailable");
  const catalog = await response.json() as ScheduleImportCatalog;
  if (catalog.company_id !== actor.companyId) throw new Error("Company scope mismatch");
  const db = looseSupabase(await createClient());
  // With a null week, the existing RPC only returns explicit staff_branches
  // membership (no historical-assignment fallback). It already checks company,
  // destination access and schedule.read; no direct roster-directory grant.
  const mappings = await Promise.all(catalog.branches.map(async branch => {
    const result = await db.rpc("get_schedule_staff", {p_branch_id:branch.id,p_week_id:null});
    if (result.error) throw result.error;
    if (!Array.isArray(result.data) || result.data.some(p => !p || typeof p.id !== "string")) throw new Error("Employee-location mapping unavailable");
    return result.data.map(p => ({staff_id:String(p.id),branch_id:branch.id}));
  }));
  catalog.template_memberships = mappings.flat().filter(m => catalog.staff.some(p => p.id === m.staff_id && p.branch_id === m.branch_id));
  catalog.staff = catalog.staff.filter(p => catalog.template_memberships!.some(m => m.staff_id === p.id && m.branch_id === p.branch_id));
  const eligibility = await db.rpc("get_schedule_template_eligibility",{p_week_start:week,p_branch_ids:catalog.branches.map(b=>b.id)});
  const dates = eligibility.data;
  const eligibilityReady = !eligibility.error && Array.isArray(dates) && dates.every(r=>r && typeof r.staff_id === "string" && typeof r.branch_id === "string" && Array.isArray(r.eligible_dates) && r.eligible_dates.every((d:unknown)=>typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)));
  if (eligibilityReady) catalog.staff = catalog.staff.map(person=>({...person,eligibility:(dates as Array<{staff_id:string;branch_id:string;eligible_dates:string[]}>).find(r=>r.staff_id===person.id && r.branch_id===person.branch_id)?.eligible_dates.map(d=>({from:d,to:d})) ?? []}));
  const authorised = new Set(catalog.staff.map(p => p.id));
  // Include boundary dates for overnight conflict checks. Existing RLS still owns
  // record visibility; no service-role client or cross-company lookup is used.
  const date = (offset: number) => new Date(Date.parse(week + "T00:00:00Z") + offset * 86400000).toISOString().slice(0, 10);
  const assignments = authorised.size ? await db.from("shift_assignment_revisions").select("id,branch_id,staff_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,work_site_label,ro_minutes,template_snapshot").eq("company_id", actor.companyId).eq("is_current", true).in("staff_id", [...authorised]).gte("work_date", date(-1)).lte("work_date", date(7)) : { data: [], error: null };
  if (assignments.error) throw assignments.error;
  catalog.current_assignments = assignments.data ?? [];
  const support = await db.rpc("schedule_template_import_capabilities");
  const capability = support.data as {version?:number;atomic_interval_conflicts?:boolean;explicit_membership?:boolean} | null;
  catalog.template_import_ready = eligibilityReady && !support.error && capability?.version === 1 && capability.atomic_interval_conflicts === true && capability.explicit_membership === true;
  if (!catalog.template_import_ready) catalog.template_import_message = "Template draft import is not available yet. You can download and preview this workbook; use the Schedule editor to save drafts. No rows were saved.";
  return catalog;
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url), week = url.searchParams.get("week") ?? "";
    if (!validWeek(week)) return NextResponse.json({ ok: false, message: "Choose a valid Monday." }, { status: 400, headers });
    const catalog = await currentCatalog(request, week);
    if (!catalog) return NextResponse.json({ ok: false, message: "Schedule draft permission is required." }, { status: 403, headers });
    if (url.searchParams.get("catalog") === "1") return NextResponse.json(catalog, { headers });
    const bytes = buildScheduleTemplate(catalog, week, new Date().toISOString());
    return new NextResponse(new Uint8Array(bytes), { headers: { ...headers, "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="OMS-schedule-${week}.xlsx"` } });
  } catch (error) {
    logServerError(error, { source: "api.schedule.template.download" });
    return NextResponse.json({ ok: false, message: "Template unavailable. Reopen your session and check schedule access." }, { status: 503, headers });
  }
}
async function templateFormData(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const next = await reader.read(); if (next.done) break;
    size += next.value.byteLength;
    if (size > 11 * 1024 * 1024) { await reader.cancel().catch(() => {}); return null; }
    chunks.push(next.value);
  }
  const body = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { body.set(chunk,offset); offset += chunk.byteLength; }
  return new Request(request.url,{method:"POST",headers:request.headers,body}).formData();
}
export async function POST(request: Request) {
  const denied = rejectCrossSiteMutation(request); if (denied) return denied;
  try {
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > 11 * 1024 * 1024) return NextResponse.json({ ok: false, message: "Workbook must be at most10MB." }, { status: 413, headers });
    const form = await templateFormData(request);
    if (!form) return NextResponse.json({ok:false,message:"Workbook request is too large or empty."},{status:413,headers});
    const file = form.get("file"), week = String(form.get("week") ?? "");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".xlsx") || file.name.trim().length > 255 || file.size > 10 * 1024 * 1024 || !validWeek(week)) return NextResponse.json({ ok: false, message: "Choose one .xlsx template and a valid Monday." }, { status: 400, headers });
    const catalog = await currentCatalog(request, week);
    if (!catalog) return NextResponse.json({ ok: false, message: "Schedule draft permission is required." }, { status: 403, headers });
    let preview;
    try { preview = await parseScheduleTemplate(file, week, catalog); }
    catch { return NextResponse.json({ ok: false, message: "Invalid or outdated OMS template. Download a fresh template in this company and preserve its schema." }, { status: 400, headers }); }
    if (form.get("intent") === "preview") return NextResponse.json({ ok: true, preview }, { headers });
    if (form.get("intent") !== "confirm" || form.get("hash") !== preview.fileHash) return NextResponse.json({ ok: false, message: "Preview this exact workbook again before confirming." }, { status: 409, headers });
    if (preview.issues.length) return NextResponse.json({ ok: false, message: preview.issues[0].message, issues: preview.issues }, { status: 409, headers });
    let branches: string[];
    try { const value: unknown = JSON.parse(String(form.get("branches") ?? "[]")); if (!Array.isArray(value) || !value.length || value.length > 50 || new Set(value).size !== value.length || value.some(v => typeof v !== "string")) throw new Error(); branches = value; }
    catch { return NextResponse.json({ ok: false, message: "Choose outlets from the preview." }, { status: 400, headers }); }
    let selectedRows: string[];
    try { const value: unknown = JSON.parse(String(form.get("rows") ?? "[]")); if (!Array.isArray(value) || !value.length || value.length > 1000 || value.some(v => typeof v !== "string") || new Set(value).size !== value.length) throw new Error(); selectedRows = value; }
    catch { return NextResponse.json({ok:false,message:"Choose employee days from the preview."},{status:400,headers}); }
    const outlets = preview.outlets.filter(o => branches.includes(o.branchId)).map(o => ({...o,assignments:o.assignments.filter(a => selectedRows.includes(`${o.branchId}:${a.staff_id}:${a.work_date}`))})).filter(o => o.assignments.length);
    if (outlets.reduce((sum,o) => sum + o.assignments.length,0) !== selectedRows.length) return NextResponse.json({ok:false,message:"Employee-day selection changed. Preview again."},{status:409,headers});
    if (new Set(branches).size !== outlets.length || !outlets.length) return NextResponse.json({ ok: false, message: "Outlet selection changed. Preview again." }, { status: 409, headers });
    // No fallback to the older writer: its same-day checks do not prevent a
    // concurrent adjacent-date overnight overlap or an RLS-hidden neighbour.
    if (!catalog.template_import_ready) return NextResponse.json({ok:false,message:catalog.template_import_message},{status:503,headers});
    const db = looseSupabase(await createClient());
    const selected = outlets.map(o => ({branch_id:o.branchId,assignments:o.assignments}));
    const metadata = {source:"oms_schedule_template_v1",parserVersion:1,expectedAssignments:[]};
    const key = createHash("sha256").update(JSON.stringify({week,fileHash:preview.fileHash,outlets:selected,metadata})).digest("hex");
    const result = await db.rpc("import_schedule_template_drafts_atomic", {
      p_week_start:week,p_file_name:preview.fileName,p_file_hash:preview.fileHash,
      p_outlets:selected,p_unresolved_count:0,p_source_metadata:metadata,p_request_key:key,
    });
    if (result.error) {
      logServerError(result.error,{source:"api.schedule.template.atomic"});
      return NextResponse.json({ok:false,message:"Draft import was not confirmed. Reload the preview and check conflicts, membership and Recent imports before retrying."},{status:409,headers});
    }
    return NextResponse.json({ok:true,data:result.data},{headers});
  } catch (error) {
    logServerError(error, { source: "api.schedule.template.import" });
    return NextResponse.json({ ok: false, message: "Template result is unconfirmed. Keep this workbook and check Recent imports before retrying." }, { status: 503, headers });
  }
}
