import { isMockMode, mockItems, mockProductPackaging, mockProducts, mockRecipeLines, mockRecipes } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { requireReadRows } from "@/server/queries/common";
import { buildRecipeCosting, type RecipeCostingRow } from "@/server/queries/recipe-costing";
import type { Database } from "@/types/database";

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
type Item = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "status" | "cost" | "base_unit">;
type Product = Pick<Database["public"]["Tables"]["products"]["Row"], "id" | "product_code" | "product_name" | "selling_unit" | "status">;
type Packaging = Pick<Database["public"]["Tables"]["product_packaging"]["Row"], "product_id" | "status" | "deleted_at" | "price" | "units_per_pack">;
type Recipe = Pick<Database["public"]["Tables"]["recipes"]["Row"], "id" | "product_id" | "recipe_no" | "status" | "deleted_at" | "yield_qty" | "yield_unit" | "approval_status">;
type RecipeLine = Pick<Database["public"]["Tables"]["recipe_lines"]["Row"], "id" | "recipe_id" | "ingredient_item_id" | "base_qty_required" | "base_uom">;
type Data = { items: Item[]; products: Product[]; packaging: Packaging[]; recipes: Recipe[]; recipeLines: RecipeLine[] };

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
  await requirePermission("recipes.view");
  if (isMockMode()) return buildProductMargin({ items: mockItems, products: mockProducts, packaging: mockProductPackaging, recipes: mockRecipes, recipeLines: mockRecipeLines }, filters);
  const supabase = await createClient();
  const [items, products, packaging, recipes, recipeLines] = await Promise.all([
    supabase.from("items").select("id,status,cost,base_unit").is("deleted_at", null),
    supabase.from("products").select("id,product_code,product_name,selling_unit,status"),
    supabase.from("product_packaging").select("product_id,status,deleted_at,price,units_per_pack").is("deleted_at", null),
    supabase.from("recipes").select("id,product_id,recipe_no,status,deleted_at,yield_qty,yield_unit,approval_status").is("deleted_at", null),
    supabase.from("recipe_lines").select("id,recipe_id,ingredient_item_id,base_qty_required,base_uom"),
  ]);
  for (const result of [items, products, packaging, recipes, recipeLines]) if (result.error) throw new Error(result.error.message);
  return buildProductMargin({
    items: requireReadRows(items.data, "Product margin items"),
    products: requireReadRows(products.data, "Product margin products"),
    packaging: requireReadRows(packaging.data, "Product margin packaging"),
    recipes: requireReadRows(recipes.data, "Product margin recipes"),
    recipeLines: requireReadRows(recipeLines.data, "Product margin recipe lines"),
  }, filters);
}
