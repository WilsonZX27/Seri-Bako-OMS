"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";

const schema = z.object({
  product_id: z.string().uuid(),
  item_id: z.union([z.string().uuid(), z.literal("")]),
  factor: z.coerce.number().positive().max(1_000_000),
});

export async function saveOutletPackagingLink(formData: FormData) {
  await requirePermission("outlet_daily_record.view_all");
  const actor = await requireActiveTenantActor();
  if (!["super_admin", "manager", "purchasing"].includes(actor.roleCode)) throw new Error("Packaging mapping is restricted to operations management.");
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/outlet-packaging?error=Check+the+item+and+unit+factor");
  const { product_id: productId, item_id: itemId, factor } = parsed.data;
  const db = await createClient();
  const { data: product, error: productError } = await db.from("products")
    .select("id,category").eq("id", productId).eq("company_id", actor.companyId).is("deleted_at", null).single();
  if (productError || product?.category.trim().toLowerCase() !== "packaging") redirect("/outlet-packaging?error=Packaging+product+not+found");
  if (itemId) {
    const { data: item, error: itemError } = await db.from("items")
      .select("id,category").eq("id", itemId).eq("company_id", actor.companyId).is("deleted_at", null).single();
    if (itemError || item?.category.trim().toLowerCase() !== "packaging") redirect("/outlet-packaging?error=Packaging+inventory+item+not+found");
    const { error } = await db.from("outlet_packaging_item_links").upsert({
      product_id: productId,
      company_id: actor.companyId,
      item_id: itemId,
      item_base_units_per_product_unit: factor,
      updated_by: actor.staffId,
    }, { onConflict: "product_id" });
    if (error) redirect(`/outlet-packaging?error=${encodeURIComponent(error.code === "23505" ? "That inventory item is already linked to another packaging product" : "Unable to save mapping; check database migration 318")}`);
  } else {
    const { error } = await db.from("outlet_packaging_item_links").delete().eq("product_id", productId).eq("company_id", actor.companyId);
    if (error) redirect("/outlet-packaging?error=Unable+to+remove+mapping");
  }
  revalidatePath("/outlet-packaging");
  redirect("/outlet-packaging?success=Mapping+saved");
}
