import { isMockMode, mockItems, mockProducts, mockRecipeLines, mockRecipes } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";

export type RecipeCostingRow = {
  id: string;
  product_id: string;
  recipe_no: string;
  recipe_name: string;
  status: string;
  ingredient_line_count: number;
  missing_cost_count: number;
  uom_mismatch_count: number;
  total_ingredient_cost: number | null;
  output_qty: number | null;
  output_uom: string | null;
  cost_per_output_unit: number | null;
  confidence: "High" | "Medium" | "Low";
  warning: string | null;
  action: string | null;
};

type Filters = { search?: string; status?: string; confidence?: string; missing_cost?: string };
type Data = { items: typeof mockItems; products: typeof mockProducts; recipes: typeof mockRecipes; recipeLines: typeof mockRecipeLines };

// Item master cost is the only normalized base-unit cost in the current schema.
function lineCost(line: Data["recipeLines"][number], item: Data["items"][number] | undefined) {
  if (!item || item.status !== "active" || Number(item.cost) <= 0 || Number(line.base_qty_required) <= 0 || line.base_uom !== item.base_unit) return null;
  return Number(line.base_qty_required) * Number(item.cost);
}

export function buildRecipeCosting(data: Data, filters: Filters = {}) {
  const items = new Map(data.items.map((item) => [item.id, item]));
  const products = new Map(data.products.map((product) => [product.id, product]));
  const rows = data.recipes.filter((recipe) => !recipe.deleted_at).map((recipe) => {
    const lines = data.recipeLines.filter((line) => line.recipe_id === recipe.id);
    const lineStates = lines.map((line) => {
      const item = items.get(line.ingredient_item_id);
      const uomMismatch = Boolean(item && line.base_uom !== item.base_unit);
      const missingCost = !item || item.status !== "active" || Number(item.cost) <= 0 || Number(line.base_qty_required) <= 0;
      return { cost: lineCost(line, item), missingCost, uomMismatch };
    });
    const costs = lineStates.map((line) => line.cost);
    const missingCostCount = lineStates.filter((line) => line.missingCost).length;
    const uomMismatchCount = lineStates.filter((line) => line.uomMismatch).length;
    const outputQty = Number(recipe.yield_qty) > 0 ? Number(recipe.yield_qty) : null;
    const complete = lines.length > 0 && !missingCostCount && !uomMismatchCount && outputQty && recipe.yield_unit;
    const warning = !lines.length ? "No ingredient lines." : missingCostCount ? "Missing usable item cost." : uomMismatchCount ? "Recipe line UOM does not match the item base UOM." : !outputQty || !recipe.yield_unit ? "Output quantity or UOM is missing." : recipe.approval_status !== "approved" ? "Recipe is not approved." : null;
    const action = !lines.length ? "Add recipe lines" : missingCostCount ? "Add item cost" : uomMismatchCount ? "Align UOM" : !outputQty || !recipe.yield_unit ? "Add recipe output" : null;
    const total = complete ? costs.reduce<number>((sum, cost) => sum + Number(cost), 0) : null;
    const confidence = !complete ? "Low" : warning ? "Medium" : "High";
    return {
      id: recipe.id,
      product_id: recipe.product_id,
      recipe_no: recipe.recipe_no,
      recipe_name: products.get(recipe.product_id)?.product_name ?? "Unlinked product",
      status: recipe.status,
      ingredient_line_count: lines.length,
      missing_cost_count: missingCostCount,
      uom_mismatch_count: uomMismatchCount,
      total_ingredient_cost: total,
      output_qty: outputQty,
      output_uom: recipe.yield_unit || null,
      cost_per_output_unit: total != null && outputQty ? total / outputQty : null,
      confidence,
      warning,
      action,
    } satisfies RecipeCostingRow;
  });
  const needle = filters.search?.trim().toLowerCase();
  return rows.filter((row) =>
    (!needle || `${row.recipe_no} ${row.recipe_name}`.toLowerCase().includes(needle))
    && (!filters.status || filters.status === "all" || row.status === filters.status)
    && (!filters.confidence || filters.confidence === "all" || row.confidence.toLowerCase() === filters.confidence)
    && (!filters.missing_cost || filters.missing_cost === "all" || (filters.missing_cost === "yes" ? row.missing_cost_count > 0 : row.missing_cost_count === 0)),
  );
}

export async function getRecipeCosting(filters: Filters = {}) {
  await requirePermission("reports.view");
  if (isMockMode()) return buildRecipeCosting({ items: mockItems, products: mockProducts, recipes: mockRecipes, recipeLines: mockRecipeLines }, filters);
  const supabase = await createClient();
  const [items, products, recipes, recipeLines] = await Promise.all([
    supabase.from("items").select("*").is("deleted_at", null),
    supabase.from("products").select("*").is("deleted_at", null),
    supabase.from("recipes").select("*").is("deleted_at", null),
    supabase.from("recipe_lines").select("*"),
  ]);
  for (const result of [items, products, recipes, recipeLines]) if (result.error) throw new Error(result.error.message);
  return buildRecipeCosting({ items: items.data ?? [], products: products.data ?? [], recipes: recipes.data ?? [], recipeLines: recipeLines.data ?? [] }, filters);
}
