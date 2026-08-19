"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { supplierItemSchema, uomConversionSchema } from "@/lib/validations/master-data";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import type { Database } from "@/types/database";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseRecordId(id: string) {
  return z.uuid().parse(id);
}

const supplierItemInputSchema = supplierItemSchema.omit({ supplier_item_code: true, supplier_item_name: true });

function supplierItemInput(formData: FormData) {
  const parsed = supplierItemInputSchema.parse({
    supplier_id: formData.get("supplier_id"),
    item_id: formData.get("item_id"),
    purchase_uom: formData.get("purchase_uom"),
    conversion_to_base_uom: formData.get("conversion_to_base_uom") ?? 1,
    unit_cost: formData.get("unit_cost") ?? 0,
    moq: formData.get("moq") ?? 0,
    lead_time_days: formData.get("lead_time_days") ?? 0,
    valid_from: formData.get("valid_from"),
    valid_to: formData.get("valid_to"),
    status: formData.get("status") ?? "active",
  });
  return {
    ...parsed,
    valid_from: cleanText(formData.get("valid_from")),
    valid_to: cleanText(formData.get("valid_to")),
  };
}

export async function createSupplierItem(formData: FormData) {
  await requirePermission("supplier_items.create");
  const input = supplierItemInput(formData);
  if (!isMockMode()) {
    const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
    const { data: item, error: itemError } = await supabase.from("items").select("item_code,item_name").eq("id", input.item_id).eq("company_id", actor.companyId).eq("status", "active").is("deleted_at", null).maybeSingle();
    if (itemError) throw new Error(itemError.message);
    if (!item) throw new Error("The selected Item Master record is not active in your workspace.");
    const payload = { ...input, supplier_item_code: item.item_code, supplier_item_name: item.item_name };
    const { data, error } = await supabase.from("supplier_items").insert({ ...payload, company_id: actor.companyId }).select("id").single();
    if (error) throw new Error(error.message);
    const branchIds = [...new Set(formData.getAll("branch_ids").map(String).filter(Boolean))];
    if (branchIds.length) {
      const { error: mappingError } = await supabase.rpc("save_branch_supplier_item_mappings", {
        p_rows: branchIds.map((branchId) => ({
          branch_id: branchId,
          supplier_item_id: data.id,
          item_id: payload.item_id,
          is_preferred: formData.get("is_preferred") === "true",
          status: "active",
        })),
        p_mode: "upsert",
      });
      if (mappingError) {
        const { error: rollbackError } = await supabase.from("supplier_items").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", data.id).eq("company_id", actor.companyId);
        if (rollbackError) throw new Error(`The branch mapping failed (${mappingError.message}) and the incomplete supplier item could not be archived (${rollbackError.message}). Contact an administrator with supplier item ID ${data.id}.`);
        throw new Error(`The supplier item was not saved because its branch mapping failed: ${mappingError.message}`);
      }
    }
    await writeActivityLog({ entityType: "supplier_item", entityId: data.id, activityType: "created", message: `Supplier item ${payload.supplier_item_code} created` });
  }
  revalidatePath("/supplier-items");
  revalidatePath("/items");
  revalidatePath("/suppliers");
  redirect("/supplier-items");
}

