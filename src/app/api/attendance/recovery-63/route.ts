import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { logServerError } from "@/server/observability/logger";

const input = z.object({ snapshot: z.string().regex(/^[a-f0-9]{32}$/) }).strict();
async function run(snapshot: string | null) {
  if (process.env.OMS_PERSON63_RECOVERY !== "fixed-25-v1") {
    return NextResponse.json({ ok: false, message: "Recovery is disabled." }, { status: 503 });
  }
  try {
    const actor = await requireActiveTenantActor();
    if (actor.companyId !== "3b104582-f8cb-4a4d-867f-b99e5ffc6486" ||
      !(await hasPermission("attendance.map")) ||
      (!(await hasPermission("attendance.import")) && !(await hasPermission("attendance.adjust")))) {
      return NextResponse.json({ ok: false, message: "Recovery is not authorised." }, { status: 403 });
    }
    const db = looseSupabase(await createClient());
    const { data, error } = await db.rpc("recover_attendance_person63", { p_expected_snapshot: snapshot });
    if (error) {
      logServerError(error, { source: "api.attendance.recovery-63" });
      const code = "code" in error && typeof error.code === "string" ? error.code : null;
      const status = code === "42501" ? 403 : code === "P0001" ? 409 : 503;
      return NextResponse.json({ ok: false, message: status === 403 ? "Recovery is not authorised." :
        status === 409 ? "Recovery conditions changed. Refresh the preflight and review the result." :
        "Recovery result is not confirmed. Check its receipt before retrying." }, { status });
    }
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    logServerError(error, { source: "api.attendance.recovery-63" });
    return NextResponse.json({ ok: false, message: "Recovery result is not confirmed. Check its receipt before retrying." }, { status: 503 });
  }
}
export async function GET() { return run(null); }
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: "A reviewed recovery snapshot is required." }, { status: 400 });
  return run(parsed.data.snapshot);
}
