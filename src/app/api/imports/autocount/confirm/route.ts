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
  const { data: job, error: jobError } = await supabase.from("autocount_import_jobs").select("status, summary, file_count").eq("id", parsed.data.jobId).maybeSingle();
  if (jobError) {
    const failure = formatAutoCountInfrastructureError(jobError);
    return NextResponse.json({ ok: false, message: failure.message, setupRequired: failure.setupRequired }, { status: failure.setupRequired ? 503 : 409 });
  }
  if (job?.status === "completed") return NextResponse.json({ ok: true, result: {}, alreadyCompleted: true });
  const summary = job?.summary as { stagingVersion?: number; stagedRows?: number } | null;
  if (!job || job.status !== "ready" || summary?.stagingVersion !== 1 || !Number.isInteger(summary.stagedRows)) {
    return NextResponse.json({ ok: false, message: "This preview is incomplete or from an older upload. Select the same files and review again before confirming." }, { status: 409 });
  }
  const [files, rows] = await Promise.all([
    supabase.from("autocount_import_files").select("id", { count: "exact", head: true }).eq("job_id", parsed.data.jobId),
    supabase.from("autocount_import_rows").select("id", { count: "exact", head: true }).eq("job_id", parsed.data.jobId),
  ]);
  if (files.error || rows.error || files.count !== job.file_count || rows.count !== summary.stagedRows) {
    return NextResponse.json({ ok: false, message: "The saved preview is incomplete. Select the same files and review again; confirmation has not run." }, { status: 409 });
  }
  // The RPC repeats integrity checks under the job lock before applying anything.
  const { data, error } = await supabase.rpc("apply_autocount_import_job", { p_job_id: parsed.data.jobId });
  if (error) {
    const failure = formatAutoCountInfrastructureError(error);
    // Keep the staged job ready after a failed RPC. Setup/transient failures are
    // retryable and must not force the user to re-upload the same workbooks.
    return NextResponse.json({ ok: false, message: failure.message, setupRequired: failure.setupRequired }, { status: failure.setupRequired ? 503 : 409 });
  }
  ["/imports", "/imports/autocount", "/items", "/suppliers", "/supplier-items", "/uom-conversions"].forEach((path) => revalidatePath(path));
  return NextResponse.json({ ok: true, result: data });
}
