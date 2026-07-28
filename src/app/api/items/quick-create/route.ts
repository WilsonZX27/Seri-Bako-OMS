import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { normalizeUom } from "@/lib/uom";
import { hasPermission } from "@/server/auth/permissions";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { logServerError } from "@/server/observability/logger";
import type { Database } from "@/types/database";

const quickItemSchema = z.object({
  item_name: z.string().trim().min(1, "Item name is required.").max(160, "Item name is too long."),
  item_code: z.string().trim().max(64, "Item code is too long.").optional().nullable(),
  category: z.string().trim().min(1, "Category is required.").max(80, "Category is too long."),
  base_unit: z.string().trim().min(1, "Base UOM is required.").max(32, "Base UOM is too long."),
  purchase_unit: z.string().trim().min(1, "Purchase UOM is required.").max(32, "Purchase UOM is too long."),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal("")),
  cost: z.coerce.number().finite("Cost must be a valid number.").min(0).max(1_000_000, "Cost exceeds the permitted limit.").optional().default(0),
  moq: z.coerce.number().finite("MOQ must be a valid number.").min(0).max(1_000_000, "MOQ exceeds the permitted limit.").optional().default(0),
  lead_time_days: z.coerce.number().finite("Lead time must be a valid number.").int().min(0).max(3_650, "Lead time exceeds the permitted limit.").optional().default(0),
});

function generateItemCode(itemName: string) {
  const compact = itemName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 14);
  return `${compact || "ITEM"}-${Date.now().toString().slice(-5)}`;
}

export async function POST(request: Request) {
  const crossSiteResponse = rejectCrossSiteMutation(request);
  if (crossSiteResponse) return crossSiteResponse;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "Please sign in before creating an item." }, { status: 401 });
  }

  if (!(await hasPermission("items.create"))) {
    return NextResponse.json({ ok: false, message: "You do not have permission to create items." }, { status: 403 });
  }

  try {
    const parsed = quickItemSchema.parse(await request.json());
    const itemCode = parsed.item_code?.trim() || generateItemCode(parsed.item_name);
    const actor = await requireActiveTenantActor();
    const baseUnit = normalizeUom(parsed.base_unit);
    const purchaseUnit = normalizeUom(parsed.purchase_unit);

    if (parsed.supplier_id) {
      // Even if a foreign key is syntactically valid, never associate a new
      // item with a supplier outside the actor's tenant/RLS scope.
      const { data: supplier, error: supplierError } = await supabase
        .from("suppliers")
        .select("id")
        .eq("id", parsed.supplier_id)
        .eq("company_id", actor.companyId)
        .is("deleted_at", null)
        .maybeSingle();
      if (supplierError || !supplier) {
        return NextResponse.json({ ok: false, message: "The selected supplier is unavailable." }, { status: 400 });
      }
    }

    const itemPayload: Database["public"]["Tables"]["items"]["Insert"] = {
      company_id: actor.companyId,
      item_code: itemCode,
      item_name: parsed.item_name,
      category: parsed.category,
      base_unit: baseUnit,
      purchase_unit: purchaseUnit,
      conversion_to_base_unit: 1,
      supplier_id: parsed.supplier_id || null,
      cost: parsed.cost ?? 0,
      safety_stock: 0,
      lead_time_days: parsed.lead_time_days ?? 0,
      moq: parsed.moq ?? 0,
      status: "active",
    };

    const { data, error } = await supabase
      .from("items")
      .insert(itemPayload)
      .select("id, item_code, item_name, base_unit, purchase_unit, supplier_id, cost, status")
      .single();

    if (error) {
      const message = error.message.toLowerCase().includes("duplicate")
        ? "An item with this code already exists."
        : "Could not create this item.";
      return NextResponse.json({ ok: false, message }, { status: 400 });
    }

    if (parsed.supplier_id) {
      try {
        const canCreateSupplierItem = await hasPermission("supplier_items.create");
        if (canCreateSupplierItem) {
          const supplierItemPayload: Database["public"]["Tables"]["supplier_items"]["Insert"] = {
            company_id: actor.companyId,
            supplier_id: parsed.supplier_id,
            item_id: data.id,
            supplier_item_code: itemCode,
            supplier_item_name: parsed.item_name,
            purchase_uom: purchaseUnit,
            conversion_to_base_uom: 1,
            unit_cost: parsed.cost ?? 0,
            moq: parsed.moq ?? 0,
            lead_time_days: parsed.lead_time_days ?? 0,
            status: "active",
          };
          const { error: supplierItemError } = await supabase.from("supplier_items").insert(supplierItemPayload);
          if (supplierItemError) {
            logServerError(supplierItemError, { source: "api.items.quick-create.supplier-item", actorId: user.id, companyId: actor.companyId });
          }
        }
      } catch (supplierError) {
        logServerError(supplierError, { source: "api.items.quick-create.supplier-item", actorId: user.id, companyId: actor.companyId });
      }
    }

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message ?? "Please check the item details." }, { status: 400 });
    }
    logServerError(error, { source: "api.items.quick-create", actorId: user.id });
    return NextResponse.json({ ok: false, message: "Could not create this item." }, { status: 500 });
  }
}
