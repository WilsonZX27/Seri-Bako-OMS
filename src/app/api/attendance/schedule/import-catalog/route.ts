import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const weekSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const addDays = (day: string, amount: number) => {
  const value = new Date(`${day}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
};

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
    const assignmentResult = weekIds.length ? await db.from("shift_assignment_revisions").select("id,schedule_week_id,staff_id,work_date,assignment_kind,shift_template_id,custom_start,custom_end,custom_crosses_midnight,custom_break_seconds,custom_maximum_recognised_seconds,work_site_label,ro_minutes").in("schedule_week_id", weekIds).eq("is_current", true) : { data: [], error: null };
    if (assignmentResult.error) throw assignmentResult.error;
    const staffIds = new Set<string>(), staff: Array<{ id: string; name: string; staff_code: string | null; branch_id: string; home_branch_id?: string | null; eligibility?: Array<{ from: string; to: string | null }> }> = [];
    const staffResults = await Promise.all(branches.map(async (branch) => {
      // Match the roster editor: eligible company staff can work at an authorised
      // destination without granting permanent branch membership or app access.
      // Retain the existing week catalogue for historical staff as well.
      const [staffResult, candidates] = await Promise.all([
        db.rpc("get_schedule_staff", { p_branch_id: branch.id, p_week_id: latest.get(branch.id)?.id ?? null }),
        db.rpc("get_schedule_staff_candidates", { p_branch_id: branch.id }),
      ]);
      if (staffResult.error) throw staffResult.error;
      if (candidates.error) throw candidates.error;
      type Person = { id: string; full_name: string; staff_code: string | null };
      const combined = [...((staffResult.data ?? []) as Person[]), ...((candidates.data ?? []) as Person[])];
      const people = [...new Map(combined.map(person => [person.id, person])).values()];
      return { branchId: branch.id, people };
    }));
    for (const result of staffResults) for (const person of result.people) { staffIds.add(person.id); staff.push({ id: person.id, name: person.full_name, staff_code: person.staff_code, branch_id: result.branchId }); }
    const homeResult = staffIds.size ? await db.from("staffs").select("id,default_branch_id,employment_end_date").in("id", [...staffIds]) : { data: [], error: null };
    if (homeResult.error) throw homeResult.error;
    const homeByStaff = new Map(((homeResult.data ?? []) as Array<{ id: string; default_branch_id: string | null }>).map((person) => [person.id, person.default_branch_id]));
    const employmentEndByStaff = new Map(((homeResult.data ?? []) as Array<{ id: string; employment_end_date: string | null }>).map((person) => [person.id, person.employment_end_date]));
    const roleResult = staffIds.size ? await db.from("staff_roles").select("staff_id,effective_from,effective_to,is_primary,roles(role_code)").in("staff_id", [...staffIds]).eq("is_primary", true) : { data: [], error: null };
    if (roleResult.error) throw roleResult.error;
    const roleRows = (roleResult.data ?? []) as Array<{ staff_id: string; effective_from: string; effective_to: string | null; roles: { role_code?: string } | Array<{ role_code?: string }> | null }>;
    const rolesByStaff = new Map<string, typeof roleRows>();
    for (const row of roleRows) rolesByStaff.set(row.staff_id, [...(rolesByStaff.get(row.staff_id) ?? []), row]);
    const eligibilityByStaff = new Map<string, Array<{ from: string; to: string | null }>>();
    const today = new Date().toISOString().slice(0, 10);
    const days = Array.from({ length: 7 }, (_, index) => addDays(week.data, index));
    for (const staffId of staffIds) {
      const rows = rolesByStaff.get(staffId) ?? [];
      const roleCode = (row: (typeof roleRows)[number]) => Array.isArray(row.roles) ? row.roles[0]?.role_code : row.roles?.role_code;
      const currentSchedulable = rows.some((row) => ["outlet_staff", "outlet_supervisor", "kitchen"].includes(roleCode(row) ?? "") && row.effective_from <= today && (!row.effective_to || row.effective_to >= today));
      const eligibleDays = days.filter((day) => {
        const employmentEnd = employmentEndByStaff.get(staffId);
        if (employmentEnd && day > employmentEnd) return false;
        const covering = rows.filter((row) => row.effective_from <= day && (!row.effective_to || row.effective_to >= day));
        return covering.some((row) => ["outlet_staff", "outlet_supervisor", "kitchen"].includes(roleCode(row) ?? "")) || (day < today && covering.length === 0 && currentSchedulable);
      });
      eligibilityByStaff.set(staffId, eligibleDays.map((day) => ({ from: day, to: day })));
    }
    const branchForWeek = new Map([...latest].map(([branchId, row]) => [row.id, branchId]));
    const history = await db.rpc("get_schedule_workbook_import_history", {p_week_start:week.data});
    if (history.error) throw history.error;
    const [rules,exemptions,owner]=await Promise.all([db.rpc("get_schedule_workbook_rules"),db.rpc("get_staff_fingerprint_exemptions",{p_week_start:week.data}),db.rpc("current_staff_has_company_role",{role_codes:["super_admin"]})]);
    if(rules.error)throw rules.error;
    if(exemptions.error)throw exemptions.error;
    return NextResponse.json({
      import_rules:rules.data??{},fingerprint_exempt_staff:exemptions.data??[],can_manage_exemptions:owner.data===true,
      import_history:history.data ?? [],
      branches: branches.map((branch) => ({ id: branch.id, name: branch.branch_name, status: latest.get(branch.id)?.status ?? "not_started" })),
      staff: staff.map((person) => ({ ...person, home_branch_id: homeByStaff.get(person.id) ?? null, eligibility: eligibilityByStaff.get(person.id) ?? [] })),
      current_assignments: (assignmentResult.data ?? []).map((row: Record<string, unknown>) => ({ ...row, branch_id: branchForWeek.get(String(row.schedule_week_id)) })),
    });
  } catch (error) {
    logServerError(error, { source: "api.attendance.schedule.import-catalog" });
    return NextResponse.json({ ok: false, message: "Schedule import catalog could not be prepared." }, { status: 500 });
  }
}
