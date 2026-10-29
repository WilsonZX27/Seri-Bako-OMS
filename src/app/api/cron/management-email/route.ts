import { managementEmailConfig } from "@/lib/branding/management-email-config";
import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { looseSupabase } from "@/lib/supabase/loose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const managementRoles = new Set(["super_admin", "manager", "people_operations"]);

function malaysiaDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kuala_Lumpur", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
function plusDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
function digestKey(date: string, staffId: string) {
  return createHash("sha256").update(`management-digest:v1:${date}:${staffId}`).digest("hex");
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "Email provider is not configured" }, { status: 503 });
  const config=managementEmailConfig(process.env);
  if(!config)return NextResponse.json({error:"Company email configuration is incomplete"},{status:503});
  const {sender,baseUrl,pilotRecipient,companyId,brand}=config;
  const db = looseSupabase(createAdminClient());
  const today = malaysiaDate();
  const staffResult=await db.from("staffs").select("id,company_id,email,status,deleted_at").eq("company_id",companyId).eq("status","active").is("deleted_at",null).limit(2000);
  if(staffResult.error)return NextResponse.json({error:"Notification data unavailable"},{status:503});
  const recipients=((staffResult.data??[]) as Array<{id:string;company_id:string;email:string}>).filter(row=>row.company_id===companyId&&row.email?.trim().toLowerCase()===pilotRecipient);
  if(!recipients.length)return NextResponse.json({date:today,sent:0,failed:0,skipped:0});
  const [assignmentsResult, rolesResult, weeksResult, documentsResult, recordsResult, typesResult, branchesResult] = await Promise.all([
    db.from("staff_roles").select("staff_id,role_id,is_primary,effective_from,effective_to").in("staff_id",recipients.map(row=>row.id)).eq("is_primary",true).limit(2000),
    db.from("roles").select("id,role_code").or(`company_id.eq.${companyId},company_id.is.null`).eq("status","active").is("deleted_at",null).limit(200),
    db.from("schedule_weeks").select("id,company_id,branch_id,week_start,status").eq("company_id",companyId).eq("status","submitted").gte("week_start",plusDays(today,-14)).limit(2000),
    db.from("documents").select("id,company_id,document_no,title,approval_status").eq("company_id",companyId).eq("approval_status","pending").limit(2000),
    db.from("compliance_records").select("id,company_id,branch_id,compliance_type_id,subject_kind,expires_on,review_status").eq("company_id",companyId).eq("subject_kind","outlet").is("deleted_at",null).gte("expires_on",plusDays(today,-30)).lte("expires_on",plusDays(today,30)).limit(2000),
    db.from("compliance_types").select("id,type_name").eq("company_id",companyId).limit(2000),
    db.from("branches").select("id,branch_name").eq("company_id",companyId).limit(2000),
  ]);
  for (const result of [assignmentsResult, rolesResult, weeksResult, documentsResult, recordsResult, typesResult, branchesResult]) {
    if (result.error) return NextResponse.json({ error: "Notification data unavailable" }, { status: 503 });
  }
  const roles = new Map<string, string>(((rolesResult.data ?? []) as Array<{ id: string; role_code: string }>).map((role: { id: string; role_code: string }) => [role.id, role.role_code]));
  const roleByStaff = new Map<string, string>();
  for (const assignment of (assignmentsResult.data ?? []) as Array<{ staff_id: string; role_id: string; effective_from: string | null; effective_to: string | null }>) {
    if ((!assignment.effective_from || assignment.effective_from <= today) && (!assignment.effective_to || assignment.effective_to >= today)) roleByStaff.set(assignment.staff_id, roles.get(assignment.role_id) ?? "");
  }
  const types = new Map<string, string>(((typesResult.data ?? []) as Array<{ id: string; type_name: string }>).map((type: { id: string; type_name: string }) => [type.id, type.type_name]));
  const branches = new Map<string, string>(((branchesResult.data ?? []) as Array<{ id: string; branch_name: string }>).map((branch: { id: string; branch_name: string }) => [branch.id, branch.branch_name]));
  let sent = 0;
  let failed = 0;
  let skipped = 0;
  for (const staff of recipients) {
    if (staff.email?.trim().toLowerCase() !== pilotRecipient || !managementRoles.has(roleByStaff.get(staff.id) ?? "")) continue;
    const weeks = ((weeksResult.data ?? []) as Array<{ company_id: string; branch_id: string; week_start: string }>).filter((week) => week.company_id === staff.company_id);
    const documents = ((documentsResult.data ?? []) as Array<{ company_id: string; document_no: string; title: string }>).filter((document) => document.company_id === staff.company_id);
    const records = ((recordsResult.data ?? []) as Array<{ company_id: string; branch_id: string; compliance_type_id: string; expires_on: string; review_status: string }>).filter((record) => record.company_id === staff.company_id && record.expires_on);
    if (!weeks.length && !documents.length && !records.length) continue;
    const lines = [
      `${brand} management actions · ${today}`,
      "",
      ...documents.slice(0, 25).map((document) => `Action awaiting review: ${document.document_no} · ${document.title}`),
      ...weeks.slice(0, 25).map((week) => `Schedule awaiting review: ${branches.get(week.branch_id) ?? "Outlet"} · week ${week.week_start}`),
      ...records.slice(0, 25).map((record) => `Compliance ${record.expires_on < today ? "expired" : "due"}: ${types.get(record.compliance_type_id) ?? "Requirement"} · ${branches.get(record.branch_id) ?? "Outlet"} · ${record.expires_on}`),
      "",
      `Open dashboard: ${baseUrl}/dashboard`,
    ];
    const key = digestKey(today, staff.id);
    const claim = await db.from("management_email_dispatches").insert({ dedupe_key: key, company_id: staff.company_id, staff_id: staff.id, recipient_email: staff.email.trim().toLowerCase() });
    if ((claim.error as { code?: string } | null)?.code === "23505") { skipped++; continue; }
    if (claim.error) { failed++; continue; }
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "Idempotency-Key": key },
        body: JSON.stringify({ from: sender, to: [staff.email.trim()], subject: `${brand} · ${weeks.length + documents.length + records.length} management actions`, text: lines.join("\n") }),
        signal: AbortSignal.timeout(12000),
      });
      const payload = await response.json() as { id?: string; message?: string };
      if (!response.ok || !payload.id) throw new Error(payload.message ?? `Email provider returned ${response.status}`);
      await db.from("management_email_dispatches").update({ status: "sent", provider_id: payload.id, sent_at: new Date().toISOString() }).eq("dedupe_key", key);
      sent++;
    } catch (error) {
      await db.from("management_email_dispatches").update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed" }).eq("dedupe_key", key);
      failed++;
    }
  }
  return NextResponse.json({ date: today, sent, failed, skipped }, { status: failed ? 503 : 200 });
}
