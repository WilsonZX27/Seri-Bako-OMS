import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { summarizeScheduleWeeks } from "@/lib/attendance/schedule-summary";
import { isMockMode } from "@/lib/mock-mode";

export function malaysiaWeekStart(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  const local = new Date(`${parts}T00:00:00Z`);
  local.setUTCDate(local.getUTCDate() - ((local.getUTCDay() + 6) % 7));
  return local.toISOString().slice(0, 10);
}

export async function getAttendanceWorkspace(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  if (isMockMode()) {
    const weekEnd = new Date(`${weekStart}T00:00:00Z`);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    return {
      weekStart, weekEnd: weekEnd.toISOString().slice(0, 10),
      pendingApprovals: 0, pendingRequests: 0, unresolvedExceptions: 0,
      pendingActualReports: 0, missingMappings: 0, scheduleStatus: "not_started",
      latestBatch: null, activeLocks: 0,
    };
  }
  const db = looseSupabase(await createClient());
  const [{ data, error }, weeks] = await Promise.all([
    db.rpc("get_attendance_workspace_summary", { p_week_start: weekStart }),
    db.from("schedule_weeks").select("branch_id,revision,status", { count: "exact" }).eq("week_start", weekStart).limit(1000),
  ]);
  if (error) throw error;
  if (weeks.error) throw weeks.error;
  if ((weeks.count ?? 0) > 1000) throw new Error("Schedule summary is too large to load safely.");
  // The legacy RPC maps published/returned/rejected to draft. Read canonical
  // roster states under the caller's existing RLS instead of inferring them.
  return { ...(data as Record<string, unknown>), scheduleStatus: summarizeScheduleWeeks((weeks.data ?? []) as Array<{ branch_id: string; revision: number; status: string }>) } as {
    weekStart: string; weekEnd: string; pendingApprovals: number; pendingRequests: number;
    unresolvedExceptions: number; pendingActualReports: number; missingMappings: number;
    scheduleStatus: string; latestBatch: { id:string; parser_profile:string; file_name:string; status:string; row_count:number; error_count:number; warning_count:number; finalised_at:string|null } | null;
    activeLocks: number;
  };
}

