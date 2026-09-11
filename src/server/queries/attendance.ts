import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

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
  const [weeks, requests, exceptions, reports, batches, rawPeople, mappings, locks] = await Promise.all([
    db.from("schedule_weeks").select("id,status,branch_id,week_start,updated_at").eq("week_start", weekStart),
    db.from("shift_change_requests").select("id,status,created_at").in("status", ["pending_supervisor", "pending_manager"]),
    db.from("attendance_exceptions").select("id,severity,resolved_at").is("resolved_at", null),
    db.from("daily_attendance_reports").select("id").eq("status","pending").gte("work_date",weekStart).lte("work_date",weekEnd.toISOString().slice(0,10)),
    db.from("attendance_import_batches").select("id,parser_profile,file_name,status,row_count,error_count,warning_count,finalised_at").eq("week_start", weekStart).order("created_at", { ascending: false }).limit(5),
    db.from("attendance_raw_punch_events").select("person_id").gte("local_timestamp", `${weekStart} 00:00:00`).lte("local_timestamp", `${weekEnd.toISOString().slice(0, 10)} 23:59:59`),
    db.from("ngteco_person_mappings").select("person_id").eq("is_active", true),
    db.from("attendance_period_locks").select("id,branch_id,locked_at,unlocked_at").eq("week_start", weekStart).is("unlocked_at", null),
  ]);
  for (const result of [weeks, requests, exceptions, reports, batches, rawPeople, mappings, locks]) if (result.error) throw result.error;
  const scheduleWeeks = (weeks.data ?? []) as unknown as Array<{ status: string }>;
  const mappedIds = new Set(((mappings.data ?? []) as unknown as Array<{ person_id: string }>).map((row) => row.person_id));
  return {
    weekStart,
    weekEnd: weekEnd.toISOString().slice(0, 10),
    pendingApprovals: scheduleWeeks.filter((week: { status: string }) => week.status === "submitted").length,
    pendingRequests: (requests.data ?? []).length,
    unresolvedExceptions: (exceptions.data ?? []).length,
    pendingActualReports: (reports.data ?? []).length,
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
  if (!branchId) return { branches: [], branchId: null, week: null, previousWeekId: null, templates: [], people: [], candidates: [], assignments: [], roBalances: {} as Record<string,number>, submittedByName: null };
  const { data: weeks, error: weekError } = await db.from("schedule_weeks").select("*").eq("branch_id", branchId).eq("week_start", weekStart).order("revision", { ascending: false }).limit(1);
  if (weekError) throw weekError;
  const week = weeks?.[0] ?? null;
  const submitter = week?.submitted_by ? await db.from("staffs").select("full_name").eq("id",week.submitted_by).maybeSingle() : {data:null,error:null};
  if (submitter.error) throw submitter.error;
  const { data: scheduleStaff, error: staffError } = await db.rpc("get_schedule_staff", { p_branch_id: branchId,p_week_id:week?.id??null });
  if (staffError) throw staffError;
  const { data: scheduleCandidates, error: candidateError } = await db.rpc("get_schedule_staff_candidates", { p_branch_id: branchId });
  if (candidateError) throw candidateError;
  const previousStart = new Date(`${weekStart}T00:00:00Z`); previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  const { data: previousWeeks, error: previousError } = await db.from("schedule_weeks").select("id").eq("branch_id", branchId).eq("week_start", previousStart.toISOString().slice(0, 10)).in("status", ["published", "locked"]).order("revision", { ascending: false }).limit(1);
  if (previousError) throw previousError;
  const staffIds=((scheduleStaff ?? []) as Array<{id:string}>).map((staff)=>staff.id);
  const [templates, assignments, compTime, reservations] = await Promise.all([
    db.from("shift_templates").select("*").eq("is_active", true).order("code"),
    week ? db.from("shift_assignment_revisions").select("*").eq("schedule_week_id", week.id).eq("is_current", true) : Promise.resolve({ data: [], error: null }),
    staffIds.length ? db.from("comp_time_transactions").select("staff_id,minutes").in("staff_id",staffIds).eq("status","approved") : Promise.resolve({data:[],error:null}),
    staffIds.length ? db.from("attendance_ro_reservations").select("staff_id,reserved_minutes").in("staff_id",staffIds).eq("status","reserved") : Promise.resolve({data:[],error:null}),
  ]);
  if (templates.error) throw templates.error; if (assignments.error) throw assignments.error; if(compTime.error)throw compTime.error;if(reservations.error)throw reservations.error;
  const roBalances:Record<string,number>={};for(const id of staffIds)roBalances[id]=0;for(const row of (compTime.data??[]) as Array<{staff_id:string;minutes:number}>)roBalances[row.staff_id]=(roBalances[row.staff_id]??0)+Number(row.minutes);for(const row of (reservations.data??[]) as Array<{staff_id:string;reserved_minutes:number}>)roBalances[row.staff_id]=Math.max(0,(roBalances[row.staff_id]??0)-Number(row.reserved_minutes));
  return { branches: branchRows, branchId, week: week as unknown as { id: string; status: string;updated_at:string } | null, previousWeekId: previousWeeks?.[0]?.id ? String(previousWeeks[0].id) : null, templates: (templates.data ?? []) as unknown as Array<{ id:string;code:string;name:string;planned_start:string;planned_end:string;planned_break_seconds:number;maximum_recognised_seconds:number;colour:string }>, people: (scheduleStaff ?? []) as unknown as Array<{ id:string;full_name:string;staff_code:string|null;status:string;employment_type:string;role_code:string }>, candidates: (scheduleCandidates ?? []) as unknown as Array<{ id:string;full_name:string;staff_code:string|null;status:string;employment_type:string;role_code:string }>, assignments: (assignments.data ?? []) as unknown as Array<{staff_id:string;work_date:string;assignment_kind:string;shift_template_id:string|null;custom_start:string|null;custom_end:string|null;custom_crosses_midnight:boolean;custom_break_seconds:number|null;custom_maximum_recognised_seconds:number|null;custom_reason:string|null;ro_minutes:number|null;ro_original_start:string|null;ro_original_end:string|null;ro_direction:string|null}>,roBalances,submittedByName:submitter.data?.full_name?String(submitter.data.full_name):null };
}

