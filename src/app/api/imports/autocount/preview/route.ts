import { NextResponse } from "next/server";
import { z } from "zod";
import { analyzeAutoCountFiles, formatAutoCountInfrastructureError } from "@/lib/imports/autocount";
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
  if (branchError || !branches) return NextResponse.json({ ok: false, message: "Branch references are temporarily unavailable. Retry this import; no OMS records were changed." }, { status: 503 });

  // Version the analysis identity so files staged under older validation
  // semantics are never silently reused after an importer rule correction.
  const contentHash = `autocount-v2:${parsed.data.files.map((file) => file.hash).sort().join(":")}`;
  const analysis = analyzeAutoCountFiles(parsed.data.files, branches.map((branch) => branch.branch_code));
  // One transaction stages every file and row; retry retains the same job identity.
  const { data, error } = await supabase.rpc("stage_autocount_import_job", {
    p_content_hash: contentHash,
    p_files: parsed.data.files.map((file) => ({
      file_name: file.name, file_type: file.type, content_hash: file.hash,
      row_count: file.rows.length, headers: file.headers,
    })) as Json,
    p_rows: analysis.rows.map((row) => ({
      entity_type: row.entityType, business_key: row.businessKey,
      source_file: row.sourceFile, source_row: row.sourceRow,
      normalized: row.normalized, warnings: row.warnings,
    })) as Json,
    p_summary: analysis.summary as unknown as Json,
    p_blocking_issues: analysis.blockingIssues as Json,
  });
  if (error || !data) {
    const failure = formatAutoCountInfrastructureError(error ?? "Could not prepare the import.");
    return NextResponse.json({ ok: false, message: failure.message, setupRequired: failure.setupRequired }, { status: failure.setupRequired ? 503 : 409 });
  }
  const staged = data as { jobId: string; status: string; summary: Json; blockingIssues: string[]; reused: boolean };
  return NextResponse.json({ ok: true, ...staged, issueDetails: analysis.issueDetails, warnings: analysis.warnings });
}
