import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
import { formatAttendanceTime } from "@/lib/attendance/time";
import { logServerError } from "@/server/observability/logger";
import { exportPunches, exportWorkedSeconds, exportExceptionLabels } from "@/lib/attendance/export-policy";
import { buildPeopleWorkbook, buildZipArchive, type PeopleWorkbookDay, type PeopleWorkbookSheet } from "@/lib/attendance/people-workbook";

// Role and outlet scope apply equally to draft and final reports. Export never closes a week.
const schema = z.object({
  week: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  format: z.literal("xlsx"),
  branches: z.array(z.string().uuid()).min(1).max(50),
  period: z.enum(["week","month"]).default("week"),
  mode: z.enum(["draft","final"]).default("draft"),
});

type Row = Record<string, unknown>;
type Nested = unknown;

function monthEnd(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${month}-${String(new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()).padStart(2, "0")}`;
}

function monthDates(month: string) {
  const end = Number(monthEnd(month).slice(-2));
  return Array.from({ length: end }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

function scheduleRangeStart(month: string) {
  const start = new Date(`${month}-01T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

function clock(value: unknown) {
  if (!value) return null;
  const text = String(value);
  return text.includes("T") ? formatAttendanceTime(text) : text.slice(0, 5);
}

function object(value: Nested): Row {
  return value && typeof value === "object" ? value as Row : {};
}

function branchName(value: Nested) {
  const item = object(value);
  return typeof item.branch_name === "string" ? item.branch_name : "";
}

function assignmentSchedule(value: Nested) {
  const assignment = object(value);
  const snapshot = object(assignment.template_snapshot);
  const template = Object.keys(snapshot).length ? snapshot : object(assignment.shift_templates);
  return {
    start: typeof assignment.custom_start === "string" ? assignment.custom_start : typeof template.planned_start === "string" ? template.planned_start : null,
    end: typeof assignment.custom_end === "string" ? assignment.custom_end : typeof template.planned_end === "string" ? template.planned_end : null,
  };
}

function isOffAssignment(value: Nested) {
  const kind = String(object(value).assignment_kind ?? "").toLowerCase();
  return kind !== "" && kind !== "shift";
}

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-MY", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

function sheetDay(date: string, result: Nested, assignment: Nested, outlet: string): PeopleWorkbookDay {
  const row = object(result);
  const schedule = assignmentSchedule(assignment);
  const punches = result ? exportPunches(row).map((value) => clock(value)).filter((value): value is string => Boolean(value)) : [];
  const scheduledStart = clock(row.scheduled_start) ?? clock(schedule.start);
  const scheduledEnd = clock(row.scheduled_end) ?? clock(schedule.end);
  return {
    date,
    event: Array.isArray(row.statuses) && row.statuses.includes("unpaid_leave") ? "Unpaid Leave" : undefined,
    exceptions: result ? exportExceptionLabels(row) : isOffAssignment(assignment) ? "" : "No calculated result",
    day: dayLabel(date),
    outlet: branchName(row.branches) || outlet,
    scheduleStart: scheduledStart,
    scheduleEnd: scheduledEnd,
    off: isOffAssignment(assignment),
    punches,
    workedSeconds: result ? exportWorkedSeconds(row) : null,
    overtimeSeconds: result ? Number(row.overtime_seconds ?? 0) : null,
    shortHoursSeconds: result ? Number(row.early_leave_seconds ?? 0) : null,
    pphSeconds: result ? Number(row.holiday_ot_equivalent_seconds ?? row.holiday_normal_equivalent_seconds ?? 0) : null,
  };
}

function dateAfter(date:string, days:number) {const value=new Date(`${date}T00:00:00Z`);value.setUTCDate(value.getUTCDate()+days);return value.toISOString().slice(0,10);}
function filePart(name:string) {return name.replace(/[\\/:*?"<>|\r\n]/g," ").trim().slice(0,100) || "Outlet";}
export async function GET(request: Request) {
  try {
    if (!(await hasPermission("attendance.sensitive.export"))) return NextResponse.json({ok:false,message:"People or Owner permission is required."},{status:403});
    const url=new URL(request.url);
    const parsed=schema.safeParse({week:url.searchParams.get("week"),format:url.searchParams.get("format"),branches:url.searchParams.getAll("branch"),period:url.searchParams.get("period") ?? "week",mode:url.searchParams.get("mode") ?? "draft"});
    if(!parsed.success) return NextResponse.json({ok:false,message:"Choose outlets and a valid period."},{status:400});
    const input=parsed.data;
    const date=new Date(`${input.week}T00:00:00Z`);
    if(!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==input.week || date.getUTCDay()!==1) return NextResponse.json({ok:false,message:"Choose the Monday starting the week."},{status:400});
    const month=input.week.slice(0,7),start=input.period==="week" ? input.week : `${month}-01`,end=input.period==="week" ? dateAfter(input.week,6) : monthEnd(month);
    const dates=input.period==="week" ? Array.from({length:7},(_,index)=>dateAfter(start,index)) : monthDates(month);
    const db=looseSupabase(await createClient()),branchIds=[...new Set(input.branches)];
    const visible=await db.from("branches").select("id,branch_name").in("id",branchIds);
    if(visible.error) throw visible.error;
    if(!visible.data || visible.data.length!==branchIds.length) return NextResponse.json({ok:false,message:"An outlet is unavailable."},{status:403});
    const files:Array<{name:string;content:Buffer}>=[],generatedAt=new Date().toISOString();
    for(const branch of visible.data) {
      const branchId=String(branch.id),outlet=String(branch.branch_name);
      const [results,weeks,locks,reports]=await Promise.all([
        db.from("daily_attendance_results").select("*,staffs(full_name,staff_code,employment_type),branches(branch_name)").eq("is_current",true).eq("branch_id",branchId).gte("work_date",start).lte("work_date",end).order("work_date").limit(10000),
        db.from("schedule_weeks").select("id,branch_id,revision,week_start").eq("branch_id",branchId).gte("week_start",input.period==="week" ? start : scheduleRangeStart(month)).lte("week_start",end).in("status",["published","locked"]).order("revision",{ascending:false}),
        db.from("attendance_period_locks").select("week_start,branch_id").or(`branch_id.eq.${branchId},branch_id.is.null`).is("unlocked_at",null).gte("week_start",input.period==="week" ? start : scheduleRangeStart(month)).lte("week_start",end),
        db.from("daily_attendance_reports").select("staff_id,work_date,report_type,status").eq("branch_id",branchId).gte("work_date",start).lte("work_date",end).in("status",["pending","approved"]),
      ]);
      for(const result of [results,weeks,locks,reports]) if(result.error) throw result.error;
      if((results.data?.length ?? 0)>=10000) throw new Error("Export row limit exceeded.");
      const lockedWeeks=new Set((locks.data??[]).map((row:Row)=>String(row.week_start)));
      const expectedWeeks=new Set(dates.map(value=>{const day=new Date(`${value}T00:00:00Z`);return dateAfter(value,-((day.getUTCDay()+6)%7));}));
      const draft=[...expectedWeeks].some(value=>!lockedWeeks.has(value));
      if(input.mode==="final" && draft) return NextResponse.json({ok:false,message:`${outlet}: close every week in this period before downloading a final report.`},{status:409});
      const latestWeeks=new Map<string,Row>();
      for(const row of weeks.data??[]) if(!latestWeeks.has(String(row.week_start))) latestWeeks.set(String(row.week_start),row);
      const weekIds=[...latestWeeks.values()].map(row=>String(row.id));
      const assignmentResult=weekIds.length ? await db.from("shift_assignment_revisions").select("staff_id,branch_id,work_date,assignment_kind,custom_start,custom_end,template_snapshot,shift_templates(planned_start,planned_end),staffs!shift_assignment_revisions_staff_id_fkey(full_name,staff_code,employment_type),branches!shift_assignment_revisions_branch_id_fkey(branch_name)").in("schedule_week_id",weekIds).eq("is_current",true).gte("work_date",start).lte("work_date",end).order("work_date") : {data:[],error:null};
      if(assignmentResult.error) throw assignmentResult.error;
      const resultRows=(results.data??[]) as Row[],assignments=(assignmentResult.data??[]) as Row[];
      const resultByKey=new Map(resultRows.map(row=>[`${row.staff_id}|${row.work_date}`,row])),assignmentByKey=new Map(assignments.map(row=>[`${row.staff_id}|${row.work_date}`,row]));
      const staffMap=new Map<string,Row>();for(const row of [...assignments,...resultRows]) staffMap.set(String(row.staff_id),object(row.staffs));
      const sheets:PeopleWorkbookSheet[]=[...staffMap.entries()].sort((a,b)=>String(a[1].full_name).localeCompare(String(b[1].full_name))).map(([staffId,profile])=>({name:String(profile.full_name ?? staffId),employee:String(profile.full_name ?? staffId),staffCode:profile.staff_code==null?null:String(profile.staff_code),employmentType:profile.employment_type==null?null:String(profile.employment_type),outlet,month,period:{start,end,draft,generatedAt},days:dates.map(value=>{
        const key=`${staffId}|${value}`,result=resultByKey.get(key),assignment=assignmentByKey.get(key),day=sheetDay(value,result,assignment,outlet);
        if(!assignment && !result) day.exceptions="";
        const dailyReports=(reports.data??[]).filter((row:Row)=>String(row.staff_id)===staffId && row.work_date===value);
        const approved=dailyReports.find((row:Row)=>row.status==="approved" && row.report_type==="unpaid_leave");
        if(approved) day.event="Unpaid Leave";
        const pending=dailyReports.filter((row:Row)=>row.status==="pending").map((row:Row)=>`Pending ${row.report_type}`);
        if(pending.length) day.exceptions=[day.exceptions,...pending].filter(Boolean).join("; ");
        return day;
      })}));
      if(!sheets.length) sheets.push({name:"Report status",employee:"No published staff days or calculated results",outlet,month,period:{start,end,draft,generatedAt},days:dates.map(value=>({date:value,day:dayLabel(value),outlet,event:"No records"}))});
      files.push({name:`People Workbook - ${filePart(outlet)} - ${start} to ${end}${draft ? " - Draft" : ""}.xlsx`,content:buildPeopleWorkbook(sheets)});
    }
    const multiple=files.length>1,output=multiple ? buildZipArchive(files) : files[0].content,name=multiple ? `People Workbooks - ${start} to ${end}.zip` : files[0].name;
    return new NextResponse(new Uint8Array(output),{headers:{"content-type":multiple ? "application/zip" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet","content-disposition":`attachment; filename="${name.replace(/[^\x20-\x7e]/g,"_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,"cache-control":"private, no-store"}});
  } catch(error) {
    logServerError(error,{source:"api.attendance.export"});
    return NextResponse.json({ok:false,message:"Attendance workbook could not be generated."},{status:500});
  }
}
