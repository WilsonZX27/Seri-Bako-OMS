import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { hasPermission } from "@/server/auth/permissions";
export async function GET(request:Request) {
 try {
  if(!await hasPermission("attendance.sensitive.export"))return NextResponse.json({message:"Export permission is required."},{status:403});
  const week=new URL(request.url).searchParams.get("week") ?? "",date=new Date(`${week}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(week)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==week||date.getUTCDay()!==1)return NextResponse.json({message:"Choose a Monday."},{status:400});
  const monthMode=new URL(request.url).searchParams.get("period")==="month";
  let start=week,end:string;
  if(monthMode){start=week.slice(0,7)+"-01";const value=new Date(`${start}T00:00:00Z`);value.setUTCMonth(value.getUTCMonth()+1);value.setUTCDate(0);end=value.toISOString().slice(0,10);}else{date.setUTCDate(date.getUTCDate()+6);end=date.toISOString().slice(0,10);}
  const expectedWeeks=new Set<string>();for(let cursor=new Date(`${start}T00:00:00Z`);cursor.toISOString().slice(0,10)<=end;cursor.setUTCDate(cursor.getUTCDate()+1)){const monday=new Date(cursor);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));expectedWeeks.add(monday.toISOString().slice(0,10));}
  const db=looseSupabase(await createClient());
  const [branches,locks,reports]=await Promise.all([db.from("branches").select("id,branch_name").in("branch_type",["outlet","central_kitchen"]).eq("status","active").is("deleted_at",null).order("branch_name"),db.from("attendance_period_locks").select("branch_id,week_start").gte("week_start",[...expectedWeeks].sort()[0]).lte("week_start",end).is("unlocked_at",null),db.from("daily_attendance_reports").select("branch_id").gte("work_date",start).lte("work_date",end).eq("status","pending")]);
  if([branches,locks,reports].some(result=>result.error))return NextResponse.json({message:"Week status is unavailable."},{status:500});
  return NextResponse.json({outlets:(branches.data??[]).map(branch=>({id:branch.id,name:branch.branch_name,closed:[...expectedWeeks].every(value=>(locks.data??[]).some(row=>row.week_start===value && (row.branch_id===null || row.branch_id===branch.id))),pending:(reports.data??[]).filter(row=>row.branch_id===branch.id).length}))},{headers:{"cache-control":"private, no-store"}});
 } catch { return NextResponse.json({message:"Week status is unavailable."},{status:500}); }
}
