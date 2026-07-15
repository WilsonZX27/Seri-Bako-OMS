"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validations/item";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { uploadMasterDataImage } from "@/server/storage/master-data-image";

const editableItemSchema = itemSchema.omit({ status: true });

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function payload(formData: FormData) {
  const baseUnit = formData.get("base_unit");
  const parsed = editableItemSchema.parse({
    item_code: formData.get("item_code"),
    autocount_code: cleanText(formData.get("autocount_code")),
    item_name: formData.get("item_name"),
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
  };
}

export async function createItem(formData: FormData) {
  try {
    await requirePermissionOrRedirect("items.create", "/items/new");
    if (isMockMode()) {
      redirect("/items");
    }

    const supabase = await createClient();
    const writeSupabase = supabase;
    const itemPayload = { ...payload(formData), status: "active" as const };
    const { data: archivedMatch, error: archivedError } = await supabase
      .from("items")
      .select("id")
      .eq("item_code", itemPayload.item_code)
      .not("deleted_at", "is", null)
      .limit(1)
      .maybeSingle();
    if (archivedError) throw new Error(archivedError.message);
    if (archivedMatch) {
      safeRedirectWithMessage(`/items/${archivedMatch.id}`, "error", "An archived item with the same code already exists. Restore it instead of creating a duplicate.");
    }
    const { data, error } = await writeSupabase.from("items").insert(itemPayload).select("id").single();
    if (error) throw new Error(error.message);
    const imageUrl = await uploadMasterDataImage("items", data.id, formData.get("item_image"));
    if (imageUrl) {
      const { error: imageError } = await writeSupabase.from("items").update({ item_image_url: imageUrl }).eq("id", data.id);
      if (imageError) throw new Error(imageError.message);
    }

    revalidatePath("/items");
    redirect("/items");
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
    const writeSupabase = await createClient();
    const itemPayload = payload(formData);
    const imageUrl = await uploadMasterDataImage("items", id, formData.get("item_image"));
    const { error } = await writeSupabase.from("items").update({ ...itemPayload, ...(imageUrl ? { item_image_url: imageUrl } : {}) }).eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/items");
    revalidatePath("/stock-balances");
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

    const writeSupabase = await createClient();
    const { error } = await writeSupabase
      .from("items")
      .update({ status: "inactive", deleted_at: new Date().toISOString() })
      .eq("id", id);
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

    const writeSupabase = await createClient();
    const { error } = await writeSupabase
      .from("items")
      .update({ status: "active", deleted_at: null })
      .eq("id", id);
    if (error) throw new Error(error.message);

    revalidatePath("/items");
    redirect(`/items/${id}?success=Item%20restored.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/items/${id}`, "error", formatActionError(error, "Could not restore this item."));
  }
}
