import { isMockMode, mockItems, mockProductPackaging, mockProducts, mockRecipeLines, mockRecipes } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { buildRecipeCosting, type RecipeCostingRow } from "@/server/queries/recipe-costing";

export type ProductMarginRow = {
  id: string;
  product_code: string;
  product_name: string;
  selling_price: number | null;
  recipe_id: string | null;
  recipe_no: string | null;
  recipe_confidence: RecipeCostingRow["confidence"] | null;
  estimated_product_cost: number | null;
  gross_margin_amount: number | null;
  gross_margin_percent: number | null;
  status: "Ready" | "Cost incomplete" | "Missing price" | "Missing recipe";
  margin_band: "review" | "healthy" | "unavailable";
};

type Filters = { search?: string; status?: string; margin_band?: string; incomplete?: string };
type Data = { items: typeof mockItems; products: typeof mockProducts; packaging: typeof mockProductPackaging; recipes: typeof mockRecipes; recipeLines: typeof mockRecipeLines };

export function buildProductMargin(data: Data, filters: Filters = {}) {
  const recipesByProduct = new Map<string, RecipeCostingRow[]>();
  for (const recipe of buildRecipeCosting(data, { status: "active" })) recipesByProduct.set(recipe.product_id, [...(recipesByProduct.get(recipe.product_id) ?? []), recipe]);
  const packagingByProduct = new Map<string, typeof data.packaging>();
  for (const pack of data.packaging.filter((pack) => pack.status === "active" && !pack.deleted_at)) packagingByProduct.set(pack.product_id, [...(packagingByProduct.get(pack.product_id) ?? []), pack]);
  const rows = data.products.filter((product) => product.status === "active").map((product) => {
    const recipes = recipesByProduct.get(product.id) ?? [];
    const recipe = recipes.length === 1 ? recipes[0] : null;
    const packs = packagingByProduct.get(product.id) ?? [];
    const pack = packs.length === 1 ? packs[0] : null;
    const sellingPrice = pack && Number(pack.price) > 0 ? Number(pack.price) : null;
    const costReady = recipe?.confidence === "High" && recipe.output_uom === product.selling_unit && recipe.cost_per_output_unit != null;
    const status = !recipes.length ? "Missing recipe" : !sellingPrice ? "Missing price" : !costReady ? "Cost incomplete" : "Ready";
    const cost = status === "Ready" ? Number(recipe!.cost_per_output_unit) * Number(pack!.units_per_pack) : null;
    const margin = cost == null || sellingPrice == null ? null : sellingPrice - cost;
    const marginPercent = margin == null || !sellingPrice ? null : margin / sellingPrice;
    return {
      id: product.id,
      product_code: product.product_code,
      product_name: product.product_name,
      selling_price: sellingPrice,
      recipe_id: recipe?.id ?? null,
      recipe_no: recipe?.recipe_no ?? null,
      recipe_confidence: recipe?.confidence ?? null,
      estimated_product_cost: cost,
      gross_margin_amount: margin,
      gross_margin_percent: marginPercent,
      status,
      margin_band: marginPercent == null ? "unavailable" : marginPercent <= 0 ? "review" : "healthy",
    } satisfies ProductMarginRow;
  });
  const needle = filters.search?.trim().toLowerCase();
  return rows.filter((row) =>
    (!needle || `${row.product_code} ${row.product_name}`.toLowerCase().includes(needle))
    && (!filters.status || filters.status === "all" || row.status.toLowerCase().replace(" ", "_") === filters.status)
    && (!filters.margin_band || filters.margin_band === "all" || row.margin_band === filters.margin_band)
    && (!filters.incomplete || filters.incomplete === "all" || (filters.incomplete === "yes" ? row.status !== "Ready" : row.status === "Ready")),
  );
}

export async function getProductMargin(filters: Filters = {}) {
  await requirePermission("reports.view");
  if (isMockMode()) return buildProductMargin({ items: mockItems, products: mockProducts, packaging: mockProductPackaging, recipes: mockRecipes, recipeLines: mockRecipeLines }, filters);
  const supabase = await createClient();
  const [items, products, packaging, recipes, recipeLines] = await Promise.all([
    supabase.from("items").select("*").is("deleted_at", null),
    supabase.from("products").select("*"),
    supabase.from("product_packaging").select("*").is("deleted_at", null),
    supabase.from("recipes").select("*").is("deleted_at", null),
    supabase.from("recipe_lines").select("*"),
  ]);
  for (const result of [items, products, packaging, recipes, recipeLines]) if (result.error) throw new Error(result.error.message);
  return buildProductMargin({ items: items.data ?? [], products: products.data ?? [], packaging: packaging.data ?? [], recipes: recipes.data ?? [], recipeLines: recipeLines.data ?? [] }, filters);
}
