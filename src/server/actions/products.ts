"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validations/product";
import { normalizeUom } from "@/lib/uom";
import { requirePermissionOrRedirect } from "@/server/actions/error-handling";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { uploadMasterDataImage } from "@/server/storage/master-data-image";
import { z } from "zod";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseProductId(id: string) {
  return z.string().uuid("The product identifier is invalid.").parse(id);
}

const packagingSchema = z.object({
  product_id: z.string().uuid("The product identifier is invalid."),
  packaging_name: z.string().trim().min(1, "Packaging name is required.").max(120, "Packaging name must be 120 characters or fewer."),
  selling_uom: z.string().trim().min(1, "Selling UOM is required.").max(32, "Selling UOM must be 32 characters or fewer."),
  units_per_pack: z.coerce.number().positive("Units per pack must be more than zero.").max(1_000_000, "Units per pack is too large."),
  min_order_qty: z.literal(1),
  price: z.coerce.number().min(0, "Price cannot be negative.").max(1_000_000_000, "Price is too large."),
  status: z.literal("active"),
});

function payload(formData: FormData) {
  return productSchema.parse({
    product_code: formData.get("product_code"),
    product_name: formData.get("product_name"),
    category: formData.get("category"),
    display_order: formData.get("display_order") || 9999,
    selling_unit: normalizeUom(String(formData.get("selling_unit") ?? "")),
    status: formData.get("status") ?? "active",
  });
}

function packagingPayload(productId: string, formData: FormData) {
  const packagingName = String(formData.get("packaging_name") ?? "").trim();
  return packagingSchema.parse({
    product_id: productId,
    packaging_name: packagingName || "Default Pack",
    selling_uom: normalizeUom(String(formData.get("packaging_selling_uom") ?? "")) || normalizeUom(String(formData.get("selling_unit") ?? "")),
    units_per_pack: Number(formData.get("units_per_pack") ?? 1),
    min_order_qty: 1,
    price: Number(formData.get("price") ?? 0),
    status: "active",
  });
}

async function upsertDefaultPackaging(productId: string, formData: FormData) {
  const supabase = await createClient();
  const packagingId = cleanText(formData.get("packaging_id"));
  const data = packagingPayload(productId, formData);
  if (packagingId) {
    const validatedPackagingId = z.string().uuid("The packaging identifier is invalid.").parse(packagingId);
    // Keep a submitted packaging ID bound to the product being edited. This
    // prevents a valid same-tenant ID from moving another product's packaging.
    const { error } = await supabase
      .from("product_packaging")
      .update(data)
      .eq("id", validatedPackagingId)
      .eq("product_id", productId);
    if (error) throw new Error(error.message);
    return;
  }
  const { error } = await supabase.from("product_packaging").insert(data);
  if (error) throw new Error(error.message);
}

export async function createProduct(formData: FormData) {
  await requirePermissionOrRedirect("production.create", "/products/new");
  if (isMockMode()) {
    redirect("/products");
  }

  const supabase = await createClient();
  const actor = await requireActiveTenantActor();
  const productPayload = payload(formData);
  const { data, error } = await supabase.from("products").insert({ ...productPayload, company_id: actor.companyId }).select("id").single();
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
  await requirePermissionOrRedirect("production.create", `/products/${id}`);
  if (isMockMode()) {
    redirect("/products");
  }

  const productId = parseProductId(id);
  const supabase = await createClient();
  const actor = await requireActiveTenantActor();
  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("id")
    .eq("id", productId)
    .eq("company_id", actor.companyId)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (!existing) throw new Error("Product was not found or is outside your workspace.");
  const productPayload = payload(formData);
  const imageUrl = await uploadMasterDataImage("products", productId, formData.get("product_image"));
  const { error } = await supabase.from("products").update({ ...productPayload, ...(imageUrl ? { product_image_url: imageUrl } : {}) }).eq("id", productId).eq("company_id", actor.companyId);
  if (error) throw new Error(error.message);
  await upsertDefaultPackaging(productId, formData);

  revalidatePath("/products");
  redirect("/products");
}

export async function deleteProduct(id: string) {
  await requirePermissionOrRedirect("production.create", `/products/${id}`);
  if (isMockMode()) {
    redirect("/products");
  }

  const productId = parseProductId(id);
  const supabase = await createClient();
  const actor = await requireActiveTenantActor();
  const { error } = await supabase.from("products").update({ status: "inactive" }).eq("id", productId).eq("company_id", actor.companyId);
  if (error) throw new Error(error.message);

  revalidatePath("/products");
  redirect("/products?success=Product%20deactivated.");
}

export async function restoreProduct(id: string) {
  await requirePermissionOrRedirect("production.create", `/products/${id}`);
  if (!isMockMode()) {
    const productId = parseProductId(id);
    const supabase = await createClient();
    const actor = await requireActiveTenantActor();
    const { error } = await supabase.from("products").update({ status: "active" }).eq("id", productId).eq("company_id", actor.companyId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/products");
  redirect(`/products/${id}?success=Product%20restored.`);
}