export async function getScheduleOverview(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("schedule.read"))) throw new Error("Missing permission: schedule.read");
  const db = looseSupabase(await createClient());
  const { data: branchData, error: branchError } = await db.rpc("get_schedule_branches");
  if (branchError) throw branchError;
  const branches = (branchData ?? []) as unknown as Array<{ id: string; branch_name: string }>;
  if (!branches.length) return [];
  const { data: weekData, error: weekError } = await db.from("schedule_weeks").select("id,branch_id,status,revision,updated_at").eq("week_start", weekStart).in("branch_id", branches.map((branch) => branch.id)).order("revision", { ascending: false });
  if (weekError) throw weekError;
  const latestByBranch = new Map<string, { id: string; status: string; updated_at: string }>();
  for (const week of (weekData ?? []) as Array<{ id: string; branch_id: string; status: string; updated_at: string }>) if (!latestByBranch.has(week.branch_id)) latestByBranch.set(week.branch_id, week);
  const weekIds = [...latestByBranch.values()].map((week) => week.id);
  const { data: assignmentData, error: assignmentError } = weekIds.length
    ? await db.from("shift_assignment_revisions").select("schedule_week_id,staff_id,work_date,assignment_kind").in("schedule_week_id", weekIds).eq("is_current", true)
    : { data: [], error: null };
  if (assignmentError) throw assignmentError;
  const assignments = (assignmentData ?? []) as Array<{ schedule_week_id: string; staff_id: string; work_date: string; assignment_kind: string }>;
  return branches.map((branch) => {
    const week = latestByBranch.get(branch.id) ?? null;
    const rows = week ? assignments.filter((assignment) => assignment.schedule_week_id === week.id) : [];
    return {
      branchId: branch.id,
      branchName: branch.branch_name,
      status: week?.status ?? "not_started",
      assignedPeople: new Set(rows.map((row) => row.staff_id)).size,
      assignedDays: new Set(rows.filter((row) => row.assignment_kind === "shift").map((row) => row.work_date)).size,
      updatedAt: week?.updated_at ?? null,
    };
  });
}

