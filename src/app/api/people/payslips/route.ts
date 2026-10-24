import { readPaidEmergencyLeaveCapability } from "@/server/queries/schedule-leave-capabilities";
import { payrollLineSchema } from "@/lib/validations/payroll-line";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("calculate"), confirmation: z.string().uuid(), lines: z.array(payrollLineSchema).min(1).max(50) }),
  z.object({ action: z.enum(["approve", "release"]), id: z.string().uuid(), version: z.number().int().positive() }),
]);
const headers = { "cache-control": "private, no-store" };
export async function GET() {
  try {
    await requireActiveTenantActor();
    const db = looseSupabase(await createClient());
    const [access, slips] = await Promise.all([
      db.rpc("attestation_people", { p_permission: "payroll.payslip.manage" }),
      db.from("employee_payslips").select("id,confirmation_id,version,currency,earnings,deductions,detail,state,released_at,attendance_confirmations(period_start,period_end,staffs:staffs!attendance_confirmations_staff_id_fkey(full_name))").order("calculated_at", { ascending: false }).limit(200),
    ]);
    if (access.error || slips.error) return NextResponse.json({ message: "Payslips are unavailable. Please retry later." }, { status: 503, headers });
    // RLS gives non-People actors only their own released payslips. No service key.
    return NextResponse.json({ people: access.data === true, items: slips.data ?? [] }, { headers });
  } catch { return NextResponse.json({ message: "An active employee session is required." }, { status: 403, headers }); }
}
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json") || (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403, headers });
  try {
    await requireActiveTenantActor();
    const input = command.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ message: "Check the payroll lines and amounts." }, { status: 400, headers });
    const db = looseSupabase(await createClient()), value = input.data;
    const access = await db.rpc("attestation_people", { p_permission: "payroll.payslip.manage" });
    if (access.error || access.data !== true) return NextResponse.json({ message: "People payroll access is required." }, { status: 403, headers });
    if (value.action === "calculate" && value.lines.some(line=>line.source_kind && line.source_kind !== "manual") && !await readPaidEmergencyLeaveCapability(db)) return NextResponse.json({message:"Paid-leave payroll protection is not active. No calculation was saved."},{status:409,headers});
    const result = value.action === "calculate"
      ? await db.rpc("save_employee_payslip", { p_confirmation: value.confirmation, p_lines: value.lines })
      : await db.rpc("advance_employee_payslip", { p_id: value.id, p_version: value.version, p_action: value.action });
    if (result.error) return NextResponse.json({ message: "The version or approval sequence changed. Refresh and review before continuing." }, { status: 409, headers });
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ message: "The payslip request could not be completed." }, { status: 403, headers }); }
}
