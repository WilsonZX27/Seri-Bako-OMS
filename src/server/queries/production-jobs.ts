import { isMockMode } from "@/lib/mock-mode";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows, type PaginationResult } from "@/lib/table-state";
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";
import { getStockBalanceDetails } from "@/server/queries/inventory";
import { getRecipe } from "@/server/queries/recipes";

type Filters = Record<string, string | undefined>;

export type ProductionJobStatus = "draft" | "submitted" | "approved" | "posted" | "cancelled" | "rejected";

export type ProductionJob = {
  id: string;
  company_id: string | null;
  branch_id: string;
  location_id: string | null;
  production_job_no: string;
  production_date: string;
  recipe_id: string;
  product_id: string | null;
  output_item_id: string | null;
  planned_output_qty: number;
  actual_output_qty: number | null;
  output_uom: string | null;
  status: ProductionJobStatus;
  priority: string | null;
  remarks: string | null;
  document_id: string | null;
  stock_transaction_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  posted_by: string | null;
  posted_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  created_at: string;
  updated_at: string;
  branch_name?: string | null;
  recipe_no?: string | null;
  product_name?: string | null;
  created_by_name?: string | null;
};

export type ProductionIngredientLine = {
  id: string;
  production_job_id: string;
  item_id: string;
  item_code: string | null;
  item_name: string | null;
  required_qty: number;
  actual_qty: number | null;
  uom: string | null;
  unit_cost: number;
  line_cost: number;
  stock_available_qty: number | null;
  variance_qty: number | null;
  remarks: string | null;
  created_at: string;
};

export type ProductionOutputLine = {
  id: string;
  production_job_id: string;
  product_id: string | null;
  item_id: string | null;
  output_code: string | null;
  output_name: string | null;
  planned_qty: number;
  actual_qty: number | null;
  uom: string | null;
  unit_cost: number;
  line_cost: number;
  remarks: string | null;
  created_at: string;
};

export type ProductionRecipeOption = {
  id: string;
  recipe_no: string;
  product_id: string;
  product_code: string;
  product_name: string;
  yield_qty: number;
  yield_unit: string;
  cost_per_finished_unit: number;
  lines: Array<{
    item_id: string;
    item_code: string;
    item_name: string;
    qty_per_yield: number;
    uom: string;
    unit_cost: number;
  }>;
};

function filterRows(rows: ProductionJob[], filters: Filters) {
  const search = filters.search?.trim().toLowerCase();
  const status = filters.status && filters.status !== "all" ? filters.status : null;
  const branch = filters.branch_id && filters.branch_id !== "all" ? filters.branch_id : null;
  const sort = filters.sort ?? "production_date";
  const dir = filters.dir ?? "desc";
  return rows
    .filter((row) => {
      const matchesSearch = search
        ? [row.production_job_no, row.recipe_no, row.product_name, row.remarks].some((value) => String(value ?? "").toLowerCase().includes(search))
        : true;
      const matchesStatus = status ? row.status === status : true;
      const matchesBranch = branch ? row.branch_id === branch : true;
      const matchesFrom = filters.from ? String(row.production_date ?? "") >= filters.from : true;
      const matchesTo = filters.to ? String(row.production_date ?? "") <= filters.to : true;
      return matchesSearch && matchesStatus && matchesBranch && matchesFrom && matchesTo;
    })
    .sort((a, b) => compareTableValues(a[sort as keyof ProductionJob], b[sort as keyof ProductionJob], dir));
}

function asProductionJob(row: Record<string, unknown>): ProductionJob {
  return {
    ...(row as unknown as ProductionJob),
    planned_output_qty: Number(row.planned_output_qty ?? 0),
    actual_output_qty: row.actual_output_qty == null ? null : Number(row.actual_output_qty),
  };
}

export async function getProductionJobs(filters: Filters = {}): Promise<PaginationResult<ProductionJob>> {
  if (isMockMode()) return paginateRows([], filters.page, 15);

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [{ data, error }, { data: branches }, { data: recipes }, { data: products }] = await Promise.all([
    db.from("production_jobs").select("*").is("deleted_at", null),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("recipes").select("id, recipe_no, product_id"),
    supabase.from("products").select("id, product_code, product_name"),
  ]);
  if (error) throw new Error(error.message);

  const branchRows = (branches ?? []) as Array<{ id: string; branch_name: string }>;
  const recipeRows = (recipes ?? []) as Array<{ id: string; recipe_no: string; product_id: string }>;
  const productRows = (products ?? []) as Array<{ id: string; product_name: string }>;
  const productionRows = (data ?? []) as Array<Record<string, unknown>>;
  const branchById = new Map(branchRows.map((row) => [row.id, row.branch_name]));
  const recipeById = new Map(recipeRows.map((row) => [row.id, row]));
  const productById = new Map(productRows.map((row) => [row.id, row]));
  const displayMap = await resolveActorDisplayMap(productionRows.map((row) => String(row.created_by ?? "")));

  const rows: ProductionJob[] = productionRows.map((row) => {
    const job = asProductionJob(row);
    const recipe = recipeById.get(job.recipe_id);
    const product = recipe?.product_id ? productById.get(recipe.product_id) : null;
    return {
      ...job,
      branch_name: branchById.get(job.branch_id) ?? null,
      recipe_no: recipe?.recipe_no ?? null,
      product_name: product?.product_name ?? null,
      created_by_name: actorDisplayName(displayMap, job.created_by),
    };
  });

  return paginateRows(filterRows(rows, filters), filters.page, 15);
}

