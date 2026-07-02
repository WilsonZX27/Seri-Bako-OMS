import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";
import type { Database } from "@/types/database";

const quickItemSchema = z.object({
  item_name: z.string().trim().min(1, "Item name is required."),
  item_code: z.string().trim().optional().nullable(),
  category: z.string().trim().min(1, "Category is required."),
  base_unit: z.string().trim().min(1, "Base UOM is required."),
  purchase_unit: z.string().trim().min(1, "Purchase UOM is required."),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal("")),
  cost: z.coerce.number().min(0).optional().default(0),
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
    const admin = createAdminClient();
    const itemPayload: Database["public"]["Tables"]["items"]["Insert"] = {
      item_code: itemCode,
      item_name: parsed.item_name,
      category: parsed.category,
      base_unit: parsed.base_unit,
      purchase_unit: parsed.purchase_unit,
      conversion_to_base_unit: 1,
      supplier_id: parsed.supplier_id || null,
      cost: parsed.cost ?? 0,
      safety_stock: 0,
      lead_time_days: 0,
      moq: 0,
      status: "active",
    };

    const { data, error } = await admin
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

    return NextResponse.json({ ok: true, item: data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ ok: false, message: error.issues[0]?.message ?? "Please check the item details." }, { status: 400 });
    }
    console.error("Quick item create failed", error);
    return NextResponse.json({ ok: false, message: "Could not create this item." }, { status: 500 });
  }
}
