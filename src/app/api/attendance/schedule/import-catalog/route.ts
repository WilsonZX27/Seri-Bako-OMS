import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function GET(request: Request) {
  try {
    const week = weekSchema.safeParse(new URL(request.url).searchParams.get("week"));
    if (!week.success) return NextResponse.json({ ok: false, message: "A valid Monday week is required." }, { status: 400 });
    await requireActiveTenantActor();
    if (!(await hasPermission("schedule.draft"))) return NextResponse.json({ ok: false, message: "You do not have permission to prepare schedule imports." }, { status: 403 });
    const db = looseSupabase(await createClient());
    const branchResult = await db.rpc("get_schedule_branches");
    if (branchResult.error) throw branchResult.error;
    const branches = (branchResult.data ?? []) as Array<{ id: string; branch_name: string }>;
    const weekResult = branches.length ? await db.from("schedule_weeks").select("id,branch_id,status,revision").eq("week_start", week.data).in("branch_id", branches.map((branch) => branch.id)).order("revision", { ascending: false }) : { data: [], error: null };
    if (weekResult.error) throw weekResult.error;
    const latest = new Map<string, { id: string; status: string }>();
    for (const row of (weekResult.data ?? []) as Array<{ id: string; branch_id: string; status: string }>) if (!latest.has(row.branch_id)) latest.set(row.branch_id, row);
    const weekIds = [...latest.values()].map((row) => row.id);
    const assignmentResult = weekIds.length ? await db.from("shift_assignment_revisions").select("schedule_week_id,staff_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,work_site_label").in("schedule_week_id", weekIds).eq("is_current", true) : { data: [], error: null };
    if (assignmentResult.error) throw assignmentResult.error;
    const staff: Array<{ id: string; name: string; branch_id: string }> = [];
    for (const branch of branches) {
      const staffResult = await db.rpc("get_schedule_staff", { p_branch_id: branch.id, p_week_id: latest.get(branch.id)?.id ?? null });
      if (staffResult.error) throw staffResult.error;
      for (const person of (staffResult.data ?? []) as Array<{ id: string; full_name: string }>) staff.push({ id: person.id, name: person.full_name, branch_id: branch.id });
    }
    const branchForWeek = new Map([...latest].map(([branchId, row]) => [row.id, branchId]));
    return NextResponse.json({
      branches: branches.map((branch) => ({ id: branch.id, name: branch.branch_name, status: latest.get(branch.id)?.status ?? "not_started" })),
      staff,
      current_assignments: (assignmentResult.data ?? []).map((row: Record<string, unknown>) => ({ ...row, branch_id: branchForWeek.get(String(row.schedule_week_id)) })),
    });
  } catch (error) {
    logServerError(error, { source: "api.attendance.schedule.import-catalog" });
    return NextResponse.json({ ok: false, message: "Schedule import catalog could not be prepared." }, { status: 500 });
  }
}