export async function getProductionJob(id: string): Promise<{ job: ProductionJob; ingredientLines: ProductionIngredientLine[]; outputLines: ProductionOutputLine[] }> {
  if (isMockMode()) throw new Error("Mock production job not found");

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const [{ data, error }, { data: ingredientLines }, { data: outputLines }, { data: branches }, { data: recipes }, { data: products }] = await Promise.all([
    db.from("production_jobs").select("*").eq("id", id).single(),
    db.from("production_job_ingredient_lines").select("*").eq("production_job_id", id).order("created_at", { ascending: true }),
    db.from("production_job_output_lines").select("*").eq("production_job_id", id).order("created_at", { ascending: true }),
    supabase.from("branches").select("id, branch_name"),
    supabase.from("recipes").select("id, recipe_no, product_id, yield_qty, yield_unit"),
    supabase.from("products").select("id, product_code, product_name"),
  ]);
  if (error) throw new Error(error.message);

  const job = asProductionJob(data);
  const branch = (branches ?? []).find((row) => row.id === job.branch_id);
  const recipe = (recipes ?? []).find((row) => row.id === job.recipe_id);
  const product = recipe?.product_id ? (products ?? []).find((row) => row.id === recipe.product_id) : null;

  return {
    job: {
      ...job,
      branch_name: branch?.branch_name ?? null,
      recipe_no: recipe?.recipe_no ?? null,
      product_name: product?.product_name ?? null,
    },
    ingredientLines: (ingredientLines ?? []).map((line: Record<string, unknown>) => ({
      ...(line as unknown as ProductionIngredientLine),
      required_qty: Number(line.required_qty ?? 0),
      actual_qty: line.actual_qty == null ? null : Number(line.actual_qty),
      unit_cost: Number(line.unit_cost ?? 0),
      line_cost: Number(line.line_cost ?? 0),
      stock_available_qty: line.stock_available_qty == null ? null : Number(line.stock_available_qty),
      variance_qty: line.variance_qty == null ? null : Number(line.variance_qty),
    })),
    outputLines: (outputLines ?? []).map((line: Record<string, unknown>) => ({
      ...(line as unknown as ProductionOutputLine),
      planned_qty: Number(line.planned_qty ?? 0),
      actual_qty: line.actual_qty == null ? null : Number(line.actual_qty),
      unit_cost: Number(line.unit_cost ?? 0),
      line_cost: Number(line.line_cost ?? 0),
    })),
  };
}

export async function getProductionJobFormOptions() {
  const supabase = await createClient();
  const recipes = await getActiveProductionRecipes();
  const { data: branches, error } = await supabase
    .from("branches")
    .select("id, branch_code, branch_name, default_location_id, status")
    .eq("status", "active")
    .order("branch_name", { ascending: true });
  if (error) throw new Error(error.message);
  const balances = await getStockBalanceDetails({ page: "all", view: "branch" });
  return {
    branches: branches ?? [],
    recipes,
    balances: balances.rows.map((row) => ({
      branch_id: row.branch_id,
      item_id: row.item_id,
      current_qty: Number(row.current_qty ?? 0),
    })),
  };
}

export async function getActiveProductionRecipes(): Promise<ProductionRecipeOption[]> {
  if (isMockMode()) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recipes")
    .select("id")
    .eq("status", "active")
    .order("effective_date", { ascending: false });
  if (error) throw new Error(error.message);

  const details = await Promise.all((data ?? []).map((row) => getRecipe(row.id)));
  return details.map((recipe) => ({
    id: recipe.id,
    recipe_no: recipe.recipe_no,
    product_id: recipe.product_id,
    product_code: recipe.product_code,
    product_name: recipe.product_name,
    yield_qty: Number(recipe.yield_qty),
    yield_unit: recipe.yield_unit,
    cost_per_finished_unit: Number(recipe.cost_per_finished_unit ?? 0),
    lines: recipe.lines.map((line) => ({
      item_id: line.ingredient_item_id,
      item_code: line.ingredient_item_code,
      item_name: line.ingredient_name,
      qty_per_yield: Number(line.base_qty_required ?? line.qty_required),
      uom: line.base_uom ?? line.recipe_uom,
      unit_cost: Number(line.cost_per_unit ?? 0),
    })),
  }));
}

export async function getProductionHubSummary() {
  if (isMockMode()) {
    return { todayPosted: 0, pendingApproval: 0, activeRecipes: 0, ingredientShortages: 0 };
  }
  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const today = new Date().toISOString().slice(0, 10);
  const [posted, pending, recipes, approvedJobs] = await Promise.all([
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "posted").eq("production_date", today).is("deleted_at", null),
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "submitted").is("deleted_at", null),
    supabase.from("recipes").select("id", { count: "exact", head: true }).eq("status", "active"),
    db.from("production_job_ingredient_lines").select("id", { count: "exact", head: true }).lt("stock_available_qty", 0),
  ]);
  for (const result of [posted, pending, recipes, approvedJobs]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    todayPosted: posted.count ?? 0,
    pendingApproval: pending.count ?? 0,
    activeRecipes: recipes.count ?? 0,
    ingredientShortages: approvedJobs.count ?? 0,
  };
}
