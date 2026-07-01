import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/server/activity/log";
import type { Database } from "@/types/database";

const importSchema = z.object({
  entity: z.enum(["items", "products", "suppliers", "supplier-items"]),
  rows: z.array(z.record(z.string(), z.string())).max(500),
});

function mapRows(entity: string, rows: Record<string, string>[]) {
  if (entity === "items") {
    return rows.map((row) => ({
      item_code: row.item_code,
      item_name: row.item_name,
      category: row.category,
      purchase_unit: row.purchase_unit || row.base_unit,
      base_unit: row.base_unit,
      conversion_to_base_unit: Number(row.conversion_to_base_unit || 1),
      cost: Number(row.cost || 0),
      safety_stock: Number(row.safety_stock || 0),
      lead_time_days: Number(row.lead_time_days || 0),
      moq: Number(row.moq || 0),
      status: "active" as const,
    }));
  }
  if (entity === "products") {
    return rows.map((row) => ({
      product_code: row.product_code,
      product_name: row.product_name,
      category: row.category,
      selling_unit: row.selling_unit,
      status: "active" as const,
    }));
  }
  if (entity === "suppliers") {
    return rows.map((row) => ({
      supplier_code: row.supplier_code || null,
      name: row.name,
      contact_person: row.contact_person || null,
      phone: row.phone || null,
      email: row.email || null,
      payment_terms_days: Number(row.payment_terms_days || 30),
      status: "active" as const,
    }));
  }
  return rows.map((row) => ({
    supplier_id: row.supplier_id,
    item_id: row.item_id,
    supplier_item_code: row.supplier_item_code,
    supplier_item_name: row.supplier_item_name,
    purchase_uom: row.purchase_uom,
    conversion_to_base_uom: Number(row.conversion_to_base_uom || 1),
    unit_cost: Number(row.unit_cost || 0),
    moq: Number(row.moq || 0),
    lead_time_days: Number(row.lead_time_days || 0),
    status: "active" as const,
  }));
}

export async function POST(request: Request) {
  const parsed = importSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ imported: 0, message: "Invalid import request." }, { status: 400 });
  }

  if (isMockMode()) {
    return NextResponse.json({ imported: parsed.data.rows.length, message: `${parsed.data.rows.length} valid rows accepted in mock mode.` });
  }

  const supabase = await createClient();
  const rows = mapRows(parsed.data.entity, parsed.data.rows);
  const { error } =
    parsed.data.entity === "items"
      ? await supabase.from("items").insert(rows as Database["public"]["Tables"]["items"]["Insert"][])
      : parsed.data.entity === "products"
        ? await supabase.from("products").insert(rows as Database["public"]["Tables"]["products"]["Insert"][])
        : parsed.data.entity === "suppliers"
          ? await supabase.from("suppliers").insert(rows as Database["public"]["Tables"]["suppliers"]["Insert"][])
          : await supabase.from("supplier_items").insert(rows as Database["public"]["Tables"]["supplier_items"]["Insert"][]);
  if (error) {
    return NextResponse.json({ imported: 0, message: error.message }, { status: 400 });
  }

  await writeActivityLog({
    entityType: "import",
    entityId: "00000000-0000-0000-0000-000000000000",
    activityType: "master_data_imported",
    message: `${parsed.data.rows.length} ${parsed.data.entity} rows imported`,
  });

  return NextResponse.json({ imported: parsed.data.rows.length });
}