export async function getSchedulePlanner(weekStart = malaysiaWeekStart(), requestedBranchId?: string) {
  if (!(await hasPermission("schedule.read"))) throw new Error("Missing permission: schedule.read");
  if (isMockMode()) return { branches: [], branchId: null, week: null, previousWeekId: null, untimedDuties: [] as Array<{staff_id:string;work_date:string;label:string}>, templates: [], people: [], candidates: [], assignments: [], externalAssignments: [], roBalances: {} as Record<string,number>, submittedByName: null, importSource: null };
  const canPlan = await hasPermission("schedule.draft") || await hasPermission("schedule.approve");
  const db = looseSupabase(await createClient());
  const { data: branches, error: branchError } = await db.rpc("get_schedule_branches");
  if (branchError) throw branchError;
  const branchRows = (branches ?? []) as unknown as Array<{ id: string; branch_name: string }>;
  const branchId = requestedBranchId && branchRows.some((b) => b.id === requestedBranchId) ? requestedBranchId : branchRows[0]?.id;
  if (!branchId) return { branches: [], branchId: null, week: null, previousWeekId: null, untimedDuties: [] as Array<{staff_id:string;work_date:string;label:string}>, templates: [], people: [], candidates: [], assignments: [], externalAssignments: [], roBalances: {} as Record<string,number>, submittedByName: null, importSource: null };
  const previousStart = new Date(`${weekStart}T00:00:00Z`); previousStart.setUTCDate(previousStart.getUTCDate() - 7);
  // These reads depend only on the authorised branch, not on each other.
  const [weekResult, candidateResult, previousResult, templates, externalAssignments, untimedDuties, importBatch] = await Promise.all([
    db.from("schedule_weeks").select("id,status,updated_at,submitted_by,published_by,published_at,excluded_staff_ids").eq("branch_id", branchId).eq("week_start", weekStart).in("status", canPlan ? ["draft", "submitted", "returned", "rejected", "amendment_pending", "published", "locked"] : ["published", "locked"]).order("revision", { ascending: false }).limit(1),
    canPlan ? db.rpc("get_schedule_staff_candidates", { p_branch_id: branchId }) : Promise.resolve({ data: [], error: null }),
    db.from("schedule_weeks").select("id").eq("branch_id", branchId).eq("week_start", previousStart.toISOString().slice(0, 10)).in("status", ["published", "locked"]).order("revision", { ascending: false }).limit(1),
    db.from("shift_templates").select("id,code,name,planned_start,planned_end,planned_break_seconds,maximum_recognised_seconds,colour").eq("is_active", true).order("code"),
    canPlan ? db.rpc("get_schedule_external_assignments_v2", { p_branch_id: branchId, p_week_start: weekStart }) : Promise.resolve({ data: [], error: null }),
    db.rpc("get_schedule_untimed_duties",{p_branch_id:branchId,p_week_start:weekStart}),
    canPlan ? db.from("schedule_import_batches").select("file_name,created_at").eq("week_start", weekStart).order("created_at", { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if(untimedDuties.error)throw untimedDuties.error;
  const { data: weeks, error: weekError } = weekResult;
  if (weekError) throw weekError;
  if (candidateResult.error) throw candidateResult.error;
  if (previousResult.error) throw previousResult.error;
  if (templates.error) throw templates.error;
  if (externalAssignments.error) throw externalAssignments.error;
  if (importBatch.error) throw importBatch.error;
  const scheduleCandidates = candidateResult.data;
  const previousWeeks = previousResult.data;
  const week = weeks?.[0] ?? null;
  const [submitter, staffResult, assignments] = await Promise.all([
    (week?.published_by || week?.submitted_by) ? db.from("staffs").select("full_name").eq("id",week.published_by || week.submitted_by).maybeSingle() : Promise.resolve({data:null,error:null}),
    db.rpc("get_schedule_staff", { p_branch_id: branchId,p_week_id:week?.id??null }),
    week ? db.from("shift_assignment_revisions").select("staff_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,custom_reason,work_site_label,ro_minutes,ro_original_start,ro_original_end,ro_direction").eq("schedule_week_id", week.id).eq("is_current", true) : Promise.resolve({ data: [], error: null }),
  ]);
  if (submitter.error) throw submitter.error;
  const { data: scheduleStaff, error: staffError } = staffResult;
  if (staffError) throw staffError;
  if (assignments.error) throw assignments.error;
  const staffIds=((scheduleStaff ?? []) as Array<{id:string}>).map((staff)=>staff.id);
  const [compTime, reservations] = await Promise.all([
    staffIds.length ? db.from("comp_time_transactions").select("staff_id,minutes").in("staff_id",staffIds).eq("status","approved") : Promise.resolve({data:[],error:null}),
    staffIds.length ? db.from("attendance_ro_reservations").select("staff_id,reserved_minutes").in("staff_id",staffIds).eq("status","reserved") : Promise.resolve({data:[],error:null}),
  ]);
  if(compTime.error)throw compTime.error;if(reservations.error)throw reservations.error;
  const roBalances:Record<string,number>={};for(const id of staffIds)roBalances[id]=0;for(const row of (compTime.data??[]) as Array<{staff_id:string;minutes:number}>)roBalances[row.staff_id]=(roBalances[row.staff_id]??0)+Number(row.minutes);for(const row of (reservations.data??[]) as Array<{staff_id:string;reserved_minutes:number}>)roBalances[row.staff_id]=Math.max(0,(roBalances[row.staff_id]??0)-Number(row.reserved_minutes));
  return { untimedDuties:(untimedDuties.data??[]) as Array<{staff_id:string;work_date:string;label:string}>, branches: branchRows, branchId, week: week as unknown as { id: string; status: string;updated_at:string;excluded_staff_ids:string[] } | null, previousWeekId: previousWeeks?.[0]?.id ? String(previousWeeks[0].id) : null, templates: (templates.data ?? []) as unknown as Array<{ id:string;code:string;name:string;planned_start:string;planned_end:string;planned_break_seconds:number;maximum_recognised_seconds:number;colour:string }>, people: ((scheduleStaff ?? []) as Array<{ id:string; [key:string]:unknown }>).filter(staff => !((week?.excluded_staff_ids ?? []) as string[]).includes(staff.id)).map((staff) => ({ ...staff, home_branch_id: (staff.default_branch_id as string | null | undefined) ?? null })) as unknown as Array<{ id:string;full_name:string;staff_code:string|null;status:string;employment_type:string;role_code:string;employment_end_date:string|null; home_branch_id:string|null }>, candidates: (scheduleCandidates ?? []) as unknown as Array<{ id:string;full_name:string;staff_code:string|null;status:string;employment_type:string;role_code:string;employment_end_date:string|null }>, assignments: (assignments.data ?? []) as unknown as Array<{staff_id:string;work_date:string;assignment_kind:string;shift_template_id:string|null;custom_start:string|null;custom_end:string|null;custom_crosses_midnight:boolean;custom_break_seconds:number|null;custom_maximum_recognised_seconds:number|null;custom_reason:string|null;work_site_label:string|null;ro_minutes:number|null;ro_original_start:string|null;ro_original_end:string|null;ro_direction:string|null}>, externalAssignments: (externalAssignments.data ?? []) as unknown as Array<{staff_id:string;work_date:string;branch_id:string;branch_name:string;planned_start:string|null;planned_end:string|null;assignment_kind:string;schedule_status:string}>,roBalances,submittedByName:submitter.data?.full_name?String(submitter.data.full_name):null, importSource: importBatch.data ? { fileName: String(importBatch.data.file_name), createdAt: String(importBatch.data.created_at) } : null };
}

export async function getScheduleOverview(weekStart = malaysiaWeekStart()) {
  if (!(await hasPermission("schedule.read"))) throw new Error("Missing permission: schedule.read");
  if (isMockMode()) return [];
  const canPlan = await hasPermission("schedule.draft") || await hasPermission("schedule.approve");
  const db = looseSupabase(await createClient());
  const { data: branchData, error: branchError } = await db.rpc("get_schedule_branches");
  if (branchError) throw branchError;
  const branches = (branchData ?? []) as unknown as Array<{ id: string; branch_name: string }>;
  if (!branches.length) return [];
  const { data: weekData, error: weekError } = await db.from("schedule_weeks").select("id,branch_id,status,revision,updated_at").eq("week_start", weekStart).in("branch_id", branches.map((branch) => branch.id)).in("status", canPlan ? ["draft", "submitted", "returned", "rejected", "amendment_pending", "published", "locked"] : ["published", "locked"]).order("revision", { ascending: false });
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

/** Closing reviews the whole outlet week, independently of list filters or pagination. */
export async function getAttendanceWeekBlockers(weekStart: string, branchId: string) {
  if (!(await hasPermission("attendance.week.close"))) throw new Error("Missing permission: attendance.week.close");
  const db=looseSupabase(await createClient()),end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const result=await db.from("daily_attendance_results").select("id,work_date,statuses,staffs(full_name),attendance_exceptions(exception_code,severity,resolved_at)",{count:"exact"}).eq("branch_id",branchId).eq("is_current",true).gte("work_date",weekStart).lte("work_date",end.toISOString().slice(0,10)).order("work_date").order("id").limit(10000);
  if(result.error){logServerError(result.error,{module:"attendance",source:"week-blockers"});throw result.error;}
  if((result.count??0)>10000)throw new Error("This outlet week is too large to review safely. Contact People before closing.");
  const blocking=new Set(["missing_punches","missing_check_in","missing_check_out","odd_punch_count","impossible_ordering","unpaid_leave_punch_conflict"]);
  return (result.data??[]).filter(row=>Array.isArray(row.statuses)&&row.statuses.some(value=>blocking.has(String(value))) || Array.isArray(row.attendance_exceptions)&&row.attendance_exceptions.some(value=>value.severity==="blocker"&&value.resolved_at==null));
}

export async function getAttendanceReview(weekStart = malaysiaWeekStart(), filters: { branch?: string; status?: string; employee?: string; page?: number; detail?: string } = {}) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db = looseSupabase(await createClient()); const end = new Date(`${weekStart}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + 6);
  const weekEnd=end.toISOString().slice(0,10),page=Math.max(1,filters.page??1),pageSize=100;
  let staffIds:string[]|null=null;
  if(filters.employee?.trim()){const people=await db.from("staffs").select("id").ilike("full_name",`%${filters.employee.trim()}%`).is("deleted_at",null).limit(100);if(people.error)throw people.error;staffIds=(people.data??[]).map((row:Record<string,unknown>)=>String(row.id));}
  let query=db.from("daily_attendance_results").select("*,staffs(full_name,staff_code,employment_type),branches(branch_name)",{count:"exact"}).eq("is_current",true).gte("work_date",weekStart).lte("work_date",weekEnd);
  if(filters.branch)query=query.eq("branch_id",filters.branch);
  if(filters.status&&filters.status!=="all"&&filters.status!=="repeated_missing_punch")query=query.contains("statuses",[filters.status]);
  if(staffIds)query=staffIds.length?query.in("staff_id",staffIds):query.eq("staff_id","00000000-0000-0000-0000-000000000000");
  const detailQuery=filters.detail?db.from("daily_attendance_results").select("*,staffs(full_name,staff_code,employment_type),branches(branch_name),attendance_import_batches(file_name,parser_profile,finalised_at)").eq("id",filters.detail).eq("is_current",true).maybeSingle():Promise.resolve({data:null,error:null});
  const [result,branches,batches,detail]=await Promise.all([query.order("work_date").order("created_at").range((page-1)*pageSize,page*pageSize-1),db.from("branches").select("id,branch_name").in("branch_type",["outlet","central_kitchen"]).eq("status","active").is("deleted_at",null).order("branch_name"),db.from("attendance_import_batches").select("id,file_name,parser_profile,row_count,error_count,warning_count,status,finalised_at").eq("week_start",weekStart).order("created_at",{ascending:false}).limit(5),detailQuery]);
  for(const item of [result,branches,batches,detail])if(item.error)throw item.error;
  let reviewRows = (result.data ?? []) as Array<Record<string, unknown>>;
  const resultStaffIds = [...new Set(reviewRows.map((row) => String(row.staff_id)).filter(Boolean))];
  if (resultStaffIds.length) {
    const visibleMonths = [...new Set(reviewRows.map((row) => String(row.work_date).slice(0, 7)))];
    const monthStart = `${visibleMonths.sort()[0]}-01`;
    const lastMonth = visibleMonths.sort().at(-1)!;
    const monthEndDate = new Date(`${lastMonth}-01T00:00:00Z`);
    monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
    monthEndDate.setUTCDate(0);
    const monthEnd = monthEndDate.toISOString().slice(0, 10);
    const monthly = await db.from("daily_attendance_results").select("staff_id,work_date,missing_punch_count").in("staff_id", resultStaffIds).eq("is_current", true).gte("work_date", monthStart < ATTENDANCE_TRACKING_START_DATE ? ATTENDANCE_TRACKING_START_DATE : monthStart).lte("work_date", monthEnd).order("work_date");
    if (monthly.error) throw monthly.error;
    const byStaffMonth = new Map<string, { count: number; dates: string[] }>();
    for (const row of (monthly.data ?? []) as Array<{staff_id:string;work_date:string;missing_punch_count:number}>) {
      const missing = Number(row.missing_punch_count ?? 0);
      if (!missing) continue;
      const key = `${row.staff_id}:${row.work_date.slice(0, 7)}`;
      const current = byStaffMonth.get(key) ?? { count: 0, dates: [] };
      current.count += missing;
      current.dates.push(`${row.work_date} (${missing})`);
      byStaffMonth.set(key, current);
    }
    reviewRows = reviewRows.map((row) => {
      const tracking = byStaffMonth.get(`${row.staff_id}:${String(row.work_date).slice(0, 7)}`) ?? { count: 0, dates: [] };
      return { ...row, monthly_missing_punch_count: tracking.count, monthly_missing_punch_dates: tracking.dates };
    });
    if (filters.status === "repeated_missing_punch") reviewRows = reviewRows.filter((row) => Number(row.monthly_missing_punch_count) >= 4);
  }
  const unscheduledPunches: Array<{staff_id:string;full_name:string;work_date:string;punch_count:number;first_punch:string;last_punch:string;home_branch:string;scheduled_branch:string;schedule_status:string}> = [];
  if (filters.branch) {
    const devices = await db.from("ngteco_device_mappings").select("source_code").eq("branch_id",filters.branch).eq("is_active",true);
    if (devices.error) throw devices.error;
    const sources = new Set((devices.data ?? []).map((row:Record<string,unknown>)=>String(row.source_code)));
    const sourceCodes = [...sources];
    const [raw, people, coverage, scheduled] = await Promise.all([
      sourceCodes.length
        ? db.from("attendance_raw_punch_events").select("person_id,local_timestamp,occurred_at,source_code").in("source_code",sourceCodes).gte("local_timestamp",`${weekStart} 00:00:00`).lte("local_timestamp",`${weekEnd} 23:59:59`).order("occurred_at")
        : Promise.resolve({data:[],error:null}),
      db.from("ngteco_person_mappings").select("person_id,staff_id,staffs!ngteco_person_mappings_staff_id_fkey(full_name,default_branch_id)").eq("is_active",true),
      db.from("daily_attendance_results").select("staff_id,work_date").eq("is_current",true).gte("work_date",weekStart).lte("work_date",weekEnd),
      db.from("shift_assignment_revisions").select("staff_id,work_date,branch_id,schedule_weeks!shift_assignment_revisions_schedule_week_id_fkey!inner(status,revision)").eq("is_current",true).gte("work_date",weekStart).lte("work_date",weekEnd),
    ]);
    for (const [source,item] of [["raw",raw],["people",people],["coverage",coverage],["scheduled",scheduled]] as const) if (item.error) {logServerError(item.error,{module:"attendance",source:`review-${source}`});throw item.error;}
    const mapped = new Map((people.data ?? []).map((row:Record<string,unknown>)=>[String(row.person_id),row]));
    const covered = new Set((coverage.data ?? []).map((row:Record<string,unknown>)=>`${row.staff_id}:${row.work_date}`));
    const allowedStaff = staffIds ? new Set(staffIds) : null;
    const grouped = new Map<string,{staff_id:string;full_name:string;work_date:string;values:string[];home_branch:string;scheduled_branch:string;schedule_status:string}>();
    for (const row of (raw.data ?? []) as Array<Record<string,unknown>>) {
      if (!sources.has(String(row.source_code))) continue;
      const person = mapped.get(String(row.person_id)) as Record<string,unknown> | undefined;
      if (!person) continue;
      const staffId=String(person.staff_id),workDate=String(row.local_timestamp).slice(0,10),key=`${staffId}:${workDate}`;
      if (allowedStaff && !allowedStaff.has(staffId)) continue;
      if (covered.has(key)) continue;
      const staff=person.staffs as {full_name?:string;default_branch_id?:string}|null;
      const assignment=(scheduled.data ?? []).filter((item:Record<string,unknown>)=>String(item.staff_id)===staffId && item.work_date===workDate).sort((a:Record<string,unknown>,b:Record<string,unknown>)=>Number((b.schedule_weeks as Record<string,unknown>)?.revision ?? 0)-Number((a.schedule_weeks as Record<string,unknown>)?.revision ?? 0))[0];
      const branchName=(id:unknown)=>String((branches.data ?? []).find((item:Record<string,unknown>)=>item.id===id)?.branch_name ?? "Unavailable outlet");
      const current=grouped.get(key)??{staff_id:staffId,full_name:staff?.full_name??"Mapped employee",work_date:workDate,values:[],home_branch:branchName(staff?.default_branch_id),scheduled_branch:assignment ? branchName(assignment.branch_id) : "No schedule",schedule_status:String((assignment?.schedule_weeks as Record<string,unknown> | undefined)?.status ?? "missing")};
      current.values.push(String(row.occurred_at));grouped.set(key,current);
    }
    for (const item of grouped.values()) unscheduledPunches.push({staff_id:item.staff_id,full_name:item.full_name,work_date:item.work_date,punch_count:item.values.length,first_punch:item.values[0],last_punch:item.values[item.values.length-1],home_branch:item.home_branch,scheduled_branch:item.scheduled_branch,schedule_status:item.schedule_status});
  }
  const [exceptions,adjustments]=detail.data?await Promise.all([db.from("attendance_exceptions").select("id,exception_code,severity,details,resolved_at,resolution_note,created_at").eq("result_id",filters.detail).order("created_at"),db.from("attendance_adjustments").select("id,reason,before_state,after_state,created_at").eq("result_id",filters.detail).order("created_at",{ascending:false})]):[{data:[],error:null},{data:[],error:null}];
  for(const item of [exceptions,adjustments])if(item.error)throw item.error;
  return {rows:reviewRows,total:filters.status === "repeated_missing_punch" ? reviewRows.length : result.count??0,page,pageSize,branches:branches.data??[],batches:batches.data??[],unscheduledPunches,detail:detail.data?{...detail.data,exceptions:exceptions.data??[],adjustments:adjustments.data??[]}:null};
}

export async function getAttendanceReviewBranches() {
  if (!(await hasPermission("attendance.read")))
    throw new Error("Missing permission: attendance.read");
  if (isMockMode()) return [];
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

export const ATTENDANCE_TRACKING_START_DATE = "2026-09-14";

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
  if (isMockMode()) return { rules: [], holidays: [], branches: [] };
  const db=looseSupabase(await createClient());
  const [rules,holidays,branches]=await Promise.all([
    db.from("attendance_pay_rule_versions").select("*").eq("is_active",true).order("effective_from",{ascending:false}).limit(20),
    db.from("public_holidays").select("*,public_holiday_branches(branch_id,branches(branch_name))").order("holiday_date",{ascending:false}).limit(100),
    db.from("branches").select("id,branch_name").in("branch_type",["outlet","central_kitchen"]).eq("status","active").is("deleted_at",null).order("branch_name"),
  ]);
  for(const item of [rules,holidays,branches])if(item.error)throw item.error;
  return {rules:rules.data??[],holidays:holidays.data??[],branches:branches.data??[]};
}

/** Independent directory, constrained by existing staff/comp-time RLS and selected branch. */
export async function getAttendanceCompPeople(weekStart: string, branchId?: string) {
  if (!branchId || !(await hasPermission("attendance.read")) || !(await hasPermission("comp_time.read")) || !(await hasPermission("staffs.read"))) return [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart) || new Date(`${weekStart}T00:00:00Z`).toISOString().slice(0,10) !== weekStart) throw new Error("Invalid balance period.");
  const actor = await requireActiveTenantActor();
  const db = looseSupabase(await createClient());
  const access = await db.rpc("can_access_company_branch", { target_company_id: actor.companyId, target_branch_id: branchId });
  if (access.error) throw access.error;
  if (access.data !== true) return [];
  const people: Array<Record<string, unknown>> = [];
  for (let offset = 0; ; offset += 500) {
    const result = await db.from("staffs")
      .select("id,full_name,staff_code,status,employment_end_date,staff_branches!inner(branch_id)")
      .eq("company_id", actor.companyId).eq("staff_branches.branch_id", branchId)
      .in("status", ["active", "invited"]).is("deleted_at", null)
      .or(`employment_end_date.is.null,employment_end_date.gte.${weekStart}`)
      .order("id").range(offset, offset + 499);
    if (result.error) throw result.error;
    const rows = (result.data ?? []) as Array<Record<string, unknown>>;
    people.push(...rows);
    if (rows.length < 500) break;
  }
  return people;
}

export async function getAttendanceActuals(weekStart = malaysiaWeekStart(), branchId?: string) {
  if (!(await hasPermission("attendance.read"))) throw new Error("Missing permission: attendance.read");
  const db=looseSupabase(await createClient());const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);const weekEnd=end.toISOString().slice(0,10);
  const byBranch = <T extends { eq: (column: string, value: string) => T }>(query: T) => branchId ? query.eq("branch_id", branchId) : query;
  const [weeks,reports,claims,reservations,locks]=await Promise.all([
    byBranch(db.from("schedule_weeks").select("id,branch_id,revision").eq("week_start",weekStart).in("status",["published","locked"]).order("revision",{ascending:false})),
    byBranch(db.from("daily_attendance_reports").select("*,staffs!daily_attendance_reports_staff_id_fkey(full_name,staff_code),branches!daily_attendance_reports_branch_id_fkey(branch_name),attachments!daily_attendance_reports_evidence_attachment_id_fkey(file_name)").gte("work_date",weekStart).lte("work_date",weekEnd)).order("submitted_at",{ascending:false}),
    byBranch(db.from("attendance_ot_claims").select("*,staffs!attendance_ot_claims_staff_id_fkey(full_name,staff_code),branches!attendance_ot_claims_branch_id_fkey(branch_name)").gte("work_date",weekStart).lte("work_date",weekEnd)).order("work_date"),
    byBranch(db.from("attendance_ro_reservations").select("*,staffs!attendance_ro_reservations_staff_id_fkey(full_name,staff_code),branches!attendance_ro_reservations_branch_id_fkey(branch_name)").gte("work_date",weekStart).lte("work_date",weekEnd)).order("work_date"),
    byBranch(db.from("attendance_period_locks").select("id,branch_id,week_start,locked_at,unlocked_at").eq("week_start",weekStart).is("unlocked_at",null)),
  ]);
  for(const result of [weeks,reports,claims,reservations,locks])if(result.error)throw result.error;
  const latestWeeks = new Map<string,Record<string,unknown>>();
  for(const row of weeks.data ?? []) if(!latestWeeks.has(String(row.branch_id))) latestWeeks.set(String(row.branch_id),row);
  const weekIds=[...latestWeeks.values()].map(row=>String(row.id));
  const assignments=weekIds.length?await db.from("shift_assignment_revisions").select("id,staff_id,branch_id,work_date,assignment_kind,custom_start,custom_end,custom_reason,ro_minutes,ro_original_start,ro_original_end,ro_direction,shift_templates(name,planned_start,planned_end),staffs!shift_assignment_revisions_staff_id_fkey(full_name,staff_code),branches!shift_assignment_revisions_branch_id_fkey(branch_name)").in("schedule_week_id",weekIds).eq("is_current",true).gte("work_date",weekStart).lte("work_date",weekEnd).order("work_date"):{data:[],error:null};
  if(assignments.error)throw assignments.error;
  const compPeople = await getAttendanceCompPeople(weekStart, branchId);
  const relevantStaffIds = [...new Set([
    ...compPeople.map(person => ({staff_id: person.id})),
    ...(assignments.data ?? []),
    ...(reports.data ?? []),
    ...(claims.data ?? []),
    ...(reservations.data ?? []),
  ].map((row:Record<string,unknown>) => String(row.staff_id ?? "")).filter(Boolean))];
  const ledger = relevantStaffIds.length
    ? await db.from("comp_time_transactions").select("*,staffs!comp_time_transactions_staff_id_fkey(full_name,staff_code),branches!comp_time_transactions_branch_id_fkey(branch_name)").in("staff_id", relevantStaffIds).lte("work_date",weekEnd).order("work_date",{ascending:false}).order("created_at",{ascending:false})
    : {data:[],error:null};
  if(ledger.error)throw ledger.error;
  const ledgerRows=(ledger.data??[]) as Array<Record<string,unknown>>;const balances:Record<string,number>=Object.fromEntries(compPeople.map(person=>[String(person.id),0]));
  for(const row of ledgerRows)if(row.status==="approved")balances[String(row.staff_id)]=(balances[String(row.staff_id)]??0)+Number(row.minutes??0);
  return {compPeople,assignments:assignments.data??[],reports:reports.data??[],ledger:ledgerRows,balances,claims:claims.data??[],reservations:reservations.data??[],locks:locks.data??[]};
}

export async function getStaffCompTime(staffId:string){
  if(!(await hasPermission("comp_time.read")))return {allowed:false,balance:0,ledger:[]};
  const db=looseSupabase(await createClient());const [balance,ledger]=await Promise.all([db.rpc("get_comp_time_balance",{p_staff_id:staffId}),db.from("comp_time_transactions").select("id,work_date,transaction_kind,minutes,reason,status,submitted_at").eq("staff_id",staffId).order("work_date",{ascending:false}).order("created_at",{ascending:false}).limit(10)]);if(balance.error)throw balance.error;if(ledger.error)throw ledger.error;return {allowed:true,balance:Number(balance.data??0),ledger:ledger.data??[]};
}

export async function getOwnPublishedShifts(weekStart = malaysiaWeekStart()) {
  const actor = await requireActiveTenantActor();
  if (!(await hasPermission("schedule.read")) && !(await hasPermission("schedule.request"))) return [];
  if (isMockMode()) return [];
  const db=looseSupabase(await createClient());const end=new Date(`${weekStart}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const {data,error}=await db.from("shift_assignment_revisions").select("id,work_date,assignment_kind,custom_start,custom_end,shift_templates(code,name,planned_start,planned_end),branches!shift_assignment_revisions_branch_id_fkey(branch_name),schedule_weeks!shift_assignment_revisions_schedule_week_id_fkey!inner(status)").eq("staff_id",actor.staffId).eq("is_current",true).gte("work_date",weekStart).lte("work_date",end.toISOString().slice(0,10)).in("schedule_weeks.status",["published","locked"]).order("work_date");if(error)throw error;return (data??[]) as unknown as Array<{id:string;work_date:string;assignment_kind:string;custom_start:string|null;custom_end:string|null;shift_templates:{code:string;name:string;planned_start:string;planned_end:string}|null;branches:{branch_name:string}|null}>;
}

export async function getPendingShiftRequests() {
  if (!(await hasPermission("schedule.swap_review")) && !(await hasPermission("schedule.approve"))) return [];
  if (isMockMode()) return [];
  const db=looseSupabase(await createClient());const {data,error}=await db.from("shift_change_requests").select("id,status,reason,material_change,created_at,shift_assignment_revisions!shift_change_requests_assignment_id_fkey(work_date,staffs!shift_assignment_revisions_staff_id_fkey(full_name),branches!shift_assignment_revisions_branch_id_fkey(branch_name))").in("status",["pending_supervisor","pending_manager"]).order("created_at");if(error)throw error;return data??[];
}

export async function getAttendanceMappings() {
  if (!(await hasPermission("attendance.map"))) return { people: [], devices: [], staffs: [], branches: [], allowed: false };
  if (isMockMode()) return { people: [], devices: [], staffs: [], branches: [], allowed: true };
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
