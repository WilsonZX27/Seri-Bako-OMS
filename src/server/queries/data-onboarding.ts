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
    locations,
    openingStock,
    recipes,
  ] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("branches").select("id, default_location_id", { count: "exact" }).is("deleted_at", null),
    supabase.from("staffs").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("roles").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("items").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("supplier_items").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("uom_conversions").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("locations").select("id, branch_id, location_name, deleted_at").order("created_at", { ascending: true }),
    supabase.from("stock_transactions").select("id", { count: "exact", head: true }).eq("transaction_type", "opening_balance"),
    supabase.from("recipes").select("id", { count: "exact", head: true }).is("deleted_at", null),
  ]);

  const branchRows = branches.data ?? [];
  const branchesMissingDefault = branchRows.filter((row) => !row.default_location_id).length;
  const duplicateLocationCandidates = Object.values(
    (locations.data ?? []).reduce<Record<string, number>>((accumulator, location) => {
      if (location.deleted_at) return accumulator;
      const key = `${location.branch_id ?? "global"}|${String(location.location_name ?? "").trim().toLowerCase()}`;
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {}),
  ).filter((count) => count > 1).length;

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
    locationCount: (locations.data ?? []).filter((location) => !location.deleted_at).length,
    duplicateLocationCandidates,
    openingStockCount: openingStock.count ?? 0,
    recipeCount: recipes.count ?? 0,
  };
}
