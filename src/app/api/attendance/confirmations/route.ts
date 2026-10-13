import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("prepare"), staff: z.string().uuid(), start: z.string().date(), end: z.string().date() }),
  z.object({ action: z.enum(["check", "dispute", "verify", "approve"]), id: z.string().uuid(), hash: z.string().regex(/^[a-f0-9]{64}$/), branch: z.string().uuid().optional(), reason: z.string().trim().max(1000).optional() }),
]);
const headers = { "cache-control": "private, no-store" };
export async function GET(request: Request) {
  const offset = Number(request ? new URL(request.url).searchParams.get("offset") ?? 0 : 0);
  if (!Number.isSafeInteger(offset) || offset < 0 || offset > 100000) return NextResponse.json({ message: "Invalid page." }, { status: 400, headers });
  try {
    await requireActiveTenantActor();
    const db = looseSupabase(await createClient());
    const [items, people, supervisor, manager] = await Promise.all([
      db.rpc("get_attendance_confirmations", { p_offset: offset }), db.rpc("attestation_people", { p_permission: "attendance.confirmation.prepare" }),
      db.rpc("attestation_role", { p_role: "outlet_supervisor" }), db.rpc("attestation_role", { p_role: "manager" }),
    ]);
    if ([items, people, supervisor, manager].some(result => result.error)) return NextResponse.json({ message: "Attendance confirmation is unavailable. Please retry later." }, { status: 503, headers });
    let employees: unknown[] = [];
    if (people.data === true) {
      const result = await db.from("staffs").select("id,full_name,staff_code").eq("status", "active").is("deleted_at", null).order("full_name").limit(1000);
      if (result.error) throw result.error;
      employees = result.data ?? [];
    }
    return NextResponse.json({ items: items.data, employees, people: people.data === true, supervisor: supervisor.data === true, manager: manager.data === true }, { headers });
  } catch {
    return NextResponse.json({ message: "An active employee session is required." }, { status: 403, headers });
  }
}
export async function POST(request: Request) {
  if (!request.headers.get("content-type")?.includes("application/json") || (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin)) return NextResponse.json({ message: "Invalid request origin." }, { status: 403, headers });
  try {
    await requireActiveTenantActor();
    const input = command.safeParse(await request.json());
    if (!input.success) return NextResponse.json({ message: "Check the attendance request." }, { status: 400, headers });
    const db = looseSupabase(await createClient()), value = input.data;
    const result = value.action === "prepare"
      ? await db.rpc("prepare_attendance_confirmation", { p_staff: value.staff, p_start: value.start, p_end: value.end })
      : await db.rpc("review_attendance_confirmation", { p_id: value.id, p_hash: value.hash, p_action: value.action, p_branch: value.branch ?? null, p_reason: value.reason ?? null });
    if (result.error) {
      const denied = (result.error as { code?: string }).code === "42501";
      return NextResponse.json({ message: denied ? "This step is outside your review scope or sequence." : "Attendance changed or is not ready. Refresh and review the current version." }, { status: denied ? 403 : 409, headers });
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch { return NextResponse.json({ message: "The attendance request could not be completed." }, { status: 403, headers }); }
}
