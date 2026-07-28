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

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseRecordId(id: string) {
  return z.uuid().parse(id);
}

function supplierItemPayload(formData: FormData) {
  const parsed = supplierItemSchema.parse({
    supplier_id: formData.get("supplier_id"),
    item_id: formData.get("item_id"),
    supplier_item_code: formData.get("supplier_item_code"),
    supplier_item_name: formData.get("supplier_item_name"),
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
  const payload = supplierItemPayload(formData);
  if (!isMockMode()) {
    const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
    const { data, error } = await supabase.from("supplier_items").insert({ ...payload, company_id: actor.companyId }).select("id").single();
    if (error) throw new Error(error.message);
    await writeActivityLog({ entityType: "supplier_item", entityId: data.id, activityType: "created", message: `Supplier item ${payload.supplier_item_code} created` });
  }
  revalidatePath("/supplier-items");
  redirect("/supplier-items");
}

export async function updateSupplierItem(id: string, formData: FormData) {
  await requirePermission("supplier_items.update");
  const supplierItemId = parseRecordId(id);
  const payload = supplierItemPayload(formData);
  if (!isMockMode()) {
    const [supabase, actor] = [await createClient(), await requireActiveTenantActor()];
    const { data, error } = await supabase.from("supplier_items").update(payload).eq("id", supplierItemId).eq("company_id", actor.companyId).select("id").maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Supplier item was not found or is outside your workspace.");
    await writeActivityLog({ entityType: "supplier_item", entityId: id, activityType: "updated", message: `Supplier item ${payload.supplier_item_code} updated` });
  }
  revalidatePath("/supplier-items");
  redirect("/supplier-items");
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
