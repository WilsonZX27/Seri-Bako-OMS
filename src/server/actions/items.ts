"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { itemSchema } from "@/lib/validations/item";
import { upsertPrimaryBarcodeMapping } from "@/server/actions/barcodes";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function payload(formData: FormData) {
  const baseUnit = formData.get("base_unit");
  const parsed = itemSchema.parse({
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
    status: formData.get("status") ?? "active",
    item_image_url: cleanText(formData.get("item_image_url")),
    barcode: cleanText(formData.get("barcode")),
    qr_code: cleanText(formData.get("qr_code")),
    supplier_barcode: cleanText(formData.get("supplier_barcode")),
    internal_barcode: cleanText(formData.get("internal_barcode")),
    barcode_type: formData.get("barcode_type") || "internal",
    barcode_image_url: cleanText(formData.get("barcode_image_url")),
  });

  return {
    ...parsed,
    supplier_id: parsed.supplier_id || null,
    autocount_code: parsed.autocount_code || null,
    item_image_url: parsed.item_image_url || null,
  };
}

export async function createItem(formData: FormData) {
  if (isMockMode()) {
    redirect("/items");
  }

  const supabase = await createClient();
  const itemPayload = payload(formData);
  const { data, error } = await supabase.from("items").insert(itemPayload).select("id").single();
  if (error) throw new Error(error.message);
  await upsertPrimaryBarcodeMapping({ entityType: "item", entityId: data.id, barcodeValue: itemPayload.barcode, barcodeType: itemPayload.barcode_type });

  revalidatePath("/items");
  redirect("/items");
}

export async function updateItem(id: string, formData: FormData) {
  if (isMockMode()) {
    redirect("/items");
  }

  const supabase = await createClient();
  const itemPayload = payload(formData);
  const { error } = await supabase.from("items").update(itemPayload).eq("id", id);
  if (error) throw new Error(error.message);
  await upsertPrimaryBarcodeMapping({ entityType: "item", entityId: id, barcodeValue: itemPayload.barcode, barcodeType: itemPayload.barcode_type });

  revalidatePath("/items");
  revalidatePath("/stock-balances");
  revalidatePath("/low-stock");
  redirect("/items");
}

export async function deleteItem(id: string) {
  if (isMockMode()) {
    revalidatePath("/items");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/items");
}
