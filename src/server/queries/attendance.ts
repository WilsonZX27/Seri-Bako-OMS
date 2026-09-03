import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";

export function malaysiaWeekStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const local = new Date(`${parts}T00:00:00Z`);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return local.toISOString().slice(0, 10);
}

export async function getAttendanceWorkspace(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db = looseSupabase(await createClient());
  const weekEnd = new Date(`${weekStart}T00:00:00Z`); weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const [weeks, requests, exceptions, batches, rawPeople, mappings, locks] = await Promise.all([
    db.from("schedule_weeks").select("id,status,branch_id,week_start,updated_at").eq("week_start", weekStart),
    db.from("shift_change_requests").select("id,status,created_at").in("status", ["pending_supervisor", "pending_manager"]),
    db.from("attendance_exceptions").select("id,severity,resolved_at").is("resolved_at", null),
    db.from("attendance_import_batches").select("id,parser_profile,file_name,status,row_count,error_count,warning_count,finalised_at").eq("week_start", weekStart).order("created_at", { ascending: false }).limit(5),
    db.from("attendance_raw_punch_events").select("person_id").gte("local_timestamp", `${weekStart} 00:00:00`).lte("local_timestamp", `${weekEnd.toISOString().slice(0, 10)} 23:59:59`),
    db.from("ngteco_person_mappings").select("person_id").eq("is_active", true),
    db.from("attendance_period_locks").select("id,branch_id,locked_at,unlocked_at").eq("week_start", weekStart).is("unlocked_at", null),
  ]);
  for (const result of [weeks, requests, exceptions, batches, rawPeople, mappings, locks]) if (result.error) throw result.error;
  const scheduleWeeks = (weeks.data ?? []) as unknown as Array<{ status: string }>;
  const mappedIds = new Set(((mappings.data ?? []) as unknown as Array<{ person_id: string }>).map((row) => row.person_id));
  return {
    weekStart,
    weekEnd: weekEnd.toISOString().slice(0, 10),
    pendingApprovals: scheduleWeeks.filter((week: { status: string }) => week.status === "submitted").length,
    pendingRequests: (requests.data ?? []).length,
    unresolvedExceptions: (exceptions.data ?? []).length,
    missingMappings: new Set(((rawPeople.data ?? []) as unknown as Array<{ person_id: string }>).map((row) => row.person_id).filter((id) => !mappedIds.has(id))).size,
    scheduleStatus: scheduleWeeks.length ? (scheduleWeeks.every((week: { status: string }) => week.status === "locked") ? "locked" : scheduleWeeks.some((week: { status: string }) => week.status === "submitted") ? "submitted" : "draft") : "not_started",
    latestBatch: (batches.data ?? [])[0] ?? null,
    activeLocks: (locks.data ?? []).length,
  };
}

export async function getSchedulePlanner(weekStart = malaysiaWeekStart(), requestedBranchId?: string) {
  if (!(await hasPermission("schedule.read"))) throw new Error("Missing permission: schedule.read");
  const db = looseSupabase(await createClient());
  const { data: branches, error: branchError } = await db.rpc("get_schedule_branches");
  if (branchError) throw branchError;
  const branchRows = (branches ?? []) as unknown as Array<{ id: string; branch_name: string }>;
  const branchId = requestedBranchId && branchRows.some((b) => b.id === requestedBranchId) ? requestedBranchId : branchRows[0]?.id;
  if (!branchId) return { branches: [], branchId: null, week: null, previousWeekId: null, templates: [], people: [], assignments: [] };
  const { data: scheduleStaff, error: staffError } = await db.rpc("get_schedule_staff", { p_branch_id: branchId });
  if (staffError) throw staffError;
  const { data: weeks, error: weekError } = await db.from("schedule_weeks").select("*").eq("branch_id", branchId).eq("week_start", weekStart).order("revision", { ascending: false }).limit(1);
  if (weekError) throw weekError;
  const week = weeks?.[0] ?? null;
  const previousStart = new Date(`${weekStart}T00:00:00Z`); previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  const { data: previousWeeks, error: previousError } = await db.from("schedule_weeks").select("id").eq("branch_id", branchId).eq("week_start", previousStart.toISOString().slice(0, 10)).in("status", ["published", "locked"]).order("revision", { ascending: false }).limit(1);
  if (previousError) throw previousError;
  const [templates, assignments] = await Promise.all([
    db.from("shift_templates").select("*").eq("is_active", true).order("code"),
    week ? db.from("shift_assignment_revisions").select("*").eq("schedule_week_id", week.id).eq("is_current", true) : Promise.resolve({ data: [], error: null }),
  ]);
  if (templates.error) throw templates.error; if (assignments.error) throw assignments.error;
  return { branches: branchRows, branchId, week: week as unknown as { id: string; status: string } | null, previousWeekId: previousWeeks?.[0]?.id ? String(previousWeeks[0].id) : null, templates: (templates.data ?? []) as unknown as Array<{ id:string;code:string;name:string;planned_start:string;planned_end:string;planned_break_seconds:number;maximum_recognised_seconds:number;colour:string }>, people: (scheduleStaff ?? []) as unknown as Array<{ id:string;full_name:string;staff_code:string|null;status:string;employment_type:string;role_code:string }>, assignments: (assignments.data ?? []) as unknown as Array<{staff_id:string;work_date:string;assignment_kind:string;shift_template_id:string|null;custom_start:string|null;custom_end:string|null;custom_crosses_midnight:boolean;custom_break_seconds:number|null;custom_maximum_recognised_seconds:number|null;custom_reason:string|null}> };
}

