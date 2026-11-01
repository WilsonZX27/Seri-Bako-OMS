import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { payslipExportSnapshot } from "@/lib/attendance/payslip-export";
import { buildPayslipWorkbook } from "@/lib/attendance/payslip-workbook";
import { buildPayslipPdf } from "@/lib/attendance/payslip-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ id: z.string().uuid(), version: z.coerce.number().int().positive(), format: z.enum(["xlsx", "pdf"]) });
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
export async function GET(request: Request) {
  const url = new URL(request.url), input = schema.safeParse(Object.fromEntries(url.searchParams));
  if (!input.success) return NextResponse.json({ message: "Choose a payslip, its current version and an export format." }, { status: 400, headers });
  let actor;
  try { actor = await requireActiveTenantActor(); }
  catch { return NextResponse.json({ message: "An active employee session is required." }, { status: 403, headers }); }
  try {
    const db = looseSupabase(await createClient());
    const access = await db.rpc("attestation_people", { p_permission: "payroll.payslip.manage" });
    if (access.error || typeof access.data !== "boolean") return NextResponse.json({ message: "Payslip access could not be verified. Please retry." }, { status: 503, headers });
    // Session client + existing RLS; never a service client or client-supplied staff/company filter.
    let query = db.from("employee_payslips").select("id,company_id,staff_id,confirmation_id,version,currency,earnings,deductions,detail,state,approved_at,released_at,attendance_confirmations(id,company_id,staff_id,period_start,period_end,state,attendance,staffs:staffs!attendance_confirmations_staff_id_fkey(full_name,staff_code))").eq("company_id", actor.companyId).eq("id", input.data.id);
    if (!access.data) query = query.eq("staff_id", actor.staffId).eq("state", "released");
    const result = await query.maybeSingle();
    if (result.error) return NextResponse.json({ message: "Payslip export is unavailable. Please retry." }, { status: 503, headers });
    const row = result.data;
    if (!row || row.company_id !== actor.companyId || (!access.data && (row.staff_id !== actor.staffId || row.state !== "released"))) return NextResponse.json({ message: "Payslip unavailable." }, { status: 404, headers });
    if (row.version !== input.data.version || !["draft", "approved", "released"].includes(String(row.state))) return NextResponse.json({ message: "The payslip version or state changed. Refresh before exporting." }, { status: 409, headers });
    let slip;
    try { slip = payslipExportSnapshot(row, new Date().toISOString()); }
    catch { return NextResponse.json({ message: "The monetary or attendance snapshot needs review before export." }, { status: 409, headers }); }
    const bytes = input.data.format === "xlsx" ? buildPayslipWorkbook(slip) : await buildPayslipPdf(slip);
    const name = `Payslip-${slip.id}-v${slip.version}-${slip.state}.${input.data.format}`;
    return new NextResponse(new Uint8Array(bytes), { headers: { ...headers, "content-type": input.data.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${name}"` } });
  } catch { return NextResponse.json({ message: "Payslip export could not be completed. Please retry." }, { status: 503, headers }); }
}
