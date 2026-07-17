import { isMockMode, mockItems, mockProducts, mockRecipeLines, mockRecipes, mockSupplierItems, mockSuppliers } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";

export type CostingIssue = {
  id: string;
  severity: "critical" | "warning" | "info";
  module: "item" | "supplier_item" | "recipe" | "product";
  record: string;
  reason: string;
  action: string;
  href: string;
};

type Filters = { severity?: string; module?: string };
type Data = {
  items: typeof mockItems;
  suppliers: typeof mockSuppliers;
  supplierItems: typeof mockSupplierItems;
  products: typeof mockProducts;
  recipes: typeof mockRecipes;
  recipeLines: typeof mockRecipeLines;
};

const active = (row: { status: string; deleted_at?: string | null }) => row.status === "active" && !row.deleted_at;
const record = (code: string, name: string) => `${code} — ${name}`;

export function buildCostingReadiness(data: Data, filters: Filters = {}) {
  const issues: CostingIssue[] = [];
  const itemById = new Map(data.items.map((row) => [row.id, row]));
  const supplierById = new Map(data.suppliers.map((row) => [row.id, row]));
  const recipesByProduct = new Map<string, typeof data.recipes>();
  for (const recipe of data.recipes) recipesByProduct.set(recipe.product_id, [...(recipesByProduct.get(recipe.product_id) ?? []), recipe]);

  for (const item of data.items.filter(active)) {
    const target = record(item.item_code, item.item_name);
    if (Number(item.cost) <= 0) issues.push({ id: `item-cost-${item.id}`, severity: "critical", module: "item", record: target, reason: "No positive item cost basis.", action: "Add item cost.", href: `/items/${item.id}` });
    if (!item.base_unit || !item.category) issues.push({ id: `item-core-${item.id}`, severity: "warning", module: "item", record: target, reason: "Base UOM or category is missing.", action: "Complete the item master fields used by costing.", href: `/items/${item.id}` });
  }

  for (const row of data.supplierItems.filter(active)) {
    const item = itemById.get(row.item_id);
    const supplier = supplierById.get(row.supplier_id);
    const target = record(row.supplier_item_code, row.supplier_item_name);
    if (Number(row.unit_cost) <= 0) issues.push({ id: `supplier-price-${row.id}`, severity: "critical", module: "supplier_item", record: target, reason: "No positive supplier purchase price.", action: "Review supplier price.", href: `/supplier-items/${row.id}` });
    if (!row.purchase_uom || Number(row.conversion_to_base_uom) <= 0) issues.push({ id: `supplier-uom-${row.id}`, severity: "warning", module: "supplier_item", record: target, reason: "Purchase UOM or conversion is missing.", action: "Complete the supplier-item UOM conversion.", href: `/supplier-items/${row.id}` });
    if (!item || !active(item) || !supplier || !active(supplier)) issues.push({ id: `supplier-link-${row.id}`, severity: "warning", module: "supplier_item", record: target, reason: "Linked supplier or item is inactive or unavailable.", action: "Review inactive reference.", href: `/supplier-items/${row.id}` });
  }

  for (const recipe of data.recipes.filter(active)) {
    const lines = data.recipeLines.filter((line) => line.recipe_id === recipe.id);
    const target = recipe.recipe_no;
    if (!lines.length) issues.push({ id: `recipe-lines-${recipe.id}`, severity: "critical", module: "recipe", record: target, reason: "Active recipe has no ingredient lines.", action: "Add recipe lines.", href: `/recipes/${recipe.id}` });
    if (Number(recipe.yield_qty) <= 0 || !recipe.yield_unit) issues.push({ id: `recipe-yield-${recipe.id}`, severity: "critical", module: "recipe", record: target, reason: "Output quantity or UOM is missing.", action: "Set a valid recipe output quantity and UOM.", href: `/recipes/${recipe.id}` });
    for (const line of lines) {
      const item = itemById.get(line.ingredient_item_id);
      if (!item || !active(item)) issues.push({ id: `recipe-item-${line.id}`, severity: "critical", module: "recipe", record: target, reason: "Recipe ingredient is inactive or unavailable.", action: "Replace or reactivate the ingredient before costing.", href: `/recipes/${recipe.id}` });
      else if (Number(line.cost_per_unit) <= 0 || Number(item.cost) <= 0) issues.push({ id: `recipe-cost-${line.id}`, severity: "critical", module: "recipe", record: target, reason: `Ingredient ${item.item_code} has no positive cost basis.`, action: "Set the ingredient item cost and recipe line cost basis.", href: `/recipes/${recipe.id}` });
    }
  }

  for (const product of data.products.filter(active)) {
    const recipes = recipesByProduct.get(product.id) ?? [];
    if (!recipes.some(active)) issues.push({ id: `product-recipe-${product.id}`, severity: "critical", module: "product", record: record(product.product_code, product.product_name), reason: "No linked active recipe/BOM.", action: "Link active recipe.", href: `/products/${product.id}` });
  }

  const filtered = issues.filter((issue) => (!filters.severity || filters.severity === "all" || issue.severity === filters.severity) && (!filters.module || filters.module === "all" || issue.module === filters.module));
  const summary = { total: issues.length, critical: issues.filter((issue) => issue.severity === "critical").length, warning: issues.filter((issue) => issue.severity === "warning").length, info: issues.filter((issue) => issue.severity === "info").length };
  return { issues: filtered, summary, readiness: summary.critical ? "Not ready" : summary.warning ? "Needs cleanup" : "Ready" };
}

export async function getCostingReadiness(filters: Filters = {}) {
  await requirePermission("reports.view");
  if (isMockMode()) return buildCostingReadiness({ items: mockItems, suppliers: mockSuppliers, supplierItems: mockSupplierItems, products: mockProducts, recipes: mockRecipes, recipeLines: mockRecipeLines }, filters);

  const supabase = await createClient();
  const [items, suppliers, supplierItems, products, recipes, recipeLines] = await Promise.all([
    supabase.from("items").select("*").is("deleted_at", null),
    supabase.from("suppliers").select("*").is("deleted_at", null),
    supabase.from("supplier_items").select("*").is("deleted_at", null),
    supabase.from("products").select("*"),
    supabase.from("recipes").select("*").is("deleted_at", null),
    supabase.from("recipe_lines").select("*"),
  ]);
  for (const result of [items, suppliers, supplierItems, products, recipes, recipeLines]) if (result.error) throw new Error(result.error.message);
  return buildCostingReadiness({
    items: items.data ?? [], suppliers: suppliers.data ?? [], supplierItems: supplierItems.data ?? [], products: products.data ?? [], recipes: recipes.data ?? [], recipeLines: recipeLines.data ?? [],
  }, filters);
}
