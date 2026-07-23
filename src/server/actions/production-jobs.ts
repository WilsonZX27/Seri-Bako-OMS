"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { productionJobSchema } from "@/lib/validations/production-job";
import { writeActivityLog } from "@/server/activity/log";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
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
  if (error) console.error(error);
}

async function updateDocumentStatus(documentId: string | null, status: string, approvalStatus: string, step: string) {
  if (!documentId) return;
  const supabase = await createClient();
  await supabase.from("documents").update({ status: status as never, approval_status: approvalStatus as never, current_step: step, updated_at: new Date().toISOString() }).eq("id", documentId);
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
    const locationId = await resolveDefaultLocation(parsed.branch_id);
    const jobNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "production_job", enteredNumber: null });
    const { data, error } = await supabase.rpc("create_production_job_atomic", {
      p_payload: { ...parsed, production_job_no: jobNo, location_id: locationId, idempotency_key: idempotencyKey },
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

async function transitionProductionJob(id: string, input: { from: string[]; to: string; permission: string; activity: string; message: (jobNo: string) => string; document: { status: string; approval: string; step: string }; notify?: { permission: string; title: (jobNo: string) => string; message: (jobNo: string) => string } }) {
  await requirePermissionOrRedirect(input.permission, `/production/jobs/${id}`);
  try {
    const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
    const db = looseSupabase(supabase);
    const { data: job, error } = await db.from("production_jobs").select("*").eq("id", id).single();
    if (error) throw new Error(error.message);
    const productionJob = job as { production_job_no: string; status: string; document_id: string | null; branch_id: string; priority: string | null };
    if (productionJob.status === input.to) throw new Error(`${productionJob.production_job_no} is already ${input.to}.`);
    if (!input.from.includes(productionJob.status)) throw new Error(`This production job cannot move from ${productionJob.status} to ${input.to}.`);

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: input.to, updated_by: profile?.id ?? null, updated_at: now };
    if (input.to === "cancelled") Object.assign(patch, { cancelled_by: profile?.id ?? null, cancelled_at: now });
    if (input.to === "rejected") Object.assign(patch, { rejected_by: profile?.id ?? null, rejected_at: now });
    const { data: updatedJob, error: updateError } = await db.from("production_jobs").update(patch).eq("id", id).in("status", input.from).select("id").maybeSingle();
    if (updateError) throw new Error(updateError.message);
    if (!updatedJob) throw new Error("This production job changed before the action completed. Refresh and try again.");
    await updateDocumentStatus(productionJob.document_id, input.document.status, input.document.approval, input.document.step);
    await writeActivityLog({ entityType: "production_job", entityId: id, activityType: input.activity, message: input.message(productionJob.production_job_no) });
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
    from: ["draft"],
    to: "submitted",
    permission: "production.submit",
    activity: "submitted",
    message: (jobNo) => `${jobNo} submitted for approval.`,
    document: { status: "submitted", approval: "pending", step: "Submitted for production approval" },
    notify: {
      permission: "production.approve",
      title: () => "Production approval required",
      message: (jobNo) => `${jobNo} requires production approval.`,
    },
  });
}

export async function approveProductionJob(id: string) {
  await transitionProductionJob(id, {
    from: ["submitted"],
    to: "approved",
    permission: "production.approve",
    activity: "approved",
    message: (jobNo) => `${jobNo} approved. Ready to post production.`,
    document: { status: "approved", approval: "approved", step: "Approved for posting" },
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
    from: ["submitted", "approved"],
    to: "rejected",
    permission: "production.reject",
    activity: "rejected",
    message: (jobNo) => `${jobNo} rejected. ${remarks}`,
    document: { status: "rejected", approval: "rejected", step: "Rejected" },
  });
}

export async function cancelProductionJob(id: string) {
  await transitionProductionJob(id, {
    from: ["draft", "submitted", "approved"],
    to: "cancelled",
    permission: "production.cancel",
    activity: "cancelled",
    message: (jobNo) => `${jobNo} cancelled. No stock movement was posted.`,
    document: { status: "cancelled", approval: "cancelled", step: "Cancelled" },
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
