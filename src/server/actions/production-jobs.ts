"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { productionJobSchema } from "@/lib/validations/production-job";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { getCurrentProfile } from "@/server/queries/common";
import { logServerError } from "@/server/observability/logger";
import { z } from "zod";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function notifyProduction(input: { title: string; message: string; permission: string; jobId: string; branchId: string; priority?: string }) {
  if (isMockMode()) return;
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const db = looseSupabase(supabase);
  const { data: permissionRows, error: permissionError } = await supabase.from("permissions").select("id").eq("permission_code", input.permission);
  if (permissionError || !permissionRows?.length) return;
  const { data: rolePermissions, error: rolePermissionError } = await db.from("role_permissions").select("role_id").in("permission_id", permissionRows.map((row) => row.id));
  if (rolePermissionError || !rolePermissions?.length) return;
  const rolePermissionRows = rolePermissions as Array<{ role_id: string }>;
  const { data: roles } = await db.from("roles").select("id").in("id", rolePermissionRows.map((row) => row.role_id));
  const roleIds = ((roles ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (!roleIds.length) return;

  const { error } = await db.from("notifications").insert(
    roleIds.map((roleId: string) => ({
      company_id: profile?.company_id ?? null,
      recipient_role_id: roleId,
      branch_id: input.branchId,
      title: input.title,
      message: input.message,
      action_url: `/production/jobs/${input.jobId}`,
      priority: input.priority ?? "normal",
      entity_type: "production_job",
      entity_id: input.jobId,
      created_by: profile?.id ?? null,
    })),
  );
  if (error) logServerError(error, { source: "productionJobs.notifyProduction" });
}

export async function createProductionJob(formData: FormData) {
  await requirePermissionOrRedirect("production.create", "/production/jobs/new");
  try {
    if (isMockMode()) redirect("/production/jobs");
    const parsed = productionJobSchema.parse({
      production_date: formData.get("production_date"),
      branch_id: formData.get("branch_id"),
      recipe_id: formData.get("recipe_id"),
      planned_output_qty: formData.get("planned_output_qty"),
      output_uom: formData.get("output_uom"),
      priority: formData.get("priority") || "normal",
      remarks: cleanText(formData.get("remarks")),
    });
    const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
    const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
    const jobNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "production_job", enteredNumber: null });
    const { data, error } = await supabase.rpc("create_production_job_atomic", {
      p_payload: { ...parsed, production_job_no: jobNo, idempotency_key: idempotencyKey },
    });
    if (error) throw new Error(error.message);
    const createdJob = data as { id: string };
    revalidatePath("/production");
    revalidatePath("/production/jobs");
    safeRedirectWithMessage(`/production/jobs/${createdJob.id}`, "success", `${jobNo} created. Draft has no stock impact.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/production/jobs/new", "error", formatActionError(error, "Could not create this production job."));
  }
}

async function transitionProductionJob(id: string, input: { action: "submit" | "approve" | "reject" | "cancel"; permission: string; message: (jobNo: string) => string; remarks?: string | null; notify?: { permission: string; title: (jobNo: string) => string; message: (jobNo: string) => string } }) {
  await requirePermissionOrRedirect(input.permission, `/production/jobs/${id}`);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("transition_production_job_atomic", { p_job_id: id, p_action: input.action, p_remarks: input.remarks ?? null });
    if (error) throw new Error(error.message);
    const productionJob = data as { production_job_no: string; branch_id: string; priority: string | null };
    if (input.notify) {
      await notifyProduction({
        title: input.notify.title(productionJob.production_job_no),
        message: input.notify.message(productionJob.production_job_no),
        permission: input.notify.permission,
        jobId: id,
        branchId: productionJob.branch_id,
        priority: productionJob.priority ?? "normal",
      });
    }
    revalidateWorkspaceState(["/production", "/production/jobs", `/production/jobs/${id}`]);
    safeRedirectWithMessage(`/production/jobs/${id}`, "success", input.message(productionJob.production_job_no));
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/production/jobs/${id}`, "error", formatActionError(error, "Could not update this production job."));
  }
}

export async function submitProductionJob(id: string) {
  await transitionProductionJob(id, {
    action: "submit",
    permission: "production.submit",
    message: (jobNo) => `${jobNo} submitted for approval.`,
    notify: {
      permission: "production.approve",
      title: () => "Production approval required",
      message: (jobNo) => `${jobNo} requires production approval.`,
    },
  });
}

export async function approveProductionJob(id: string) {
  await transitionProductionJob(id, {
    action: "approve",
    permission: "production.approve",
    message: (jobNo) => `${jobNo} approved. Ready to post production.`,
    notify: {
      permission: "production.post",
      title: () => "Production ready to post",
      message: (jobNo) => `${jobNo} is approved and ready to post.`,
    },
  });
}

export async function rejectProductionJob(id: string, formData: FormData) {
  const remarks = cleanText(formData.get("remarks"));
  if (!remarks) safeRedirectWithMessage(`/production/jobs/${id}`, "error", "Rejection remarks are required.");
  await transitionProductionJob(id, {
    action: "reject",
    permission: "production.reject",
    remarks,
    message: (jobNo) => `${jobNo} rejected. ${remarks}`,
  });
}

export async function cancelProductionJob(id: string) {
  await transitionProductionJob(id, {
    action: "cancel",
    permission: "production.cancel",
    message: (jobNo) => `${jobNo} cancelled. No stock movement was posted.`,
  });
}

export async function postProductionJob(id: string) {
  await requirePermissionOrRedirect("production.post", `/production/jobs/${id}`);
  try {
    if (isMockMode()) redirect(`/production/jobs/${id}`);
    const supabase = await createClient();
    const { error } = await supabase.rpc("post_production_job_atomic", { p_job_id: id });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState(["/production", "/production/jobs", `/production/jobs/${id}`]);
    revalidatePath("/inventory");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-card");
    safeRedirectWithMessage(`/production/jobs/${id}`, "success", "Production job posted atomically.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/production/jobs/${id}`, "error", formatActionError(error, "Could not post this production job."));
  }
}
