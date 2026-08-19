import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { formatAutoCountInfrastructureError } from "@/lib/imports/autocount";

const requestSchema = z.object({ jobId: z.string().uuid() });

export async function POST(request: Request) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid AutoCount import job." }, { status: 400 });
  if (!(await hasPermission("imports.create"))) return NextResponse.json({ ok: false, message: "Permission required." }, { status: 403 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_autocount_import_job", { p_job_id: parsed.data.jobId });
  if (error) {
    const failure = formatAutoCountInfrastructureError(error);
    await supabase.from("autocount_import_jobs").update({ status: "failed", summary: { error: failure.message } }).eq("id", parsed.data.jobId).eq("status", "ready");
    return NextResponse.json({ ok: false, message: failure.message, setupRequired: failure.setupRequired }, { status: failure.setupRequired ? 503 : 409 });
  }
  ["/imports", "/imports/autocount", "/items", "/suppliers", "/supplier-items", "/uom-conversions"].forEach((path) => revalidatePath(path));
  return NextResponse.json({ ok: true, result: data });
}
