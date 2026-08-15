import { isMockMode } from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { compareTableValues, paginateRows, type PaginationResult } from "@/lib/table-state";
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";
import { getStockBalanceDetails } from "@/server/queries/inventory";

type Filters = Record<string, string | undefined>;

export type ProductionJobStatus = "draft" | "submitted" | "approved" | "posted" | "cancelled" | "rejected";

export type ProductionJob = {
  id: string;
  company_id: string | null;
  branch_id: string;
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

export class ProductionJobNotFoundError extends Error {}

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
  const { data, error } = await db.from("production_jobs").select("*").is("deleted_at", null);
  if (error) throw new Error(error.message);
  const productionRows = (data ?? []) as Array<Record<string, unknown>>;
  if (productionRows.length === 0) return paginateRows([], filters.page, 15);
  const jobs = productionRows.map(asProductionJob);
  const branchIds = [...new Set(jobs.map((job) => job.branch_id))];
  const productIds = [...new Set(jobs.map((job) => job.product_id).filter((id): id is string => Boolean(id)))];
  const [branchesResult, productsResult] = await Promise.all([
    supabase.from("branches").select("id, branch_name").in("id", branchIds),
    productIds.length > 0 ? supabase.from("products").select("id, product_code, product_name").in("id", productIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (branchesResult.error || productsResult.error) throw new Error((branchesResult.error ?? productsResult.error)!.message);
  const branchRows = (branchesResult.data ?? []) as Array<{ id: string; branch_name: string }>;
  const productRows = (productsResult.data ?? []) as Array<{ id: string; product_name: string }>;
  const branchById = new Map(branchRows.map((row) => [row.id, row.branch_name]));
  const productById = new Map(productRows.map((row) => [row.id, row]));
  const displayMap = await resolveActorDisplayMap(productionRows.map((row) => String(row.created_by ?? "")));

  const rows: ProductionJob[] = jobs.map((job) => {
    const product = job.product_id ? productById.get(job.product_id) : null;
    return {
      ...job,
      branch_name: branchById.get(job.branch_id) ?? null,
      recipe_no: null,
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
  const [{ data, error }, { data: ingredientLines, error: ingredientError }, { data: outputLines, error: outputError }] = await Promise.all([
    db.from("production_jobs").select("*").eq("id", id).maybeSingle(),
    db.from("production_job_ingredient_lines").select("*").eq("production_job_id", id).order("created_at", { ascending: true }),
    db.from("production_job_output_lines").select("*").eq("production_job_id", id).order("created_at", { ascending: true }),
  ]);
  if (error) throw new Error(error.message);
  if (ingredientError || outputError) throw new Error((ingredientError ?? outputError)!.message);
  if (!data) throw new ProductionJobNotFoundError("Production job not found");

  const job = asProductionJob(data);
  const [branchResult, productResult] = await Promise.all([
    supabase.from("branches").select("id, branch_name").eq("id", job.branch_id).maybeSingle(),
    job.product_id ? supabase.from("products").select("id, product_code, product_name").eq("id", job.product_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ]);
  if (branchResult.error || productResult.error) throw new Error((branchResult.error ?? productResult.error)!.message);
  const branch = branchResult.data;
  const product = productResult.data;
  const displayMap = await resolveActorDisplayMap([job.created_by ?? ""]);

  return {
    job: {
      ...job,
      branch_name: branch?.branch_name ?? null,
      recipe_no: null,
      product_name: product?.product_name ?? null,
      created_by_name: actorDisplayName(displayMap, job.created_by),
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
    .select("id, branch_code, branch_name, status")
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
  const rpcClient = supabase as unknown as { rpc: (name: "get_production_recipe_options") => PromiseLike<{ data: unknown; error: { message: string } | null }> };
  const { data, error } = await rpcClient.rpc("get_production_recipe_options");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((recipe) => ({
    id: String(recipe.id), recipe_no: String(recipe.recipe_no), product_id: String(recipe.product_id),
    product_code: String(recipe.product_code), product_name: String(recipe.product_name),
    yield_qty: Number(recipe.yield_qty), yield_unit: String(recipe.yield_unit),
    cost_per_finished_unit: Number(recipe.cost_per_finished_unit ?? 0),
    lines: ((recipe.lines ?? []) as Array<Record<string, unknown>>).map((line) => ({
      item_id: String(line.item_id), item_code: String(line.item_code), item_name: String(line.item_name),
      qty_per_yield: Number(line.qty_per_yield), uom: String(line.uom), unit_cost: Number(line.unit_cost ?? 0),
    })),
  }));
}

export async function getProductionHubSummary() {
  if (isMockMode()) {
    return { todayPosted: 0, pendingApproval: 0, readyToPost: 0, activeRecipes: 0, ingredientShortages: 0 };
  }
  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const today = todayInKualaLumpur();
  const [posted, pending, readyToPost, recipes, shortageLines] = await Promise.all([
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "posted").eq("production_date", today).is("deleted_at", null),
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "submitted").is("deleted_at", null),
    db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", "approved").is("deleted_at", null),
    getActiveProductionRecipes(),
    db.from("production_job_ingredient_lines").select("id", { count: "exact", head: true }).lt("stock_available_qty", 0),
  ]);
  for (const result of [posted, pending, readyToPost, shortageLines]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    todayPosted: posted.count ?? 0,
    pendingApproval: pending.count ?? 0,
    readyToPost: readyToPost.count ?? 0,
    activeRecipes: recipes.length,
    ingredientShortages: shortageLines.count ?? 0,
  };
}