export async function getAttendanceReview(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db = looseSupabase(await createClient()); const end = new Date(`${weekStart}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 6);
  const { data, error } = await db.from("daily_attendance_results").select("*,staffs(full_name,staff_code),branches(branch_name)").eq("is_current", true).gte("work_date", weekStart).lte("work_date", end.toISOString().slice(0, 10)).order("work_date").order("created_at");
  if (error) throw error; return data ?? [];
}

export async function getOwnPublishedShifts(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("schedule.request"))) return [];
  const db=looseSupabase(await createClient());const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const {data,error}=await db.from("shift_assignment_revisions").select("id,work_date,assignment_kind,custom_start,custom_end,shift_templates(code,name,planned_start,planned_end),schedule_weeks!inner(status)").eq("is_current",true).gte("work_date",weekStart).lte("work_date",end.toISOString().slice(0,10)).in("schedule_weeks.status",["published","locked"]).order("work_date");if(error)throw error;return (data??[]) as unknown as Array<{id:string;work_date:string;assignment_kind:string;custom_start:string|null;custom_end:string|null;shift_templates:{code:string;name:string;planned_start:string;planned_end:string}|null}>;
}

export async function getPendingShiftRequests() {
  if (!(await hasPermission("schedule.swap_review")) && !(await hasPermission("schedule.approve"))) return [];
  const db=looseSupabase(await createClient());const {data,error}=await db.from("shift_change_requests").select("id,status,reason,material_change,created_at,shift_assignment_revisions!shift_change_requests_assignment_id_fkey(work_date,staffs!shift_assignment_revisions_staff_id_fkey(full_name),branches!shift_assignment_revisions_branch_id_fkey(branch_name))").in("status",["pending_supervisor","pending_manager"]).order("created_at");if(error)throw error;return data??[];
}

export async function getAttendanceMappings() {
  if (!(await hasPermission("attendance.map"))) return { people: [], devices: [], staffs: [], branches: [], allowed: false };
  const db = looseSupabase(await createClient());
  const [people, devices, staffs, branches] = await Promise.all([
    db.from("ngteco_person_mappings").select("*,staffs(full_name,staff_code)").order("person_id"),
    db.from("ngteco_device_mappings").select("*,branches(branch_name)").order("source_code"),
    db.from("staffs").select("id,full_name,staff_code").eq("status", "active").is("deleted_at", null).order("full_name"),
    db.from("branches").select("id,branch_name").eq("branch_type", "outlet").eq("status", "active").order("branch_name"),
  ]);
  for (const result of [people, devices, staffs, branches]) if (result.error) throw result.error;
  return { people: people.data ?? [], devices: devices.data ?? [], staffs: (staffs.data ?? []) as unknown as Array<{id:string;full_name:string;staff_code:string|null}>, branches: (branches.data ?? []) as unknown as Array<{id:string;branch_name:string}>, allowed: true };
}

export async function getAttendanceReconciliation(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("attendance.reconcile"))) return { allowed: false, rows: [] };
  const db = looseSupabase(await createClient()); const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const [batches,mappings,results]=await Promise.all([db.from("attendance_import_batches").select("id").eq("parser_profile","attendance_report").eq("week_start",weekStart).eq("status","finalised"),db.from("ngteco_person_mappings").select("person_id,staff_id,staffs(full_name)"),db.from("daily_attendance_results").select("staff_id,recognised_paid_seconds").eq("is_current",true).gte("work_date",weekStart).lte("work_date",end.toISOString().slice(0,10))]);
  for(const result of [batches,mappings,results])if(result.error)throw result.error;const batchIds=(batches.data??[]).map((row:Record<string,unknown>)=>String(row.id));if(!batchIds.length)return {allowed:true,rows:[]};const reconciliation=await db.from("attendance_reconciliation_rows").select("person_id,person_name,ngteco_total_seconds,ngteco_work_seconds,batch_id").in("batch_id",batchIds);if(reconciliation.error)throw reconciliation.error;const mapRows=(mappings.data??[]) as Array<Record<string,unknown>>;const resultRows=(results.data??[]) as Array<Record<string,unknown>>;
  const rows=((reconciliation.data??[]) as Array<Record<string,unknown>>).map(row=>{const mapping=mapRows.find(item=>item.person_id===row.person_id);const staffId=mapping?.staff_id;const omsSeconds=resultRows.filter(item=>item.staff_id===staffId).reduce((sum,item)=>sum+Number(item.recognised_paid_seconds??0),0);const ngtecoSeconds=Number(row.ngteco_total_seconds??row.ngteco_work_seconds??0);return {batch_id:String(row.batch_id),person_id:String(row.person_id),person_name:row.person_name,ngteco_total_seconds:row.ngteco_total_seconds,ngteco_work_seconds:row.ngteco_work_seconds,staffName:String((mapping?.staffs as {full_name?:string}|null)?.full_name??row.person_name??"Unmapped"),omsSeconds,differenceSeconds:ngtecoSeconds-omsSeconds}});return {allowed:true,rows};
}
