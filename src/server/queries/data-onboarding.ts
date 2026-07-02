import { createClient } from "@/lib/supabase/server";

export async function getDataOnboardingSummary() {
  const supabase = await createClient();
  const [
    company,
    branches,
    staffs,
    roles,
    items,
    suppliers,
    supplierItems,
    uomConversions,
    barcodeMappings,
    openingStock,
    recipes,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("branches").select("id, default_location_id", { count: "exact" }).is("deleted_at", null),
    supabase.from("staffs").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("roles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("items").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("supplier_items").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("uom_conversions").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("barcode_mappings").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("stock_transactions").select("id", { count: "exact", head: true }).eq("transaction_type", "opening_balance"),
    supabase.from("recipes").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  const branchRows = branches.data ?? [];
  const branchesMissingDefault = branchRows.filter((row) => !row.default_location_id).length;

  return {
    companyCount: company.count ?? 0,
    branchCount: branches.count ?? branchRows.length,
    branchesMissingDefault,
    staffCount: staffs.count ?? 0,
    roleCount: roles.count ?? 0,
    itemCount: items.count ?? 0,
    supplierCount: suppliers.count ?? 0,
    supplierItemCount: supplierItems.count ?? 0,
    uomCount: uomConversions.count ?? 0,
    barcodeCount: barcodeMappings.count ?? 0,
    openingStockCount: openingStock.count ?? 0,
    recipeCount: recipes.count ?? 0,
  };
}
