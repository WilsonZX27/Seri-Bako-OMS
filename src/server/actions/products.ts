"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";
import { uploadMasterDataImage } from "@/server/storage/master-data-image";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function payload(formData: FormData) {
  return productSchema.parse({
    product_code: formData.get("product_code"),
    product_name: formData.get("product_name"),
    category: formData.get("category"),
    selling_unit: formData.get("selling_unit"),
    status: formData.get("status") ?? "active",
  });
}

function packagingPayload(productId: string, formData: FormData) {
  const packagingName = String(formData.get("packaging_name") ?? "").trim();
  return {
    product_id: productId,
    packaging_name: packagingName || "Default Pack",
    selling_uom: String(formData.get("packaging_selling_uom") ?? "").trim() || String(formData.get("selling_unit") ?? "").trim(),
    units_per_pack: Number(formData.get("units_per_pack") ?? 1),
    min_order_qty: 1,
    price: Number(formData.get("price") ?? 0),
    status: "active" as const,
  };
}

async function upsertDefaultPackaging(productId: string, formData: FormData) {
  const supabase = await createClient();
  const packagingId = cleanText(formData.get("packaging_id"));
  const data = packagingPayload(productId, formData);
  if (packagingId) {
    const { error } = await supabase.from("product_packaging").update(data).eq("id", packagingId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("product_packaging").insert(data);
  if (error) throw new Error(error.message);
}

export async function createProduct(formData: FormData) {
  if (isMockMode()) {
    redirect("/products");
  }

  const supabase = await createClient();
  const productPayload = payload(formData);
  const { data, error } = await supabase.from("products").insert(productPayload).select("id").single();
  if (error) throw new Error(error.message);
  const imageUrl = await uploadMasterDataImage("products", data.id, formData.get("product_image"));
  if (imageUrl) {
    const { error: imageError } = await supabase.from("products").update({ product_image_url: imageUrl }).eq("id", data.id);
    if (imageError) throw new Error(imageError.message);
  }
  await upsertDefaultPackaging(data.id, formData);

  revalidatePath("/products");
  redirect("/products");
}

export async function updateProduct(id: string, formData: FormData) {
  if (isMockMode()) {
    redirect("/products");
  }

  const supabase = await createClient();
  const productPayload = payload(formData);
  const imageUrl = await uploadMasterDataImage("products", id, formData.get("product_image"));
  const { error } = await supabase.from("products").update({ ...productPayload, ...(imageUrl ? { product_image_url: imageUrl } : {}) }).eq("id", id);
  if (error) throw new Error(error.message);
  await upsertDefaultPackaging(id, formData);

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: string) {
  if (isMockMode()) {
    revalidatePath("/products");
    return;
  }

  const supabase = await createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/products");
}
