import { isMockMode } from "@/lib/mock-mode";
import { todayInKualaLumpur } from "@/lib/business-date";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { paginateRows, type PaginationResult } from "@/lib/table-state";
import { actorDisplayName, resolveActorDisplayMap } from "@/server/actors/display";
import { getStockBalanceDetails } from "@/server/queries/inventory";
import { requireReadCount, requireReadRows } from "@/server/queries/common";

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

const PRODUCTION_JOB_PAGE_SIZE = 15;
const PRODUCTION_JOB_SORT_COLUMNS = new Set(["production_job_no", "production_date", "status", "updated_at"]);

function requestedPage(value?: string) {
  const parsed = Number(value ?? "1");
  return Number.isFinite(parsed) ? Math.max(Math.trunc(parsed), 1) : 1;
}

function safeSearch(value?: string) {
  return value?.trim().replace(/[(),]/g, " ").replace(/[\\%_]/g, "\\$&") || null;
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
  const search = safeSearch(filters.search);
  const [matchingBranches, matchingProducts] = search ? await Promise.all([
    supabase.from("branches").select("id").ilike("branch_name", `%${search}%`).limit(50),
    supabase.from("products").select("id").ilike("product_name", `%${search}%`).limit(50),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (matchingBranches.error || matchingProducts.error) throw new Error((matchingBranches.error ?? matchingProducts.error)!.message);
  const branchMatches = (matchingBranches.data ?? []).map((row) => row.id);
  const productMatches = (matchingProducts.data ?? []).map((row) => row.id);
  const sort = PRODUCTION_JOB_SORT_COLUMNS.has(filters.sort ?? "") ? filters.sort! : "production_date";
  let query = db.from("production_jobs").select("*", { count: "exact" }).is("deleted_at", null);
  if (filters.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.branch_id && filters.branch_id !== "all") query = query.eq("branch_id", filters.branch_id);
  if (filters.from) query = query.gte("production_date", filters.from);
  if (filters.to) query = query.lte("production_date", filters.to);
  if (search) {
    const related = [
      branchMatches.length ? `branch_id.in.(${branchMatches.join(",")})` : null,
      productMatches.length ? `product_id.in.(${productMatches.join(",")})` : null,
    ].filter(Boolean);
    query = query.or([`production_job_no.ilike.%${search}%`, `remarks.ilike.%${search}%`, ...related].join(","));
  }
  query = query.order(sort, { ascending: filters.dir === "asc" }).order("id", { ascending: false });
  const requested = requestedPage(filters.page);
  if (filters.page !== "all") query = query.range((requested - 1) * PRODUCTION_JOB_PAGE_SIZE, requested * PRODUCTION_JOB_PAGE_SIZE - 1);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const productionRows = requireReadRows(data, "Production jobs") as Array<Record<string, unknown>>;
  const totalRows = requireReadCount(count, "Production job count");
  const totalPages = Math.max(Math.ceil(totalRows / PRODUCTION_JOB_PAGE_SIZE), 1);
  const page = filters.page === "all" ? 1 : Math.min(requested, totalPages);
  if (productionRows.length === 0) return { rows: [], totalRows, page, pageSize: PRODUCTION_JOB_PAGE_SIZE, totalPages };
  const jobs = productionRows.map(asProductionJob);
  const branchIds = [...new Set(jobs.map((job) => job.branch_id))];
  const productIds = [...new Set(jobs.map((job) => job.product_id).filter((id): id is string => Boolean(id)))];
  const [branchesResult, productsResult] = await Promise.all([
    supabase.from("branches").select("id, branch_name").in("id", branchIds),
    productIds.length > 0 ? supabase.from("products").select("id, product_code, product_name").in("id", productIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (branchesResult.error || productsResult.error) throw new Error((branchesResult.error ?? productsResult.error)!.message);
  const branchRows = requireReadRows(branchesResult.data, "Production job branches") as Array<{ id: string; branch_name: string }>;
  const productRows = requireReadRows(productsResult.data as Array<{ id: string; product_code: string; product_name: string }> | null, "Production job products");
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

  return { rows, totalRows, page, pageSize: PRODUCTION_JOB_PAGE_SIZE, totalPages };
}

export type ProductionJobSummary = { total: number; draft: number; submitted: number; approved: number; posted: number; cancelled: number };

export async function getProductionJobSummary(): Promise<ProductionJobSummary> {
  if (isMockMode()) return { total: 0, draft: 0, submitted: 0, approved: 0, posted: 0, cancelled: 0 };
  const supabase = await createClient();
  const db = looseSupabase(supabase);
  const statuses = ["draft", "submitted", "approved", "posted", "cancelled"] as const;
  const [totalResult, ...statusResults] = await Promise.all([
    db.from("production_jobs").select("id", { count: "exact", head: true }).is("deleted_at", null),
    ...statuses.map((status) => db.from("production_jobs").select("id", { count: "exact", head: true }).eq("status", status).is("deleted_at", null)),
  ]);
  for (const result of [totalResult, ...statusResults]) if (result.error) throw new Error(result.error.message);
  return {
    total: requireReadCount(totalResult.count, "Production job total"),
    ...Object.fromEntries(statuses.map((status, index) => [status, requireReadCount(statusResults[index].count, `Production job ${status} count`)])),
  } as ProductionJobSummary;
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
  const trustedIngredientLines = requireReadRows(ingredientLines, "Production ingredient lines");
  const trustedOutputLines = requireReadRows(outputLines, "Production output lines");

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
    ingredientLines: trustedIngredientLines.map((line: Record<string, unknown>) => ({
      ...(line as unknown as ProductionIngredientLine),
      required_qty: Number(line.required_qty ?? 0),
      actual_qty: line.actual_qty == null ? null : Number(line.actual_qty),
      unit_cost: Number(line.unit_cost ?? 0),
      line_cost: Number(line.line_cost ?? 0),
      stock_available_qty: line.stock_available_qty == null ? null : Number(line.stock_available_qty),
      variance_qty: line.variance_qty == null ? null : Number(line.variance_qty),
    })),
    outputLines: trustedOutputLines.map((line: Record<string, unknown>) => ({
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
    branches: requireReadRows(branches, "Production branch options"),
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
  if (!Array.isArray(data)) throw new Error("Production recipe options data is temporarily unavailable.");
  return (data as Array<Record<string, unknown>>).map((recipe) => ({
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
    todayPosted: requireReadCount(posted.count, "Posted production jobs"),
    pendingApproval: requireReadCount(pending.count, "Pending production jobs"),
    readyToPost: requireReadCount(readyToPost.count, "Ready production jobs"),
    activeRecipes: recipes.length,
    ingredientShortages: requireReadCount(shortageLines.count, "Production ingredient shortages"),
  };
}
