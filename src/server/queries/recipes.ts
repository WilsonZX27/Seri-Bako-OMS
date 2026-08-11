import { isMockMode, mockItems, mockProductPackaging, mockProducts, mockRecipeCostSnapshots, mockRecipeLines, mockRecipes } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { requirePermission } from "@/server/auth/permissions";
import { sortProductsForDisplay } from "@/lib/product-order";
import type { Database } from "@/types/database";

type RecipeRow = Database["public"]["Tables"]["recipes"]["Row"];
type RecipeLineRow = Database["public"]["Tables"]["recipe_lines"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type ProductPackagingRow = Database["public"]["Tables"]["product_packaging"]["Row"];
type CostSnapshotRow = Database["public"]["Tables"]["recipe_cost_snapshots"]["Row"];
type StockBalanceRow = Database["public"]["Tables"]["stock_balances_summary"]["Row"];

export type RecipeLineDetail = RecipeLineRow & {
  ingredient_item_code: string;
  ingredient_name: string;
  ingredient_image_url: string | null;
  line_cost_before_wastage: number;
  calculated_line_cost: number;
  current_stock: number | null;
  shortage_qty: number | null;
  stock_status: "available" | "low" | "short" | "need_purchase" | "unknown";
};

export type RecipeDetail = RecipeRow & {
  product_code: string;
  product_name: string;
  display_order: number | null;
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
  item_image_url: string | null;
};

export type RecipeListRow = RecipeRow & {
  product_code: string;
  product_name: string;
  display_order: number | null;
  product_image_url: string | null;
  selling_unit: string;
  total_recipe_cost: number;
  cost_per_finished_unit: number;
};

type RecipeListFilters = Record<string, string | undefined>;
const RECIPE_PAGE_SIZE = 12;

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
    display_order: product?.display_order ?? null,
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

export async function getRecipes(filters: RecipeListFilters = {}) {
  await requirePermission("recipes.view");
  if (isMockMode()) {
    const search = filters.search?.trim().toLowerCase();
    const status = filters.status && filters.status !== "all" ? filters.status : null;
    const rows = sortProductsForDisplay(mockRecipes
      .map((recipe) => buildRecipeDetail(recipe, mockProducts, mockRecipeLines, mockItems, mockProductPackaging, mockRecipeCostSnapshots))
      .filter((recipe) => (!search || [recipe.recipe_no, recipe.product_code, recipe.product_name].some((value) => value.toLowerCase().includes(search))) && (!status || recipe.status === status)));
    const page = Math.max(1, Number(filters.page) || 1);
    return {
      rows: rows.slice((page - 1) * RECIPE_PAGE_SIZE, page * RECIPE_PAGE_SIZE),
      page,
      pageSize: RECIPE_PAGE_SIZE,
      totalRows: rows.length,
      totalPages: Math.max(Math.ceil(rows.length / RECIPE_PAGE_SIZE), 1),
    };
  }

  const supabase = await createClient();
  const page = Math.max(1, Number(filters.page) || 1);
  const search = filters.search?.trim();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  let matchingProductIds: string[] = [];
  if (search) {
    const term = search.replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
    const { data, error } = await supabase
      .from("products")
      .select("id")
      .is("deleted_at", null)
      .or(`product_code.ilike.%${term}%,product_name.ilike.%${term}%`)
      .limit(200);
    if (error) throw new Error(error.message);
    matchingProductIds = (data ?? []).map((row) => row.id);
  }

  let query = supabase.from("recipes").select("*", { count: "exact" }).is("deleted_at", null);
  if (status) query = query.eq("status", status as RecipeRow["status"]);
  if (search) {
    const term = search.replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&");
    query = matchingProductIds.length
      ? query.or(`recipe_no.ilike.%${term}%,product_id.in.(${matchingProductIds.join(",")})`)
      : query.ilike("recipe_no", `%${term}%`);
  }
  const { data: recipeRows, error, count } = await query
    .order("effective_date", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * RECIPE_PAGE_SIZE, page * RECIPE_PAGE_SIZE - 1);
  if (error) throw new Error(error.message);

  const productIds = [...new Set((recipeRows ?? []).map((recipe) => recipe.product_id))];
  const recipeIds = (recipeRows ?? []).map((recipe) => recipe.id);
  const [{ data: products, error: productsError }, { data: snapshots, error: snapshotsError }] = await Promise.all([
    productIds.length
      ? supabase.from("products").select("id,product_code,product_name,display_order,product_image_url,selling_unit").in("id", productIds)
      : Promise.resolve({ data: [], error: null }),
    recipeIds.length
      ? supabase.from("recipe_cost_snapshots").select("recipe_id,snapshot_no,wastage_adjusted_cost,cost_per_finished_unit").in("recipe_id", recipeIds).order("snapshot_no", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (productsError) throw new Error(productsError.message);
  if (snapshotsError) throw new Error(snapshotsError.message);

  const productById = new Map((products ?? []).map((product) => [product.id, product]));
  const snapshotByRecipe = new Map<string, (typeof snapshots)[number]>();
  for (const snapshot of snapshots ?? []) if (!snapshotByRecipe.has(snapshot.recipe_id)) snapshotByRecipe.set(snapshot.recipe_id, snapshot);
  const rows: RecipeListRow[] = (recipeRows ?? []).map((recipe) => {
    const product = productById.get(recipe.product_id);
    const snapshot = snapshotByRecipe.get(recipe.id);
    return {
      ...recipe,
      product_code: product?.product_code ?? "Unknown",
      product_name: product?.product_name ?? "Unknown product",
      display_order: product?.display_order ?? null,
      product_image_url: product?.product_image_url ?? null,
      selling_unit: product?.selling_unit ?? recipe.yield_unit,
      total_recipe_cost: Number(snapshot?.wastage_adjusted_cost ?? 0),
      cost_per_finished_unit: Number(snapshot?.cost_per_finished_unit ?? 0),
    };
  });
  const totalRows = count ?? 0;
  return {
    rows: sortProductsForDisplay(rows),
    page,
    pageSize: RECIPE_PAGE_SIZE,
    totalRows,
    totalPages: Math.max(Math.ceil(totalRows / RECIPE_PAGE_SIZE), 1),
  };
}

export async function getRecipeSummary() {
  await requirePermission("recipes.view");
  if (isMockMode()) {
    return {
      total: mockRecipes.length,
      active: mockRecipes.filter((recipe) => recipe.status === "active").length,
      pendingApproval: mockRecipes.filter((recipe) => recipe.status === "pending_approval").length,
    };
  }
  const supabase = await createClient();
  const count = (status?: RecipeRow["status"]) => {
    let query = supabase.from("recipes").select("id", { count: "exact", head: true }).is("deleted_at", null);
    if (status) query = query.eq("status", status);
    return query;
  };
  const [total, active, pendingApproval] = await Promise.all([count(), count("active"), count("pending_approval")]);
  for (const result of [total, active, pendingApproval]) if (result.error) throw new Error(result.error.message);
  return { total: total.count ?? 0, active: active.count ?? 0, pendingApproval: pendingApproval.count ?? 0 };
}

export async function getRecipe(id: string) {
  await requirePermission("recipes.view");
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
    supabase.from("stock_balances_summary").select("item_id,current_stock,current_qty"),
  ]);

  if (recipe.error) throw new Error(recipe.error.message);
  for (const result of [products, lines, items, packaging, snapshots, stockBalances]) {
    if (result.error) throw new Error(result.error.message);
  }

  return buildRecipeDetail(recipe.data, products.data ?? [], lines.data ?? [], items.data ?? [], packaging.data ?? [], snapshots.data ?? [], stockBalances.data ?? []);
}

export async function getRecipeIngredientOptions(): Promise<RecipeIngredientOption[]> {
  await requirePermission("recipes.view");
  if (isMockMode()) {
    return mockItems
      .filter((item) => item.status === "active")
      .map((item) => ({
        id: item.id,
        item_code: item.item_code,
        item_name: item.item_name,
        base_unit: item.base_unit,
        cost: Number(item.cost),
        item_image_url: item.item_image_url ?? null,
      }));
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id,item_code,item_name,base_unit,cost,item_image_url")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("item_code", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RecipeIngredientOption[];
}