export async function getAttendanceReview(weekStart = malaysiaWeekStart(), filters: { branch?: string; status?: string; employee?: string; page?: number; detail?: string } = {}) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db = looseSupabase(await createClient()); const end = new Date(`${weekStart}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd=end.toISOString().slice(0,10),page=Math.max(1,filters.page??1),pageSize=100;
  let staffIds:string[]|null=null;
  if(filters.employee?.trim()){const people=await db.from("staffs").select("id").ilike("full_name",`%${filters.employee.trim()}%`).is("deleted_at",null).limit(100);if(people.error)throw people.error;staffIds=(people.data??[]).map((row:Record<string,unknown>)=>String(row.id));}
  let query=db.from("daily_attendance_results").select("*,staffs(full_name,staff_code,employment_type),branches(branch_name)",{count:"exact"}).eq("is_current",true).gte("work_date",weekStart).lte("work_date",weekEnd);
  if(filters.branch)query=query.eq("branch_id",filters.branch);
  if(filters.status==="repeated_missing_punch")query=query.gte("monthly_missing_punch_count",4);
  else if(filters.status&&filters.status!=="all")query=query.contains("statuses",[filters.status]);
  if(staffIds)query=staffIds.length?query.in("staff_id",staffIds):query.eq("staff_id","00000000-0000-0000-0000-000000000000");
  const detailQuery=filters.detail?db.from("daily_attendance_results").select("*,staffs(full_name,staff_code,employment_type),branches(branch_name),attendance_import_batches(file_name,parser_profile,finalised_at)").eq("id",filters.detail).eq("is_current",true).maybeSingle():Promise.resolve({data:null,error:null});
  const [result,branches,batches,detail]=await Promise.all([query.order("work_date").order("created_at").range((page-1)*pageSize,page*pageSize-1),db.from("branches").select("id,branch_name").in("branch_type",["outlet","central_kitchen"]).eq("status","active").is("deleted_at",null).order("branch_name"),db.from("attendance_import_batches").select("id,file_name,parser_profile,row_count,error_count,warning_count,status,finalised_at").eq("week_start",weekStart).order("created_at",{ascending:false}).limit(5),detailQuery]);
  for(const item of [result,branches,batches,detail])if(item.error)throw item.error;
  const unscheduledPunches: Array<{staff_id:string;full_name:string;work_date:string;punch_count:number;first_punch:string;last_punch:string}> = [];
  if (filters.branch) {
    const [raw, people, devices] = await Promise.all([
      db.from("attendance_raw_punch_events").select("person_id,local_timestamp,occurred_at,source_code").gte("local_timestamp",`${weekStart} 00:00:00`).lte("local_timestamp",`${weekEnd} 23:59:59`).order("occurred_at"),
      db.from("ngteco_person_mappings").select("person_id,staff_id,staffs(full_name)").eq("is_active",true),
      db.from("ngteco_device_mappings").select("source_code,branch_id").eq("branch_id",filters.branch).eq("is_active",true),
    ]);
    for (const item of [raw, people, devices]) if (item.error) throw item.error;
    const sources = new Set((devices.data ?? []).map((row:Record<string,unknown>)=>String(row.source_code)));
    const mapped = new Map((people.data ?? []).map((row:Record<string,unknown>)=>[String(row.person_id),row]));
    const covered = new Set((result.data ?? []).map((row:Record<string,unknown>)=>`${row.staff_id}:${row.work_date}`));
    const grouped = new Map<string,{staff_id:string;full_name:string;work_date:string;values:string[]}>();
    for (const row of (raw.data ?? []) as Array<Record<string,unknown>>) {
      if (!sources.has(String(row.source_code))) continue;
      const person = mapped.get(String(row.person_id)) as Record<string,unknown> | undefined;
      if (!person) continue;
      const staffId=String(person.staff_id),workDate=String(row.local_timestamp).slice(0,10),key=`${staffId}:${workDate}`;
      if (covered.has(key)) continue;
      const staff=person.staffs as {full_name?:string}|null;
      const current=grouped.get(key)??{staff_id:staffId,full_name:staff?.full_name??"Mapped employee",work_date:workDate,values:[]};
      current.values.push(String(row.occurred_at));grouped.set(key,current);
    }
    for (const item of grouped.values()) unscheduledPunches.push({staff_id:item.staff_id,full_name:item.full_name,work_date:item.work_date,punch_count:item.values.length,first_punch:item.values[0],last_punch:item.values[item.values.length-1]});
  }
  const [exceptions,adjustments]=detail.data?await Promise.all([db.from("attendance_exceptions").select("id,exception_code,severity,details,resolved_at,resolution_note,created_at").eq("result_id",filters.detail).order("created_at"),db.from("attendance_adjustments").select("id,reason,before_state,after_state,created_at").eq("result_id",filters.detail).order("created_at",{ascending:false})]):[{data:[],error:null},{data:[],error:null}];
  for(const item of [exceptions,adjustments])if(item.error)throw item.error;
  return {rows:result.data??[],total:result.count??0,page,pageSize,branches:branches.data??[],batches:batches.data??[],unscheduledPunches,detail:detail.data?{...detail.data,exceptions:exceptions.data??[],adjustments:adjustments.data??[]}:null};
}

export async function getAttendanceReviewBranches() {
  if (!(await hasPermission("attendance.read")))
    throw new Error("Missing permission: attendance.read");
  const db = looseSupabase(await createClient());
  const { data, error } = await db
    .from("branches")
    .select("id,branch_name")
    .in("branch_type", ["outlet", "central_kitchen"])
    .eq("status", "active")
    .is("deleted_at", null)
    .order("branch_name");
  if (error) throw error;
  return data ?? [];
}

export const ATTENDANCE_TRACKING_START_DATE = "2026-09-11";

export async function getStaffAttendanceTracking(staffId: string) {
  if (!(await hasPermission("attendance.read")))
    return { allowed: false, startsOn: ATTENDANCE_TRACKING_START_DATE, months: [] };
  const db = looseSupabase(await createClient());
  const { data, error } = await db
    .from("daily_attendance_results")
    .select("work_date,missing_punch_count")
    .eq("staff_id", staffId)
    .eq("is_current", true)
    .gte("work_date", ATTENDANCE_TRACKING_START_DATE)
    .order("work_date", { ascending: false });
  if (error) throw error;
  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    const month = String(row.work_date).slice(0, 7);
    totals.set(month, (totals.get(month) ?? 0) + Number(row.missing_punch_count ?? 0));
  }
  return {
    allowed: true,
    startsOn: ATTENDANCE_TRACKING_START_DATE,
    months: [...totals].map(([month, missingPunches]) => ({ month, missingPunches })),
  };
}

export async function getScheduleValidation(weekId:string){
  const db=looseSupabase(await createClient());
  const {data,error}=await db.rpc("validate_schedule_week",{p_week_id:weekId});
  if(error)throw error;
  return (data??{status:"ready",blockers:[],warnings:[]}) as {status:string;blockers:Array<{code:string;message:string;staffId?:string;staffName?:string;workDate?:string}>;warnings:Array<{code:string;message:string;staffId?:string;staffName?:string;workDate?:string}>};
}

export async function getAttendancePaySettings() {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db=looseSupabase(await createClient());
  const [rules,holidays,branches]=await Promise.all([
    db.from("attendance_pay_rule_versions").select("*").eq("is_active",true).order("effective_from",{ascending:false}).limit(20),
    db.from("public_holidays").select("*,public_holiday_branches(branch_id,branches(branch_name))").order("holiday_date",{ascending:false}).limit(100),
    db.from("branches").select("id,branch_name").in("branch_type",["outlet","central_kitchen"]).eq("status","active").is("deleted_at",null).order("branch_name"),
  ]);
  for(const item of [rules,holidays,branches])if(item.error)throw item.error;
  return {rules:rules.data??[],holidays:holidays.data??[],branches:branches.data??[]};
}

export async function getAttendanceActuals(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db=looseSupabase(await createClient());const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);const weekEnd=end.toISOString().slice(0,10);
  const [weeks,reports,ledger,claims,reservations,locks]=await Promise.all([
    db.from("schedule_weeks").select("id").eq("week_start",weekStart).in("status",["published","locked"]),
    db.from("daily_attendance_reports").select("*,staffs!daily_attendance_reports_staff_id_fkey(full_name,staff_code),branches!daily_attendance_reports_branch_id_fkey(branch_name),attachments!daily_attendance_reports_evidence_attachment_id_fkey(file_name)").gte("work_date",weekStart).lte("work_date",weekEnd).order("submitted_at",{ascending:false}),
    db.from("comp_time_transactions").select("*,staffs!comp_time_transactions_staff_id_fkey(full_name,staff_code),branches!comp_time_transactions_branch_id_fkey(branch_name)").lte("work_date",weekEnd).order("work_date",{ascending:false}).order("created_at",{ascending:false}),
    db.from("attendance_ot_claims").select("*,staffs!attendance_ot_claims_staff_id_fkey(full_name,staff_code),branches!attendance_ot_claims_branch_id_fkey(branch_name)").gte("work_date",weekStart).lte("work_date",weekEnd).order("work_date"),
    db.from("attendance_ro_reservations").select("*,staffs!attendance_ro_reservations_staff_id_fkey(full_name,staff_code),branches!attendance_ro_reservations_branch_id_fkey(branch_name)").gte("work_date",weekStart).lte("work_date",weekEnd).order("work_date"),
    db.from("attendance_period_locks").select("id,branch_id,week_start,locked_at,unlocked_at").eq("week_start",weekStart).is("unlocked_at",null),
  ]);
  for(const result of [weeks,reports,ledger,claims,reservations,locks])if(result.error)throw result.error;
  const weekIds=(weeks.data??[]).map((row:Record<string,unknown>)=>String(row.id));
  const assignments=weekIds.length?await db.from("shift_assignment_revisions").select("id,staff_id,branch_id,work_date,assignment_kind,custom_start,custom_end,custom_reason,ro_minutes,ro_original_start,ro_original_end,ro_direction,shift_templates(name,planned_start,planned_end),staffs!shift_assignment_revisions_staff_id_fkey(full_name,staff_code),branches!shift_assignment_revisions_branch_id_fkey(branch_name)").in("schedule_week_id",weekIds).eq("is_current",true).order("work_date"):{data:[],error:null};
  if(assignments.error)throw assignments.error;
  const ledgerRows=(ledger.data??[]) as Array<Record<string,unknown>>;const balances:Record<string,number>={};
  for(const row of ledgerRows)if(row.status==="approved")balances[String(row.staff_id)]=(balances[String(row.staff_id)]??0)+Number(row.minutes??0);
  return {assignments:assignments.data??[],reports:reports.data??[],ledger:ledgerRows,balances,claims:claims.data??[],reservations:reservations.data??[],locks:locks.data??[]};
}

export async function getStaffCompTime(staffId:string){
  if(!(await hasPermission("comp_time.read")))return {allowed:false,balance:0,ledger:[]};
  const db=looseSupabase(await createClient());const [balance,ledger]=await Promise.all([db.rpc("get_comp_time_balance",{p_staff_id:staffId}),db.from("comp_time_transactions").select("id,work_date,transaction_kind,minutes,reason,status,submitted_at").eq("staff_id",staffId).order("work_date",{ascending:false}).order("created_at",{ascending:false}).limit(10)]);if(balance.error)throw balance.error;if(ledger.error)throw ledger.error;return {allowed:true,balance:Number(balance.data??0),ledger:ledger.data??[]};
}

export async function getOwnPublishedShifts(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("schedule.request"))) return [];
  const actor = await requireActiveTenantActor();
  const db=looseSupabase(await createClient());const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const {data,error}=await db.from("shift_assignment_revisions").select("id,work_date,assignment_kind,custom_start,custom_end,shift_templates(code,name,planned_start,planned_end),branches!shift_assignment_revisions_branch_id_fkey(branch_name),schedule_weeks!inner(status)").eq("staff_id",actor.staffId).eq("is_current",true).gte("work_date",weekStart).lte("work_date",end.toISOString().slice(0,10)).in("schedule_weeks.status",["published","locked"]).order("work_date");if(error)throw error;return (data??[]) as unknown as Array<{id:string;work_date:string;assignment_kind:string;custom_start:string|null;custom_end:string|null;shift_templates:{code:string;name:string;planned_start:string;planned_end:string}|null;branches:{branch_name:string}|null}>;
}

export async function getPendingShiftRequests() {
  if (!(await hasPermission("schedule.swap_review")) && !(await hasPermission("schedule.approve"))) return [];
  const db=looseSupabase(await createClient());const {data,error}=await db.from("shift_change_requests").select("id,status,reason,material_change,created_at,shift_assignment_revisions!shift_change_requests_assignment_id_fkey(work_date,staffs!shift_assignment_revisions_staff_id_fkey(full_name),branches!shift_assignment_revisions_branch_id_fkey(branch_name))").in("status",["pending_supervisor","pending_manager"]).order("created_at");if(error)throw error;return data??[];
}

export async function getAttendanceMappings() {
  if (!(await hasPermission("attendance.map"))) return { people: [], devices: [], staffs: [], branches: [], allowed: false };
  const db = looseSupabase(await createClient());
  const [people, devices, staffs, branches] = await Promise.all([
    db.from("ngteco_person_mappings").select("*,staffs!ngteco_person_mappings_staff_id_fkey(full_name,staff_code)").order("person_id"),
    db.from("ngteco_device_mappings").select("*,branches(branch_name)").order("source_code"),
    db.from("staffs").select("id,full_name,staff_code").eq("status", "active").is("deleted_at", null).order("full_name"),
    db.from("branches").select("id,branch_name").in("branch_type", ["outlet", "central_kitchen"]).eq("status", "active").is("deleted_at", null).order("branch_name"),
  ]);
  for (const result of [people, devices, staffs, branches]) if (result.error) throw result.error;
  return { people: people.data ?? [], devices: devices.data ?? [], staffs: (staffs.data ?? []) as unknown as Array<{id:string;full_name:string;staff_code:string|null}>, branches: (branches.data ?? []) as unknown as Array<{id:string;branch_name:string}>, allowed: true };
}

export async function getAttendanceReconciliation(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("attendance.reconcile"))) return { allowed: false, rows: [] };
  const db = looseSupabase(await createClient()); const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const [batches,mappings,results]=await Promise.all([db.from("attendance_import_batches").select("id").eq("parser_profile","attendance_report").eq("week_start",weekStart).eq("status","finalised"),db.from("ngteco_person_mappings").select("person_id,staff_id,staffs!ngteco_person_mappings_staff_id_fkey(full_name)"),db.from("daily_attendance_results").select("staff_id,recognised_paid_seconds").eq("is_current",true).gte("work_date",weekStart).lte("work_date",end.toISOString().slice(0,10))]);
  for(const result of [batches,mappings,results])if(result.error)throw result.error;const batchIds=(batches.data??[]).map((row:Record<string,unknown>)=>String(row.id));if(!batchIds.length)return {allowed:true,rows:[]};const reconciliation=await db.from("attendance_reconciliation_rows").select("person_id,person_name,ngteco_total_seconds,ngteco_work_seconds,batch_id").in("batch_id",batchIds);if(reconciliation.error)throw reconciliation.error;const mapRows=(mappings.data??[]) as Array<Record<string,unknown>>;const resultRows=(results.data??[]) as Array<Record<string,unknown>>;
  const rows=((reconciliation.data??[]) as Array<Record<string,unknown>>).map(row=>{const mapping=mapRows.find(item=>item.person_id===row.person_id);const staffId=mapping?.staff_id;const omsSeconds=resultRows.filter(item=>item.staff_id===staffId).reduce((sum,item)=>sum+Number(item.recognised_paid_seconds??0),0);const ngtecoSeconds=Number(row.ngteco_total_seconds??row.ngteco_work_seconds??0);return {batch_id:String(row.batch_id),person_id:String(row.person_id),person_name:row.person_name,ngteco_total_seconds:row.ngteco_total_seconds,ngteco_work_seconds:row.ngteco_work_seconds,staffName:String((mapping?.staffs as {full_name?:string}|null)?.full_name??row.person_name??"Unmapped"),omsSeconds,differenceSeconds:ngtecoSeconds-omsSeconds}});return {allowed:true,rows};
}
