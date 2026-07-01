"use server";

import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import type { BarcodeType } from "@/types/database";
import { writeActivityLog } from "@/server/activity/log";
import { getDefaultCompanyId } from "@/server/queries/barcodes";

type UpsertBarcodeInput = {
  entityType: "item" | "product";
  entityId: string;
  barcodeValue: string | null;
  barcodeType: BarcodeType | null;
};

export async function upsertPrimaryBarcodeMapping(input: UpsertBarcodeInput) {
  if (isMockMode()) return;

  const companyId = await getDefaultCompanyId();
  const supabase = await createClient();

  const oldQuery = supabase
    .from("barcode_mappings")
    .select("*")
    .eq("company_id", companyId)
    .eq("stock_entity_type", input.entityType)
    .eq("is_primary", true)
    .eq("status", "active")
    .is("deleted_at", null);
  const { data: existing } = await (input.entityType === "item" ? oldQuery.eq("item_id", input.entityId) : oldQuery.eq("product_id", input.entityId)).maybeSingle();

  if (!input.barcodeValue) {
    if (existing) {
      const { error } = await supabase.from("barcode_mappings").update({ status: "archived", deleted_at: new Date().toISOString() }).eq("id", existing.id);
      if (error) throw new Error(error.message);
      await writeActivityLog({ entityType: input.entityType, entityId: input.entityId, activityType: "barcode_changed", message: "Primary barcode removed" });
    }
    return;
  }

  const duplicateQuery = supabase
    .from("barcode_mappings")
    .select("id, item_id, product_id")
    .eq("company_id", companyId)
    .eq("barcode_value", input.barcodeValue)
    .eq("status", "active")
    .is("deleted_at", null);
  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();
  if (duplicateError) throw new Error(duplicateError.message);
  if (duplicate && duplicate.id !== existing?.id) {
    throw new Error(`Barcode ${input.barcodeValue} is already assigned to another item or product.`);
  }

  if (existing) {
    const changed = existing.barcode_value !== input.barcodeValue || existing.barcode_type !== (input.barcodeType ?? "internal");
    const { error } = await supabase
      .from("barcode_mappings")
      .update({ barcode_value: input.barcodeValue, barcode_type: input.barcodeType ?? "internal" })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
    if (changed) {
      await writeActivityLog({ entityType: input.entityType, entityId: input.entityId, activityType: "barcode_changed", message: `Primary barcode changed to ${input.barcodeValue}` });
    }
    return;
  }

  const { error } = await supabase.from("barcode_mappings").insert({
    company_id: companyId,
    stock_entity_type: input.entityType,
    item_id: input.entityType === "item" ? input.entityId : null,
    product_id: input.entityType === "product" ? input.entityId : null,
    barcode_value: input.barcodeValue,
    barcode_type: input.barcodeType ?? "internal",
    is_primary: true,
    status: "active",
  });
  if (error) throw new Error(error.message);
  await writeActivityLog({ entityType: input.entityType, entityId: input.entityId, activityType: "barcode_added", message: `Primary barcode ${input.barcodeValue} added` });
}
