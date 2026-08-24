"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validations/item";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { uploadMasterDataImage } from "@/server/storage/master-data-image";
import { writeActivityLog } from "@/server/activity/log";
import { z } from "zod";
import { looseSupabase } from "@/lib/supabase/loose";

const editableItemSchema = itemSchema.omit({ status: true });

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseItemId(id: string) {
  return z.string().uuid("The item identifier is invalid.").parse(id);
}

function payload(formData: FormData) {
  const baseUnit = formData.get("base_unit");
  const parsed = editableItemSchema.parse({
    item_code: formData.get("item_code"),
    autocount_code: cleanText(formData.get("autocount_code")),
    item_name: formData.get("item_name"),
    brand_name: cleanText(formData.get("brand_name")),
    category: formData.get("category"),
    purchase_unit: formData.get("purchase_unit") || baseUnit,
    base_unit: baseUnit,
    conversion_to_base_unit: formData.get("conversion_to_base_unit") || 1,
    supplier_id: formData.get("supplier_id"),
    cost: formData.get("cost"),
    safety_stock: formData.get("safety_stock"),
    lead_time_days: formData.get("lead_time_days") || 0,
    moq: formData.get("moq") || 0,
  });

  return {
    ...parsed,
    supplier_id: parsed.supplier_id || null,
    autocount_code: parsed.autocount_code || null,
    brand_name: parsed.brand_name || null,
  };
}

function sourcingPayload(formData: FormData, itemPayload: ReturnType<typeof payload>) {
  if (!itemPayload.supplier_id) return { supplier: null, branchIds: [] as string[], preferred: false };
  const branchIds = [...new Set(formData.getAll("branch_ids").map(String).map((value) => value.trim()).filter(Boolean))];
  return {
    supplier: {
      supplier_id: itemPayload.supplier_id,
      purchase_uom: cleanText(formData.get("supplier_purchase_uom")) ?? itemPayload.purchase_unit,
      conversion_to_base_uom: Number(formData.get("supplier_conversion_to_base_uom") || itemPayload.conversion_to_base_unit),
      unit_cost: Number(formData.get("supplier_unit_cost") || itemPayload.cost),
      moq: Number(formData.get("supplier_moq") || itemPayload.moq),
      lead_time_days: Number(formData.get("supplier_lead_time_days") || itemPayload.lead_time_days),
    },
    branchIds,
    preferred: formData.get("supplier_preferred") === "true",
  };
}

