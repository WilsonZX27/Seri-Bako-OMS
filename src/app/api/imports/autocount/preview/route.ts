import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeAutoCountFiles } from "@/lib/imports/autocount";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import type { Json } from "@/types/database";

const fileSchema = z.object({
  name: z.string().min(1).max(255),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
  type: z.enum(["supplier_list", "item_list", "location_snapshot"]),
  headers: z.array(z.string().max(100)).min(1).max(40),
  rows: z.array(z.record(z.string(), z.string())).max(5000),
});
const requestSchema = z.object({ files: z.array(fileSchema).min(1).max(20) });

export async function POST(request: Request) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Invalid AutoCount file payload." }, { status: 400 });
  if (!(await hasPermission("imports.create"))) return NextResponse.json({ ok: false, message: "Permission required." }, { status: 403 });
  const profile = await getCurrentProfile();
  if (!profile?.company_id || !("status" in profile) || profile.status !== "active") {
    return NextResponse.json({ ok: false, message: "An active staff account is required." }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: branches, error: branchError } = await supabase.from("branches").select("branch_code").eq("company_id", profile.company_id).eq("status", "active").is("deleted_at", null);
  if (branchError || !branches) return NextResponse.json({ ok: false, message: "Branch references are temporarily unavailable." }, { status: 503 });

  const contentHash = parsed.data.files.map((file) => file.hash).sort().join(":");
  const { data: existing } = await supabase.from("autocount_import_jobs").select("id, status, summary, blocking_issues").eq("company_id", profile.company_id).eq("content_hash", contentHash).in("status", ["staging", "ready", "completed"]).maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: true, reused: true, jobId: existing.id, status: existing.status, summary: existing.summary, blockingIssues: existing.blocking_issues, warnings: [] });
  }

  const analysis = analyzeAutoCountFiles(parsed.data.files, branches.map((branch) => branch.branch_code));
  const status = analysis.blockingIssues.length ? "staging" : "ready";
  const { data: job, error: jobError } = await supabase.from("autocount_import_jobs").insert({
    company_id: profile.company_id,
    status,
    content_hash: contentHash,
    file_count: parsed.data.files.length,
    summary: analysis.summary as unknown as Json,
    blocking_issues: analysis.blockingIssues as unknown as Json,
    created_by: profile.id,
  }).select("id").single();
  if (jobError || !job) return NextResponse.json({ ok: false, message: jobError?.message ?? "Could not create the import job." }, { status: 500 });

  const fileRows = parsed.data.files.map((file) => ({
    job_id: job.id, company_id: profile.company_id, file_name: file.name, file_type: file.type,
    content_hash: file.hash, row_count: file.rows.length, headers: file.headers as unknown as Json,
  }));
  const { error: fileError } = await supabase.from("autocount_import_files").insert(fileRows);
  if (fileError) return NextResponse.json({ ok: false, jobId: job.id, message: fileError.message }, { status: 500 });

  for (let start = 0; start < analysis.rows.length; start += 500) {
    const rows = analysis.rows.slice(start, start + 500).map((row) => ({
      job_id: job.id, company_id: profile.company_id, entity_type: row.entityType, business_key: row.businessKey,
      source_file: row.sourceFile, source_row: row.sourceRow, normalized: row.normalized as unknown as Json, warnings: row.warnings as unknown as Json,
    }));
    const { error } = await supabase.from("autocount_import_rows").insert(rows);
    if (error) return NextResponse.json({ ok: false, jobId: job.id, message: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reused: false, jobId: job.id, status, summary: analysis.summary, blockingIssues: analysis.blockingIssues, warnings: analysis.warnings });
}
