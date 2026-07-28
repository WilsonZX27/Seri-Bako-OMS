"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockItems, mockProducts, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { recipeSchema } from "@/lib/validations/recipe";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { getCurrentProfile } from "@/server/queries/common";
import { getRecipe } from "@/server/queries/recipes";
import { parseBoundedJson } from "@/server/validation/json-input";
import type { RecipeInput } from "@/lib/validations/recipe";
import type { ApprovalStatus, DocumentStatus, RecipeStatus } from "@/types/database";
import { z } from "zod";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseRecipeId(id: string) {
  return z.string().uuid("The recipe identifier is invalid.").parse(id);
}

async function identity() {
  if (isMockMode()) return { company_id: mockProfile.company_id, id: mockProfile.id };
  return getCurrentProfile();
}

function parseRecipeForm(formData: FormData) {
  const lines = parseBoundedJson(formData.get("lines_json"), "recipe ingredients");

  return recipeSchema.parse({
    recipe_no: formData.get("recipe_no"),
    product_id: formData.get("product_id"),
    version: formData.get("version"),
    yield_qty: formData.get("yield_qty"),
    yield_unit: formData.get("yield_unit"),
    effective_date: formData.get("effective_date"),
    remarks: formData.get("remarks"),
    lines,
  });
}

async function assertRecipeReferencesExist(parsed: RecipeInput) {
  const ingredientIds = parsed.lines.map((line) => line.ingredient_item_id);

  if (isMockMode()) {
    const productExists = mockProducts.some((product) => product.id === parsed.product_id);
    const itemIds = new Set<string>(mockItems.map((item) => item.id));
    const missingIngredient = ingredientIds.find((id) => !itemIds.has(id));

    if (!productExists) throw new Error("Selected product does not exist");
    if (missingIngredient) throw new Error("Selected ingredient item does not exist in Item Master");
    return null;
  }

  const supabase = await createClient();
  const [product, items] = await Promise.all([
    supabase.from("products").select("id").eq("id", parsed.product_id).single(),
    supabase.from("items").select("id").in("id", ingredientIds),
  ]);

  if (product.error) throw new Error("Selected product does not exist");
  if (items.error) throw new Error(items.error.message);

  const foundItemIds = new Set((items.data ?? []).map((item) => item.id));
  const missingIngredient = ingredientIds.find((id) => !foundItemIds.has(id));
  if (missingIngredient) throw new Error("Selected ingredient item does not exist in Item Master");

  return supabase;
}

async function createRecipeDocument(recipeId: string, parsed: RecipeInput) {
  const profile = await identity();
  const supabase = await createClient();
  const product = mockProducts.find((row) => row.id === parsed.product_id);
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: profile?.company_id ?? null,
      document_no: parsed.recipe_no,
      document_type: "recipe",
      title: `Recipe ${parsed.recipe_no}${product ? ` - ${product.product_name}` : ""}`,
      status: "draft",
      approval_status: "draft",
      current_step: "Draft recipe",
      related_entity_type: "recipe",
      related_entity_id: recipeId,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial recipe created.", changed_by: profile?.id ?? null });
  return data.id;
}

function totals(parsed: RecipeInput) {
  const totalIngredientCost = parsed.lines.reduce((sum, line) => sum + line.base_qty_required * line.cost_per_unit, 0);
  const wastageAdjustedCost = parsed.lines.reduce((sum, line) => sum + line.base_qty_required * line.cost_per_unit * (1 + line.wastage_percent / 100), 0);
  const costPerFinishedUnit = wastageAdjustedCost / parsed.yield_qty;
  return { totalIngredientCost, wastageAdjustedCost, costPerFinishedUnit };
}

async function createCostSnapshot(recipeId: string, parsed: RecipeInput) {
  const profile = await identity();
  const supabase = await createClient();
  const [{ data: latest }, { data: packaging }] = await Promise.all([
    supabase.from("recipe_cost_snapshots").select("snapshot_no").eq("recipe_id", recipeId).order("snapshot_no", { ascending: false }).limit(1),
    supabase.from("product_packaging").select("*").eq("product_id", parsed.product_id).eq("status", "active").is("deleted_at", null).limit(1),
  ]);
  const nextSnapshot = Number(latest?.[0]?.snapshot_no ?? 0) + 1;
  const pack = packaging?.[0] ?? null;
  const cost = totals(parsed);
  const { error } = await supabase.from("recipe_cost_snapshots").insert({
    recipe_id: recipeId,
    snapshot_no: nextSnapshot,
    total_ingredient_cost: cost.totalIngredientCost,
    wastage_adjusted_cost: cost.wastageAdjustedCost,
    cost_per_finished_unit: cost.costPerFinishedUnit,
    cost_per_pack: pack ? cost.costPerFinishedUnit * Number(pack.units_per_pack) : null,
    packaging_name: pack?.packaging_name ?? null,
    yield_qty: parsed.yield_qty,
    yield_uom: parsed.yield_unit,
    captured_by: profile?.id ?? null,
    created_by: profile?.id ?? null,
  });
  if (error) throw new Error(error.message);
}

