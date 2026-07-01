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
      purchase_unit: row.purchase_unit || row.purchase_uom || row.base_unit || row.base_uom,
      base_unit: row.base_unit || row.base_uom,
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
      name: row.name || row.supplier_name,
      contact_person: row.contact_person || null,
      phone: row.phone || null,
      email: row.email || null,
      address: row.address || null,
      payment_terms_days: Number(row.payment_terms_days || row.payment_terms || 30),
      status: "active" as const,
    }));
  }
  return rows.map((row) => ({
    supplier_id: row.supplier_id,
    item_id: row.item_id,
    supplier_item_code: row.supplier_item_code,
    supplier_item_name: row.supplier_item_name,
    purchase_uom: row.purchase_uom,
    conversion_to_base_uom: Number(row.conversion_to_base_uom || row.conversion_rate || 1),
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
  let inputRows = parsed.data.rows;
  if (parsed.data.entity === "supplier-items") {
    const supplierCodes = inputRows.map((row) => row.supplier_code).filter(Boolean);
    const itemCodes = inputRows.map((row) => row.item_code).filter(Boolean);
    const [{ data: suppliers, error: suppliersError }, { data: items, error: itemsError }] = await Promise.all([
      supabase.from("suppliers").select("id,supplier_code,name").in("supplier_code", supplierCodes.length ? supplierCodes : [""]),
      supabase.from("items").select("id,item_code").in("item_code", itemCodes.length ? itemCodes : [""]),
    ]);
    if (suppliersError || itemsError) {
      return NextResponse.json({ imported: 0, message: "Could not validate supplier or item references." }, { status: 400 });
    }
    const supplierIds = new Map((suppliers ?? []).map((supplier) => [String(supplier.supplier_code ?? "").toLowerCase(), supplier.id]));
    const itemIds = new Map((items ?? []).map((item) => [String(item.item_code ?? "").toLowerCase(), item.id]));
    const missing = inputRows.find((row) => !supplierIds.get(String(row.supplier_code ?? "").toLowerCase()) || !itemIds.get(String(row.item_code ?? "").toLowerCase()));
    if (missing) {
      return NextResponse.json({ imported: 0, message: "Supplier Items import has a supplier_code or item_code that does not exist yet." }, { status: 400 });
    }
    inputRows = inputRows.map((row) => ({
      ...row,
      supplier_id: supplierIds.get(String(row.supplier_code ?? "").toLowerCase()) ?? "",
      item_id: itemIds.get(String(row.item_code ?? "").toLowerCase()) ?? "",
    }));
  }

  const rows = mapRows(parsed.data.entity, inputRows);
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
