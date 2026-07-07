import { isMockMode, mockItems, mockProductPackaging, mockProducts, mockRecipeCostSnapshots, mockRecipeLines, mockRecipes } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
type RecipeLineRow = Database["public"]["Tables"]["recipe_lines"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type ProductPackagingRow = Database["public"]["Tables"]["product_packaging"]["Row"];
type CostSnapshotRow = Database["public"]["Tables"]["recipe_cost_snapshots"]["Row"];
type StockBalanceRow = Database["public"]["Views"]["stock_balances_view"]["Row"];

export type RecipeLineDetail = RecipeLineRow & {
  ingredient_item_code: string;
  ingredient_name: string;
  ingredient_image_url: string | null;
  barcode: string | null;
  line_cost_before_wastage: number;
  calculated_line_cost: number;
  current_stock: number | null;
  shortage_qty: number | null;
  stock_status: "available" | "low" | "short" | "need_purchase" | "unknown";
};

export type RecipeDetail = RecipeRow & {
  product_code: string;
  product_name: string;
  product_image_url: string | null;
  selling_unit: string;
  packaging: ProductPackagingRow[];
  latest_snapshot: CostSnapshotRow | null;
  lines: RecipeLineDetail[];
  total_ingredient_cost: number;
  wastage_adjusted_cost: number;
  total_recipe_cost: number;
  cost_per_finished_unit: number;
  cost_per_pack: number | null;
  packaging_name: string | null;
};

export type RecipeIngredientOption = {
  id: string;
  item_code: string;
  item_name: string;
  base_unit: string;
  cost: number;
  barcode: string | null;
  internal_barcode: string | null;
  item_image_url: string | null;
};

function lineBaseQty(line: RecipeLineRow) {
  return Number(line.base_qty_required || Number(line.qty_required) * Number(line.conversion_factor || 1));
}

function lineCostBeforeWastage(line: RecipeLineRow) {
  return Number(line.cost_per_unit) * lineBaseQty(line);
}

function calculateLineCost(line: RecipeLineRow) {
  return lineCostBeforeWastage(line) * (1 + Number(line.wastage_percent) / 100);
}

function stockStatus(required: number, current: number | null) {
  if (current == null) return { shortage_qty: null, stock_status: "unknown" as const };
  const shortage = Math.max(required - current, 0);
  if (shortage > 0) return { shortage_qty: shortage, stock_status: "short" as const };
  if (current <= required * 1.25) return { shortage_qty: 0, stock_status: "low" as const };
  return { shortage_qty: 0, stock_status: "available" as const };
}

function buildRecipeDetail(
  recipe: RecipeRow,
  products: ProductRow[],
  lines: RecipeLineRow[],
  items: ItemRow[],
  packagingRows: ProductPackagingRow[],
  snapshots: CostSnapshotRow[] = [],
  stockBalances: Pick<StockBalanceRow, "item_id" | "current_stock" | "current_qty">[] = [],
): RecipeDetail {
  const product = products.find((row) => row.id === recipe.product_id);
  const itemById = new Map<string, ItemRow>(items.map((item) => [item.id, item]));
  const stockByItem = new Map<string, number>();
  stockBalances.forEach((row) => stockByItem.set(row.item_id, (stockByItem.get(row.item_id) ?? 0) + Number(row.current_stock ?? row.current_qty ?? 0)));
  const packaging = packagingRows.filter((row) => row.product_id === recipe.product_id && row.status === "active");
  const primaryPackaging = packaging[0] ?? null;
  const detailLines = lines
    .filter((line) => line.recipe_id === recipe.id)
    .map((line) => {
      const item = itemById.get(line.ingredient_item_id);
      const baseQty = lineBaseQty(line);
      const currentStock = stockByItem.has(line.ingredient_item_id) ? stockByItem.get(line.ingredient_item_id)! : null;
      return {
        ...line,
        recipe_uom: line.recipe_uom ?? line.unit,
        base_uom: line.base_uom ?? item?.base_unit ?? line.unit,
        base_qty_required: baseQty,
        ingredient_item_code: item?.item_code ?? "Unknown",
        ingredient_name: item?.item_name ?? "Unknown ingredient",
        ingredient_image_url: item?.item_image_url ?? null,
        barcode: item?.barcode ?? item?.internal_barcode ?? null,
        line_cost_before_wastage: lineCostBeforeWastage(line),
        calculated_line_cost: calculateLineCost(line),
        current_stock: currentStock,
        ...stockStatus(baseQty, currentStock),
      };
    });
  const totalIngredientCost = detailLines.reduce((sum, line) => sum + line.line_cost_before_wastage, 0);
  const wastageAdjustedCost = detailLines.reduce((sum, line) => sum + line.calculated_line_cost, 0);
  const costPerFinishedUnit = Number(recipe.yield_qty) > 0 ? wastageAdjustedCost / Number(recipe.yield_qty) : 0;
  const costPerPack = primaryPackaging ? costPerFinishedUnit * Number(primaryPackaging.units_per_pack) : null;

  return {
    ...recipe,
    remarks: recipe.remarks ?? recipe.remark,
    product_code: product?.product_code ?? "Unknown",
    product_name: product?.product_name ?? "Unknown product",
    product_image_url: product?.product_image_url ?? null,
    selling_unit: product?.selling_unit ?? recipe.yield_unit,
    packaging,
    latest_snapshot: snapshots.filter((row) => row.recipe_id === recipe.id).sort((a, b) => b.snapshot_no - a.snapshot_no)[0] ?? null,
    lines: detailLines,
    total_ingredient_cost: totalIngredientCost,
    wastage_adjusted_cost: wastageAdjustedCost,
    total_recipe_cost: wastageAdjustedCost,
    cost_per_finished_unit: costPerFinishedUnit,
    cost_per_pack: costPerPack,
    packaging_name: primaryPackaging?.packaging_name ?? null,
  };
}

export async function getRecipes() {
  if (isMockMode()) {
    return mockRecipes.map((recipe) => buildRecipeDetail(recipe, mockProducts, mockRecipeLines, mockItems, mockProductPackaging, mockRecipeCostSnapshots));
  }

  const supabase = await createClient();
  const [recipes, products, lines, items, packaging, snapshots, stockBalances] = await Promise.all([
    supabase.from("recipes").select("*").is("deleted_at", null).order("effective_date", { ascending: false }),
    supabase.from("products").select("*").is("deleted_at", null),
    supabase.from("recipe_lines").select("*"),
    supabase.from("items").select("*").is("deleted_at", null),
    supabase.from("product_packaging").select("*").is("deleted_at", null),
    supabase.from("recipe_cost_snapshots").select("*"),
    supabase.from("stock_balances_view").select("item_id,current_stock,current_qty"),
  ]);

  for (const result of [recipes, products, lines, items, packaging, snapshots]) {
    if (result.error) throw new Error(result.error.message);
  }

  return (recipes.data ?? []).map((recipe) =>
    buildRecipeDetail(recipe, products.data ?? [], lines.data ?? [], items.data ?? [], packaging.data ?? [], snapshots.data ?? [], stockBalances.data ?? []),
  );
}

export async function getRecipe(id: string) {
  if (isMockMode()) {
    const recipe = mockRecipes.find((row) => row.id === id);
    if (!recipe) throw new Error("Mock recipe not found");
    return buildRecipeDetail(recipe, mockProducts, mockRecipeLines, mockItems, mockProductPackaging, mockRecipeCostSnapshots);
  }

  const supabase = await createClient();
  const [recipe, products, lines, items, packaging, snapshots, stockBalances] = await Promise.all([
    supabase.from("recipes").select("*").eq("id", id).single(),
    supabase.from("products").select("*").is("deleted_at", null),
    supabase.from("recipe_lines").select("*").eq("recipe_id", id),
    supabase.from("items").select("*").is("deleted_at", null),
    supabase.from("product_packaging").select("*").is("deleted_at", null),
    supabase.from("recipe_cost_snapshots").select("*").eq("recipe_id", id),
    supabase.from("stock_balances_view").select("item_id,current_stock,current_qty"),
  ]);

  if (recipe.error) throw new Error(recipe.error.message);
  for (const result of [products, lines, items, packaging, snapshots]) {
    if (result.error) throw new Error(result.error.message);
  }

  return buildRecipeDetail(recipe.data, products.data ?? [], lines.data ?? [], items.data ?? [], packaging.data ?? [], snapshots.data ?? [], stockBalances.data ?? []);
}

export async function getRecipeIngredientOptions(): Promise<RecipeIngredientOption[]> {
  if (isMockMode()) {
    return mockItems
      .filter((item) => item.status === "active")
      .map((item) => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        base_unit: item.base_unit,
        cost: Number(item.cost),
        barcode: item.barcode ?? null,
        internal_barcode: item.internal_barcode ?? null,
        item_image_url: item.item_image_url ?? null,
      }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id,item_code,item_name,base_unit,cost,barcode,internal_barcode,item_image_url")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("item_code", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RecipeIngredientOption[];
}
