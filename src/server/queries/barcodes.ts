import { isMockMode, mockBarcodeMappings, mockItems, mockProducts } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";

export type BarcodeLookupResult = {
  found: boolean;
  barcode: string;
  stock_entity_type?: "item" | "product";
  id?: string;
  code?: string;
  name?: string;
  uom?: string;
  image_url?: string | null;
  current_stock?: number;
};

export async function getDefaultCompanyId() {
  if (isMockMode()) return "company-seri-bako";

  const supabase = await createClient();
  const { data, error } = await supabase.from("companies").select("id").is("deleted_at", null).order("created_at", { ascending: true }).limit(1).single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  const value = barcode.trim();
  if (!value) return { found: false, barcode: value };

  if (isMockMode()) {
    const mapping = mockBarcodeMappings.find((row) => row.barcode_value === value && row.status === "active");
    if (!mapping) return { found: false, barcode: value };
    if (mapping.stock_entity_type === "item") {
      const item = mockItems.find((row) => row.id === mapping.item_id);
      return item
        ? { found: true, barcode: value, stock_entity_type: "item", id: item.id, code: item.item_code, name: item.item_name, uom: item.base_unit, image_url: item.barcode_image_url, current_stock: 0 }
        : { found: false, barcode: value };
    }
    const product = mockProducts.find((row) => row.id === mapping.product_id);
    return product
      ? { found: true, barcode: value, stock_entity_type: "product", id: product.id, code: product.product_code, name: product.product_name, uom: product.selling_unit, image_url: product.barcode_image_url, current_stock: 0 }
      : { found: false, barcode: value };
  }

  const supabase = await createClient();
  const { data: mapping, error } = await supabase
    .from("barcode_mappings")
    .select("*")
    .eq("barcode_value", value)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!mapping) return { found: false, barcode: value };

  if (mapping.stock_entity_type === "item" && mapping.item_id) {
    const { data: item, error: itemError } = await supabase.from("items").select("*").eq("id", mapping.item_id).single();
    if (itemError) throw new Error(itemError.message);
    return { found: true, barcode: value, stock_entity_type: "item", id: item.id, code: item.item_code, name: item.item_name, uom: item.base_unit, image_url: item.barcode_image_url, current_stock: 0 };
  }

  if (mapping.stock_entity_type === "product" && mapping.product_id) {
    const { data: product, error: productError } = await supabase.from("products").select("*").eq("id", mapping.product_id).single();
    if (productError) throw new Error(productError.message);
    return { found: true, barcode: value, stock_entity_type: "product", id: product.id, code: product.product_code, name: product.product_name, uom: product.selling_unit, image_url: product.barcode_image_url, current_stock: 0 };
  }

  return { found: false, barcode: value };
}

export async function getPrimaryBarcodeForEntity(entityType: "item" | "product", entityId: string) {
  if (isMockMode()) {
    return mockBarcodeMappings.find((row) => row.stock_entity_type === entityType && (entityType === "item" ? row.item_id === entityId : row.product_id === entityId) && row.is_primary && row.status === "active") ?? null;
  }

  const supabase = await createClient();
  const query = supabase
    .from("barcode_mappings")
    .select("*")
    .eq("stock_entity_type", entityType)
    .eq("is_primary", true)
    .eq("status", "active")
    .is("deleted_at", null);
  const { data, error } = await (entityType === "item" ? query.eq("item_id", entityId) : query.eq("product_id", entityId)).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