function recipeLineRows(recipeId: string, parsed: RecipeInput) {
  return parsed.lines.map((line) => ({
    recipe_id: recipeId,
    ingredient_item_id: line.ingredient_item_id,
    qty_required: line.qty_required,
    unit: line.recipe_uom,
    recipe_uom: line.recipe_uom,
    base_uom: line.base_uom,
    conversion_factor: line.conversion_factor,
    base_qty_required: line.base_qty_required,
    wastage_percent: line.wastage_percent,
    cost_per_unit: line.cost_per_unit,
    remarks: line.remarks || null,
  }));
}

export async function createRecipe(formData: FormData) {
  await requirePermission("recipes.create");
  const parsed = parseRecipeForm(formData);
  const supabase = await assertRecipeReferencesExist(parsed);

  if (isMockMode()) redirect("/recipes/recipe-butter-croissant-v2-draft");
  if (!supabase) throw new Error("Supabase client is not available");

  const profile = await identity();
  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      company_id: profile?.company_id ?? null,
      recipe_no: parsed.recipe_no,
      product_id: parsed.product_id,
      version: parsed.version,
      yield_qty: parsed.yield_qty,
      yield_unit: parsed.yield_unit,
      status: "draft",
      approval_status: "draft",
      effective_date: parsed.effective_date,
      remark: parsed.remarks || null,
      remarks: parsed.remarks || null,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();

  if (recipeError) throw new Error(recipeError.message);

  const docId = await createRecipeDocument(recipe.id, parsed);
  const [{ error: updateError }, { error: linesError }] = await Promise.all([
    supabase.from("recipes").update({ document_id: docId }).eq("id", recipe.id),
    supabase.from("recipe_lines").insert(recipeLineRows(recipe.id, parsed)),
  ]);

  if (updateError) throw new Error(updateError.message);
  if (linesError) throw new Error(linesError.message);
  await createCostSnapshot(recipe.id, parsed);
  await writeActivityLog({ entityType: "document", entityId: docId, activityType: "created", message: `Recipe ${parsed.recipe_no} created` });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: string, formData: FormData) {
  await requirePermission("recipes.update");
  const parsed = parseRecipeForm(formData);
  const supabase = await assertRecipeReferencesExist(parsed);

  if (isMockMode()) redirect(`/recipes/${id}`);
  const recipeId = parseRecipeId(id);
  if (!supabase) throw new Error("Supabase client is not available");

  const profile = await identity();
  const { data: existing, error: existingError } = await supabase.from("recipes").select("status,document_id").eq("id", recipeId).single();
  if (existingError) throw new Error(existingError.message);
  if (existing.status === "active") throw new Error("Active recipes cannot be edited directly. Create a new version first.");

  const { error: recipeError } = await supabase
    .from("recipes")
    .update({
      recipe_no: parsed.recipe_no,
      product_id: parsed.product_id,
      version: parsed.version,
      yield_qty: parsed.yield_qty,
      yield_unit: parsed.yield_unit,
      status: parsed.status === "rejected" ? "draft" : parsed.status,
      approval_status: parsed.approval_status === "rejected" ? "draft" : parsed.approval_status,
      effective_date: parsed.effective_date,
      remark: parsed.remarks || null,
      remarks: parsed.remarks || null,
      updated_by: profile?.id ?? null,
    })
    .eq("id", recipeId);

  if (recipeError) throw new Error(recipeError.message);

  const { error: deleteError } = await supabase.from("recipe_lines").delete().eq("recipe_id", recipeId);
  if (deleteError) throw new Error(deleteError.message);

  const { error: linesError } = await supabase.from("recipe_lines").insert(recipeLineRows(recipeId, parsed));
  if (linesError) throw new Error(linesError.message);
  await createCostSnapshot(id, parsed);

  if (existing.document_id) {
    await supabase.from("documents").update({ title: `Recipe ${parsed.recipe_no}`, updated_by: profile?.id ?? null }).eq("id", existing.document_id);
    await supabase.from("document_revisions").insert({ document_id: existing.document_id, revision_no: 1, change_summary: "Recipe details updated and costing snapshot captured.", changed_by: profile?.id ?? null });
    await writeActivityLog({ entityType: "document", entityId: existing.document_id, activityType: "updated", message: `Recipe ${parsed.recipe_no} updated` });
  }

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

async function updateRecipeStatus(id: string, status: RecipeStatus, approvalStatus: ApprovalStatus, documentStatus: DocumentStatus, step: string, message: string) {
  const profile = await identity();
  if (isMockMode()) return;
  const recipeId = parseRecipeId(id);
  const supabase = await createClient();
  const { data: recipe, error: recipeError } = await supabase.from("recipes").select("document_id,product_id").eq("id", recipeId).single();
  if (recipeError) throw new Error(recipeError.message);
  const now = new Date().toISOString();

  if (status === "active") {
    await supabase.from("recipes").update({ status: "archived", archived_at: now, updated_by: profile?.id ?? null }).eq("product_id", recipe.product_id).eq("status", "active").neq("id", recipeId);
  }

  const stamp =
    status === "pending_approval" ? { submitted_at: now } :
    status === "approved" ? { approved_at: now } :
    status === "active" ? { activated_at: now, approved_at: now } :
    status === "rejected" ? { rejected_at: now } :
    status === "archived" ? { archived_at: now } :
    {};

  const [{ error }, { error: docError }] = await Promise.all([
    supabase.from("recipes").update({ status, approval_status: approvalStatus, updated_by: profile?.id ?? null, ...stamp }).eq("id", recipeId),
    recipe.document_id
      ? supabase.from("documents").update({ status: documentStatus, approval_status: approvalStatus, current_step: step, updated_by: profile?.id ?? null }).eq("id", recipe.document_id)
      : Promise.resolve({ error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (docError) throw new Error(docError.message);
  if (recipe.document_id) await writeActivityLog({ entityType: "document", entityId: recipe.document_id, activityType: status, message });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
}

export async function submitRecipe(id: string) {
  await requirePermission("recipes.submit");
  await updateRecipeStatus(id, "pending_approval", "pending", "pending_approval", "Manager approval", "Recipe submitted for approval");
}

export async function approveRecipe(id: string) {
  await requirePermission("recipes.approve");
  await updateRecipeStatus(id, "approved", "approved", "approved", "Approved", "Recipe approved");
}

export async function activateRecipe(id: string) {
  await requirePermission("recipes.approve");
  await updateRecipeStatus(id, "active", "approved", "approved", "Active recipe", "Recipe activated");
}

export async function rejectRecipe(id: string, formData: FormData) {
  await requirePermission("recipes.approve");
  const remarks = z.string().trim().min(1, "Rejection remarks are required.").max(1_000, "Rejection remarks must be 1,000 characters or fewer.").parse(cleanText(formData.get("remarks")) ?? "");
  if (!remarks) throw new Error("Rejection remarks are required.");
  await updateRecipeStatus(id, "rejected", "rejected", "rejected", "Rejected", `Recipe rejected: ${remarks}`);
}

export async function archiveRecipe(id: string) {
  await requirePermissionOrRedirect("recipes.archive", `/recipes/${id}`);
  try {
    await updateRecipeStatus(id, "archived", "approved", "closed", "Archived", "Recipe archived");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/recipes/${id}`, "error", formatActionError(error, "Could not archive this recipe."));
  }
  safeRedirectWithMessage(`/recipes/${id}`, "success", "Recipe archived.");
}

export async function createNewRecipeVersion(id: string) {
  await requirePermission("recipes.create");
  if (isMockMode()) redirect("/recipes/recipe-butter-croissant-v2-draft");
  const recipeId = parseRecipeId(id);

  const source = await getRecipe(recipeId);
  const supabase = await createClient();
  const profile = await identity();
  const { data: versions, error: versionError } = await supabase.from("recipes").select("version").eq("product_id", source.product_id).order("version", { ascending: false }).limit(1);
  if (versionError) throw new Error(versionError.message);
  const nextVersion = Number(versions?.[0]?.version ?? source.version) + 1;
  const nextNo = `${source.recipe_no}-V${nextVersion}`;

  const parsed: RecipeInput = {
    recipe_no: nextNo,
    product_id: source.product_id,
    version: nextVersion,
    yield_qty: Number(source.yield_qty),
    yield_unit: source.yield_unit,
    status: "draft",
    approval_status: "draft",
    effective_date: new Date().toISOString().slice(0, 10),
    remarks: `New version copied from ${source.recipe_no}.`,
    lines: source.lines.map((line) => ({
      ingredient_item_id: line.ingredient_item_id,
      qty_required: Number(line.qty_required),
      recipe_uom: line.recipe_uom,
      base_uom: line.base_uom,
      conversion_factor: Number(line.conversion_factor),
      base_qty_required: Number(line.base_qty_required),
      wastage_percent: Number(line.wastage_percent),
      cost_per_unit: Number(line.cost_per_unit),
      remarks: line.remarks,
    })),
  };

  const { data: recipe, error } = await supabase.from("recipes").insert({
    company_id: profile?.company_id ?? null,
    recipe_no: nextNo,
    product_id: parsed.product_id,
    version: parsed.version,
    yield_qty: parsed.yield_qty,
    yield_unit: parsed.yield_unit,
    status: "draft",
    approval_status: "draft",
    effective_date: parsed.effective_date,
    remarks: parsed.remarks,
    remark: parsed.remarks,
    created_by: profile?.id ?? null,
    updated_by: profile?.id ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);

  const docId = await createRecipeDocument(recipe.id, parsed);
  await supabase.from("recipes").update({ document_id: docId }).eq("id", recipe.id);
  await supabase.from("recipe_lines").insert(recipeLineRows(recipe.id, parsed));
  await createCostSnapshot(recipe.id, parsed);
  await writeActivityLog({ entityType: "document", entityId: docId, activityType: "created", message: `New recipe version created from ${source.recipe_no}` });

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}