export async function createItem(formData: FormData) {
  try {
    await requirePermissionOrRedirect("items.create", "/items/new");
    if (isMockMode()) {
      redirect("/items");
    }

    const supabase = await createClient();
    const actor = await requireActiveTenantActor();
    const writeSupabase = supabase;
    const itemPayload = payload(formData);
    const { data: archivedMatch, error: archivedError } = await supabase
      .from("items")
      .select("id")
      .eq("item_code", itemPayload.item_code)
      .eq("company_id", actor.companyId)
      .not("deleted_at", "is", null)
      .limit(1)
      .maybeSingle();
    if (archivedError) throw new Error(archivedError.message);
    if (archivedMatch) {
      safeRedirectWithMessage(`/items/${archivedMatch.id}`, "error", "An archived item with the same code already exists. Restore it instead of creating a duplicate.");
    }
    const sourcing = sourcingPayload(formData, itemPayload);
    const { data: created, error } = await writeSupabase.rpc("create_operational_item", {
      p_item: { ...itemPayload, status: "active" },
      p_supplier: sourcing.supplier,
      p_branch_ids: sourcing.branchIds,
      p_preferred: sourcing.preferred,
    });
    if (error) throw new Error(error.message);
    const createdResult = (created ?? {}) as { item_id?: string; supplier_item_id?: string; readiness?: string };
    if (!createdResult.item_id) throw new Error("The operational item was not created.");
    const imageUrl = await uploadMasterDataImage("items", createdResult.item_id, formData.get("item_image"));
    if (imageUrl) {
      const { error: imageError } = await writeSupabase.from("items").update({ item_image_url: imageUrl }).eq("id", createdResult.item_id).eq("company_id", actor.companyId);
      if (imageError) throw new Error(imageError.message);
    }

    await writeActivityLog({
      entityType: "item",
      entityId: createdResult.item_id,
      activityType: "created",
      message: `Item ${itemPayload.item_code} created (${createdResult.readiness ?? "master_only"})`,
      metadata: { readiness: createdResult.readiness ?? "master_only", supplier_item_id: createdResult.supplier_item_id ?? null },
    });

    revalidatePath("/items");
    redirect(`/items/${createdResult.item_id}?success=${encodeURIComponent("Item created.")}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/items/new", "error", formatActionError(error, "Could not create this item."));
  }
}

export async function updateItem(id: string, formData: FormData) {
  await requirePermissionOrRedirect("items.update", `/items/${id}`);
  if (isMockMode()) {
    redirect("/items");
  }

  try {
    const itemId = parseItemId(id);
    const writeSupabase = await createClient();
    const actor = await requireActiveTenantActor();
    const { data: existing, error: existingError } = await writeSupabase
      .from("items")
      .select("id")
      .eq("id", itemId)
      .eq("company_id", actor.companyId)
      .maybeSingle();
    if (existingError) throw new Error(existingError.message);
    if (!existing) throw new Error("Item was not found or is outside your workspace.");
    const itemPayload = payload(formData);
    const imageUrl = await uploadMasterDataImage("items", itemId, formData.get("item_image"));
    const { error } = await writeSupabase.from("items").update({ ...itemPayload, ...(imageUrl ? { item_image_url: imageUrl } : {}) }).eq("id", itemId).eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);

    revalidatePath("/items");
    revalidatePath("/low-stock");
    redirect("/items");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/items/${id}`, "error", formatActionError(error, "Could not update this item."));
  }
}

export async function deleteItem(id: string) {
  try {
    await requirePermissionOrRedirect("items.update", "/items");
    if (isMockMode()) {
      redirect("/items");
    }

    const itemId = parseItemId(id);
    const writeSupabase = await createClient();
    const actor = await requireActiveTenantActor();
    const { error } = await writeSupabase
      .from("items")
      .update({ status: "inactive", deleted_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);

    revalidatePath("/items");
    redirect("/items?success=Item%20deactivated.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/items", "error", formatActionError(error, "Could not deactivate this item."));
  }
}

export async function restoreItem(id: string) {
  try {
    await requirePermissionOrRedirect("items.update", `/items/${id}`);
    if (isMockMode()) {
      redirect("/items");
    }

    const itemId = parseItemId(id);
    const writeSupabase = await createClient();
    const actor = await requireActiveTenantActor();
    const { error } = await writeSupabase
      .from("items")
      .update({ status: "active", deleted_at: null })
      .eq("id", itemId)
      .eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);

    revalidatePath("/items");
    redirect(`/items/${id}?success=Item%20restored.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/items/${id}`, "error", formatActionError(error, "Could not restore this item."));
  }
}

export async function restoreBranchStockCountItem(itemId: string, scopeId: string, formData: FormData) {
  try {
    await requirePermissionOrRedirect("stock_count.update", `/items/${itemId}`);
    const parsedItemId = parseItemId(itemId);
    const parsedScopeId = z.string().uuid().parse(scopeId);
    const reason = z.string().trim().min(3).max(1_000).parse(formData.get("reason"));
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await looseSupabase(supabase).rpc("restore_branch_stock_count_item", { p_scope_id: parsedScopeId, p_reason: reason });
      if (error) throw new Error(error.message);
    }
    revalidatePath(`/items/${parsedItemId}`);
    safeRedirectWithMessage(`/items/${parsedItemId}`, "success", "Item restored to this branch's next Stock Count.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/items/${itemId}`, "error", formatActionError(error, "Could not restore this branch item."));
  }
}
