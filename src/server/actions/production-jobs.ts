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
import { hasPermission } from "@/server/auth/permissions";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import { getRecipe } from "@/server/queries/recipes";
import { getProductionJob } from "@/server/queries/production-jobs";

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

async function createProductionDocument(jobId: string, jobNo: string, title: string) {
  const [supabase, profile] = await Promise.all([createClient(), getCurrentProfile()]);
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: profile?.company_id ?? null,
      document_no: jobNo,
      document_type: "production_job",
      title,
      status: "draft",
      approval_status: "draft",
      current_step: "Draft production job",
      related_entity_type: "production_job",
      related_entity_id: jobId,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial production job created.", changed_by: profile?.id ?? null });
  return data.id;
}

async function updateDocumentStatus(documentId: string | null, status: string, approvalStatus: string, step: string) {
  if (!documentId) return;
  const supabase = await createClient();
  await supabase.from("documents").update({ status: status as never, approval_status: approvalStatus as never, current_step: step, updated_at: new Date().toISOString() }).eq("id", documentId);
}

async function ensureOutputItem(product: { product_code: string; product_name: string; category?: string | null; selling_unit?: string | null }, unitCost: number) {
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("items")
    .select("id")
    .eq("item_code", product.product_code)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("items")
    .insert({
      item_code: product.product_code,
      item_name: product.product_name,
      category: product.category ?? "Finished Goods",
      purchase_unit: product.selling_unit ?? "PCS",
      base_unit: product.selling_unit ?? "PCS",
      conversion_to_base_unit: 1,
      cost: unitCost,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
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
    const [supabase, profile, recipe] = await Promise.all([createClient(), getCurrentProfile(), getRecipe(parsed.recipe_id)]);
    const db = looseSupabase(supabase);
    if (recipe.status !== "active") throw new Error("No active recipe found. Activate a recipe before creating production job.");
    const locationId = await resolveDefaultLocation(parsed.branch_id);
    const jobNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "production_job", enteredNumber: null });
    const factor = parsed.planned_output_qty / Number(recipe.yield_qty || 1);
    const totalIngredientCost = recipe.lines.reduce((sum, line) => sum + Number(line.base_qty_required) * factor * Number(line.cost_per_unit), 0);
    const unitCost = totalIngredientCost / parsed.planned_output_qty;

    const { data: job, error } = await db
      .from("production_jobs")
      .insert({
        company_id: profile?.company_id ?? null,
        branch_id: parsed.branch_id,
        location_id: locationId,
        production_job_no: jobNo,
        production_date: parsed.production_date,
        recipe_id: recipe.id,
        product_id: recipe.product_id,
        planned_output_qty: parsed.planned_output_qty,
        output_uom: parsed.output_uom,
        priority: parsed.priority,
        remarks: parsed.remarks ?? null,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const createdJob = job as { id: string };

    const documentId = await createProductionDocument(createdJob.id, jobNo, `Production Job ${jobNo} - ${recipe.product_name}`);
    const outputItemId = await ensureOutputItem({ product_code: recipe.product_code, product_name: recipe.product_name, category: "Finished Goods", selling_unit: parsed.output_uom }, unitCost);
    const balances = await import("@/server/queries/inventory").then((module) => module.getStockBalanceDetails({ page: "all", view: "branch" }));
    const availableByItem = new Map(balances.rows.filter((row) => row.branch_id === parsed.branch_id).map((row) => [row.item_id, Number(row.current_qty ?? 0)]));

    const [{ error: updateError }, { error: ingredientError }, { error: outputError }] = await Promise.all([
      db.from("production_jobs").update({ document_id: documentId, output_item_id: outputItemId }).eq("id", createdJob.id),
      db.from("production_job_ingredient_lines").insert(recipe.lines.map((line) => {
        const requiredQty = Number(line.base_qty_required) * factor;
        const lineCost = requiredQty * Number(line.cost_per_unit);
        return {
          production_job_id: createdJob.id,
          item_id: line.ingredient_item_id,
          item_code: line.ingredient_item_code,
          item_name: line.ingredient_name,
          required_qty: requiredQty,
          actual_qty: requiredQty,
          uom: line.base_uom ?? line.recipe_uom,
          unit_cost: Number(line.cost_per_unit),
          line_cost: lineCost,
          stock_available_qty: availableByItem.get(line.ingredient_item_id) ?? 0,
          variance_qty: (availableByItem.get(line.ingredient_item_id) ?? 0) - requiredQty,
          remarks: line.remarks ?? null,
        };
      })),
      db.from("production_job_output_lines").insert({
        production_job_id: createdJob.id,
        product_id: recipe.product_id,
        item_id: outputItemId,
        output_code: recipe.product_code,
        output_name: recipe.product_name,
        planned_qty: parsed.planned_output_qty,
        actual_qty: parsed.planned_output_qty,
        uom: parsed.output_uom,
        unit_cost: unitCost,
        line_cost: totalIngredientCost,
      }),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (ingredientError) throw new Error(ingredientError.message);
    if (outputError) throw new Error(outputError.message);

    await writeActivityLog({ entityType: "production_job", entityId: createdJob.id, activityType: "created", message: `Production Job ${jobNo} created from ${recipe.recipe_no}` });
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
    if (productionJob.status === input.to) safeRedirectWithMessage(`/production/jobs/${id}`, "success", `${productionJob.production_job_no} is already ${input.to}.`);
    if (!input.from.includes(productionJob.status)) throw new Error(`This production job cannot move from ${productionJob.status} to ${input.to}.`);

    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: input.to, updated_by: profile?.id ?? null, updated_at: now };
    if (input.to === "cancelled") Object.assign(patch, { cancelled_by: profile?.id ?? null, cancelled_at: now });
    if (input.to === "rejected") Object.assign(patch, { rejected_by: profile?.id ?? null, rejected_at: now });
    const { error: updateError } = await db.from("production_jobs").update(patch).eq("id", id);
    if (updateError) throw new Error(updateError.message);
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
    const [supabase, profile, detail, canOverride] = await Promise.all([
      createClient(),
      getCurrentProfile(),
      getProductionJob(id),
      hasPermission("production.override_negative_stock"),
    ]);
    const db = looseSupabase(supabase);
    const { job, ingredientLines, outputLines } = detail;
    if (job.status === "posted") safeRedirectWithMessage(`/production/jobs/${id}`, "success", `${job.production_job_no} is already posted.`);
    if (job.status !== "approved") throw new Error("Only approved production jobs can be posted.");
    if (job.stock_transaction_id) throw new Error("This production job was already posted.");
    if (!ingredientLines.length || !outputLines.length) throw new Error("Production job has no ingredient or output lines.");

    const locationId = await resolveDefaultLocation(job.branch_id, job.location_id);
    const balances = await import("@/server/queries/inventory").then((module) => module.getStockBalanceDetails({ page: "all", view: "branch" }));
    const availableByItem = new Map(balances.rows.filter((row) => row.branch_id === job.branch_id).map((row) => [row.item_id, Number(row.current_qty ?? 0)]));
    const shortages = ingredientLines.filter((line) => (availableByItem.get(line.item_id) ?? 0) < Number(line.actual_qty ?? line.required_qty));
    if (shortages.length && !canOverride) {
      throw new Error(`Insufficient stock for ${shortages.map((line) => line.item_name ?? line.item_code).join(", ")}.`);
    }

    const now = new Date().toISOString();
    const usageQty = ingredientLines.reduce((sum, line) => sum + Number(line.actual_qty ?? line.required_qty), 0);
    const usageCost = ingredientLines.reduce((sum, line) => sum + Number(line.actual_qty ?? line.required_qty) * Number(line.unit_cost), 0);
    const output = outputLines[0];
    const outputQty = Number(output.actual_qty ?? output.planned_qty);
    const outputCost = outputQty > 0 ? usageCost / outputQty : 0;
    const usageNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "stock_transaction", enteredNumber: null });
    const outputNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "stock_transaction", enteredNumber: null });

    const { data: usageTx, error: usageError } = await supabase.from("stock_transactions").insert({
      transaction_no: usageNo,
      document_id: job.document_id,
      branch_id: job.branch_id,
      item_id: ingredientLines[0].item_id,
      location_id: locationId,
      transaction_type: "production_usage",
      transaction_date: job.production_date,
      quantity_in: 0,
      quantity_out: usageQty,
      unit_cost: usageQty > 0 ? usageCost / usageQty : 0,
      total_cost: usageCost,
      status: "posted",
      posted_at: now,
      posted_by: profile?.id ?? null,
      remarks: `Ingredients consumed by ${job.production_job_no}`,
      reference_type: "production_job",
      reference_id: job.id,
      created_by: profile?.id ?? null,
    }).select("id").single();
    if (usageError) throw new Error(usageError.message);

    const { error: usageLineError } = await supabase.from("stock_transaction_lines").insert(ingredientLines.map((line) => ({
      stock_transaction_id: usageTx.id,
      stock_entity_type: "item",
      item_id: line.item_id,
      branch_id: job.branch_id,
      location_id: locationId,
      quantity_in: 0,
      quantity_out: Number(line.actual_qty ?? line.required_qty),
      unit_cost: Number(line.unit_cost ?? 0),
      reference_type: "production_job",
      reference_id: job.id,
      remarks: `Consumed by ${job.production_job_no}`,
      created_by: profile?.id ?? null,
    })));
    if (usageLineError) throw new Error(usageLineError.message);

    const outputItemId = output.item_id ?? job.output_item_id;
    if (!outputItemId) throw new Error("Output item is missing. Please contact admin.");
    const { data: outputTx, error: outputError } = await supabase.from("stock_transactions").insert({
      transaction_no: outputNo,
      document_id: job.document_id,
      branch_id: job.branch_id,
      item_id: outputItemId,
      location_id: locationId,
      transaction_type: "production_output",
      transaction_date: job.production_date,
      quantity_in: outputQty,
      quantity_out: 0,
      unit_cost: outputCost,
      total_cost: outputQty * outputCost,
      status: "posted",
      posted_at: now,
      posted_by: profile?.id ?? null,
      remarks: `Finished goods produced by ${job.production_job_no}`,
      reference_type: "production_job",
      reference_id: job.id,
      created_by: profile?.id ?? null,
    }).select("id").single();
    if (outputError) throw new Error(outputError.message);

    const { error: outputLineError } = await supabase.from("stock_transaction_lines").insert({
      stock_transaction_id: outputTx.id,
      stock_entity_type: "item",
      item_id: outputItemId,
      branch_id: job.branch_id,
      location_id: locationId,
      quantity_in: outputQty,
      quantity_out: 0,
      unit_cost: outputCost,
      reference_type: "production_job",
      reference_id: job.id,
      remarks: `Produced by ${job.production_job_no}`,
      created_by: profile?.id ?? null,
    });
    if (outputLineError) throw new Error(outputLineError.message);

    const { error: jobError } = await db.from("production_jobs").update({
      status: "posted",
      actual_output_qty: outputQty,
      stock_transaction_id: outputTx.id,
      posted_by: profile?.id ?? null,
      posted_at: now,
      updated_by: profile?.id ?? null,
    }).eq("id", id);
    if (jobError) throw new Error(jobError.message);
    await updateDocumentStatus(job.document_id, "posted", "approved", "Posted to stock");
    await writeActivityLog({ entityType: "production_job", entityId: id, activityType: "posted", message: `${job.production_job_no} posted. Ingredients deducted and output stock added.` });
    await notifyProduction({
      title: "Production posted",
      message: `${job.production_job_no} posted. Ingredients deducted and finished goods added.`,
      permission: "production.view",
      jobId: id,
      branchId: job.branch_id,
    });
    revalidateWorkspaceState(["/production", "/production/jobs", `/production/jobs/${id}`]);
    revalidatePath("/inventory");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-balances");
    revalidatePath("/stock-card");
    revalidatePath("/dashboard");
    safeRedirectWithMessage(`/production/jobs/${id}`, "success", `${job.production_job_no} posted. Ingredients deducted and finished goods added.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/production/jobs/${id}`, "error", formatActionError(error, "Could not post this production job."));
  }
}
