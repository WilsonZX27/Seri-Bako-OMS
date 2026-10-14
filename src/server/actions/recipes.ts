"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockItems, mockProducts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { recipeSchema } from "@/lib/validations/recipe";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { parseBoundedJson } from "@/server/validation/json-input";
import type { RecipeInput } from "@/lib/validations/recipe";
import { z } from "zod";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseRecipeId(id: string) {
  return z.string().uuid("The recipe identifier is invalid.").parse(id);
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

async function writeRecipeAtomically(client: Awaited<ReturnType<typeof createClient>>, args: Record<string, unknown>): Promise<{ id: string } | { error: string }> {
  try {
    const { data, error } = await looseSupabase(client).rpc("save_recipe_atomic", args);
    if (error) throw new Error(error.message);
    if (!data || typeof (data as { id?: unknown }).id !== "string") throw new Error("Recipe save result unavailable");
    return data as { id: string };
  } catch (error) {
    // Every retry keeps the same request key; a committed result is replayed by the RPC.
    return { error: formatActionError(error, "Could not confirm the recipe save. Retry with the same inputs.") };
  }
}

export async function createRecipe(formData: FormData) {
  await requirePermission("recipes.create");
  formData.set("recipe_no", `RCP-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`);
  formData.set("version", "1");
  let parsed: RecipeInput;
  let supabase: Awaited<ReturnType<typeof assertRecipeReferencesExist>>;
  try {
    parsed = parseRecipeForm(formData);
    supabase = await assertRecipeReferencesExist(parsed);
  } catch (error) {
    rethrowRedirect(error);
    return { error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Check the recipe fields." : "Could not validate the product and ingredients. Check your selections and retry." };
  }

  if (isMockMode()) redirect("/recipes/recipe-butter-croissant-v2-draft");
  if (!supabase) throw new Error("Supabase client is not available");

  const requestKey = z.uuid().parse(formData.get("request_key"));
  const result = await writeRecipeAtomically(supabase, {
    p_action: "create", p_request_key: requestKey, p_payload: { ...parsed, recipe_no: "AUTO", version: 1 },
  });
  if ("error" in result) return result;
  const recipe = result;

  revalidatePath("/recipes");
  redirect(`/recipes/${recipe.id}`);
}

export async function updateRecipe(id: string, formData: FormData) {
  await requirePermission("recipes.update");
  let parsed: RecipeInput;
  let supabase: Awaited<ReturnType<typeof assertRecipeReferencesExist>>;
  try {
    parsed = parseRecipeForm(formData);
    supabase = await assertRecipeReferencesExist(parsed);
  } catch (error) {
    rethrowRedirect(error);
    return { error: error instanceof z.ZodError ? error.issues[0]?.message ?? "Check the recipe fields." : "Could not validate the product and ingredients. Check your selections and retry." };
  }

  if (isMockMode()) redirect(`/recipes/${id}`);
  const recipeId = parseRecipeId(id);
  if (!supabase) throw new Error("Supabase client is not available");

  const requestKey = z.uuid().parse(formData.get("request_key"));
  const result = await writeRecipeAtomically(supabase, {
    p_action: "update", p_request_key: requestKey, p_recipe_id: recipeId, p_payload: parsed,
    p_expected_updated_at: String(formData.get("expected_updated_at") ?? ""),
  });
  if ("error" in result) return result;

  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
  redirect(`/recipes/${recipeId}`);
}

async function transitionRecipe(id: string, action: "submit" | "approve" | "activate" | "reject" | "archive", remarks?: string) {
  if (isMockMode()) return;
  const recipeId = parseRecipeId(id);
  const { error } = await looseSupabase(await createClient()).rpc("transition_recipe_atomic", {
    p_recipe_id: recipeId,
    p_action: action,
    p_remarks: remarks ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
}

export async function submitRecipe(id: string) {
  await requirePermission("recipes.submit");
  await transitionRecipe(id, "submit");
}

export async function approveRecipe(id: string) {
  await requirePermission("recipes.approve");
  await transitionRecipe(id, "approve");
}

export async function activateRecipe(id: string) {
  await requirePermission("recipes.approve");
  await transitionRecipe(id, "activate");
}

export async function rejectRecipe(id: string, formData: FormData) {
  await requirePermission("recipes.approve");
  const remarks = z.string().trim().min(1, "Rejection remarks are required.").max(1_000, "Rejection remarks must be 1,000 characters or fewer.").parse(cleanText(formData.get("remarks")) ?? "");
  if (!remarks) throw new Error("Rejection remarks are required.");
  await transitionRecipe(id, "reject", remarks);
}

export async function archiveRecipe(id: string) {
  await requirePermissionOrRedirect("recipes.archive", `/recipes/${id}`);
  try {
    await transitionRecipe(id, "archive");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/recipes/${id}`, "error", formatActionError(error, "Could not archive this recipe."));
  }
  safeRedirectWithMessage(`/recipes/${id}`, "success", "Recipe archived.");
}

export async function createNewRecipeVersion(id: string, formData: FormData) {
  await requirePermission("recipes.create");
  if (isMockMode()) redirect("/recipes/recipe-butter-croissant-v2-draft");
  const recipeId = parseRecipeId(id);
  const requestKey = z.uuid().parse(formData.get("request_key"));
  const result = await writeRecipeAtomically(await createClient(), {
    p_action: "copy", p_request_key: requestKey, p_recipe_id: recipeId,
  });
  if ("error" in result) return result;
  revalidatePath("/recipes");
  redirect(`/recipes/${result.id}`);
}
