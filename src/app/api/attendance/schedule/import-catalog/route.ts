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
    const staffIds = new Set<string>(), staff: Array<{ id: string; name: string; branch_id: string; home_branch_id?: string | null; eligibility?: Array<{ from: string; to: string | null }> }> = [];
    const staffResults = await Promise.all(branches.map(async (branch) => {
      const staffResult = await db.rpc("get_schedule_staff", { p_branch_id: branch.id, p_week_id: latest.get(branch.id)?.id ?? null });
      if (staffResult.error) throw staffResult.error;
      return { branchId: branch.id, people: (staffResult.data ?? []) as Array<{ id: string; full_name: string }> };
    }));
    for (const result of staffResults) for (const person of result.people) { staffIds.add(person.id); staff.push({ id: person.id, name: person.full_name, branch_id: result.branchId }); }
    const homeResult = staffIds.size ? await db.from("staffs").select("id,default_branch_id").in("id", [...staffIds]) : { data: [], error: null };
    if (homeResult.error) throw homeResult.error;
    const homeByStaff = new Map(((homeResult.data ?? []) as Array<{ id: string; default_branch_id: string | null }>).map((person) => [person.id, person.default_branch_id]));
    const roleResult = staffIds.size ? await db.from("staff_roles").select("staff_id,effective_from,effective_to,is_primary,roles(role_code)").in("staff_id", [...staffIds]).eq("is_primary", true) : { data: [], error: null };
    if (roleResult.error) throw roleResult.error;
    const eligibilityByStaff = new Map<string, Array<{ from: string; to: string | null }>>();
    for (const row of (roleResult.data ?? []) as Array<{ staff_id: string; effective_from: string; effective_to: string | null; roles: { role_code?: string } | Array<{ role_code?: string }> | null }>) {
      const role = Array.isArray(row.roles) ? row.roles[0]?.role_code : row.roles?.role_code;
      if (!role || !["outlet_staff", "outlet_supervisor"].includes(role)) continue;
      eligibilityByStaff.set(row.staff_id, [...(eligibilityByStaff.get(row.staff_id) ?? []), { from: row.effective_from, to: row.effective_to }]);
    }
    const branchForWeek = new Map([...latest].map(([branchId, row]) => [row.id, branchId]));
    return NextResponse.json({
      branches: branches.map((branch) => ({ id: branch.id, name: branch.branch_name, status: latest.get(branch.id)?.status ?? "not_started" })),
      staff: staff.map((person) => ({ ...person, home_branch_id: homeByStaff.get(person.id) ?? null, eligibility: eligibilityByStaff.get(person.id) ?? [] })),
      current_assignments: (assignmentResult.data ?? []).map((row: Record<string, unknown>) => ({ ...row, branch_id: branchForWeek.get(String(row.schedule_week_id)) })),
    });
  } catch (error) {
    logServerError(error, { source: "api.attendance.schedule.import-catalog" });
    return NextResponse.json({ ok: false, message: "Schedule import catalog could not be prepared." }, { status: 500 });
  }
}