export async function updateSupplierItem(id: string, formData: FormData) {
  await requirePermissionOrRedirect("supplier_items.update", `/supplier-items/${id}`);
  const supplierItemId = parseRecordId(id);
  const input = supplierItemInput(formData);
  try {
    if (!isMockMode()) {
      const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
      const { data: current, error: currentError } = await supabase.from("supplier_items").select("supplier_id,item_id,supplier_item_code").eq("id", supplierItemId).eq("company_id", actor.companyId).maybeSingle();
      if (currentError) throw new Error(currentError.message);
      if (!current) throw new Error("Supplier item was not found or is outside your workspace.");
      const identityChanged = current.supplier_id !== input.supplier_id || current.item_id !== input.item_id;
      let payload: Database["public"]["Tables"]["supplier_items"]["Update"] = { purchase_uom: input.purchase_uom, conversion_to_base_uom: input.conversion_to_base_uom, unit_cost: input.unit_cost, moq: input.moq, lead_time_days: input.lead_time_days, valid_from: input.valid_from, valid_to: input.valid_to, status: input.status };
      let activityCode = current.supplier_item_code;
      if (identityChanged) {
        const { data: item, error: itemError } = await supabase.from("items").select("item_code,item_name").eq("id", input.item_id).eq("company_id", actor.companyId).eq("status", "active").is("deleted_at", null).maybeSingle();
        if (itemError) throw new Error(itemError.message);
        if (!item) throw new Error("The selected Item Master record is not active in your workspace.");
        const { data: duplicate, error: duplicateError } = await supabase.from("supplier_items").select("id").eq("company_id", actor.companyId).eq("supplier_id", input.supplier_id).eq("item_id", input.item_id).is("deleted_at", null).neq("id", supplierItemId).maybeSingle();
        if (duplicateError) throw new Error(duplicateError.message);
        if (duplicate) throw new Error("This supplier is already linked to the selected item. Open the existing supplier item and update its purchasing terms instead.");
        activityCode = item.item_code;
        payload = { ...payload, supplier_id: input.supplier_id, item_id: input.item_id, supplier_item_code: item.item_code, supplier_item_name: item.item_name };
      }
      const { data, error } = await supabase.from("supplier_items").update(payload).eq("id", supplierItemId).eq("company_id", actor.companyId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Supplier item was not found or is outside your workspace.");
      await writeActivityLog({ entityType: "supplier_item", entityId: id, activityType: "updated", message: `Supplier item ${activityCode} updated` });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-items/${id}`, "error", formatActionError(error, "Could not update this supplier item."));
  }
  revalidatePath("/supplier-items");
  revalidatePath(`/supplier-items/${id}`);
  safeRedirectWithMessage(`/supplier-items/${id}`, "success", "Supplier item purchasing terms updated.");
}

export async function deleteSupplierItem(id: string) {
  await requirePermissionOrRedirect("supplier_items.update", "/supplier-items");
  try {
    const supplierItemId = parseRecordId(id);
    if (!isMockMode()) {
      const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
      const { data, error } = await supabase.from("supplier_items").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", supplierItemId).eq("company_id", actor.companyId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Supplier item was not found or is outside your workspace.");
      await writeActivityLog({ entityType: "supplier_item", entityId: id, activityType: "archived", message: "Supplier item archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/supplier-items", "error", formatActionError(error, "Could not archive this supplier item."));
  }
  revalidatePath("/supplier-items");
  safeRedirectWithMessage("/supplier-items", "success", "Supplier item archived.");
}

export async function restoreSupplierItem(id: string) {
  await requirePermissionOrRedirect("supplier_items.update", `/supplier-items/${id}`);
  try {
    const supplierItemId = parseRecordId(id);
    if (!isMockMode()) {
      const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
      const { data, error } = await supabase.from("supplier_items").update({ status: "active", deleted_at: null }).eq("id", supplierItemId).eq("company_id", actor.companyId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Supplier item was not found or is outside your workspace.");
      await writeActivityLog({ entityType: "supplier_item", entityId: id, activityType: "restored", message: "Supplier item restored" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/supplier-items/${id}`, "error", formatActionError(error, "Could not restore this supplier item."));
  }
  revalidatePath("/supplier-items");
  revalidatePath(`/supplier-items/${id}`);
  safeRedirectWithMessage(`/supplier-items/${id}`, "success", "Supplier item restored.");
}

function uomPayload(formData: FormData) {
  return uomConversionSchema.parse({
    from_uom: formData.get("from_uom"),
    to_uom: formData.get("to_uom"),
    factor: formData.get("factor"),
    status: formData.get("status") ?? "active",
  });
}

export async function createUomConversion(formData: FormData) {
  await requirePermission("uom_conversions.create");
  const payload = uomPayload(formData);
  if (!isMockMode()) {
    const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
    const { data, error } = await supabase.from("uom_conversions").insert({ ...payload, company_id: actor.companyId }).select("id").single();
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "uom_conversion", entityId: data.id, activityType: "created", message: `${payload.from_uom} to ${payload.to_uom} conversion created` });
  }
  revalidatePath("/uom-conversions");
  redirect("/uom-conversions");
}

export async function updateUomConversion(id: string, formData: FormData) {
  await requirePermission("uom_conversions.update");
  const conversionId = parseRecordId(id);
  const payload = uomPayload(formData);
  if (!isMockMode()) {
    const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
    const { data, error } = await supabase.from("uom_conversions").update(payload).eq("id", conversionId).eq("company_id", actor.companyId).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("UOM conversion was not found or is outside your workspace.");
    await writeActivityLog({ entityType: "uom_conversion", entityId: id, activityType: "updated", message: `${payload.from_uom} to ${payload.to_uom} conversion updated` });
  }
  revalidatePath("/uom-conversions");
  redirect("/uom-conversions");
}

export async function deleteUomConversion(id: string) {
  await requirePermissionOrRedirect("uom_conversions.update", "/uom-conversions");
  try {
    const conversionId = parseRecordId(id);
    if (!isMockMode()) {
      const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
      const { data, error } = await supabase.from("uom_conversions").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", conversionId).eq("company_id", actor.companyId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("UOM conversion was not found or is outside your workspace.");
      await writeActivityLog({ entityType: "uom_conversion", entityId: id, activityType: "archived", message: "UOM conversion archived" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/uom-conversions", "error", formatActionError(error, "Could not archive this UOM conversion."));
  }
  revalidatePath("/uom-conversions");
  safeRedirectWithMessage("/uom-conversions", "success", "UOM conversion archived.");
}

export async function restoreUomConversion(id: string) {
  await requirePermissionOrRedirect("uom_conversions.update", `/uom-conversions/${id}`);
  try {
    const conversionId = parseRecordId(id);
    if (!isMockMode()) {
      const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
      const { data, error } = await supabase.from("uom_conversions").update({ status: "active", deleted_at: null }).eq("id", conversionId).eq("company_id", actor.companyId).select("id").maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("UOM conversion was not found or is outside your workspace.");
      await writeActivityLog({ entityType: "uom_conversion", entityId: id, activityType: "restored", message: "UOM conversion restored" });
    }
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/uom-conversions/${id}`, "error", formatActionError(error, "Could not restore this UOM conversion."));
  }
  revalidatePath("/uom-conversions");
  revalidatePath(`/uom-conversions/${id}`);
  safeRedirectWithMessage(`/uom-conversions/${id}`, "success", "UOM conversion restored.");
}
