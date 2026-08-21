import { NextResponse } from "next/server";
import { rowsToCsv } from "@/server/backup/export";
import { hasPermission } from "@/server/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/server/observability/logger";

export async function GET(request: Request) {
  if (!(await hasPermission("outlet_daily_record.view"))) {
    return NextResponse.json({ ok: false, message: "You do not have permission to export outlet daily records." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const db = await createClient();
    let query = db
      .from("outlet_daily_records")
      .select("id, branch_id, record_date, status, submitted_by, notes, created_at, updated_at")
      .order("record_date", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(10000);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const date = url.searchParams.get("date");
    const filterBranchIds = (url.searchParams.get("branches") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    if (from) query = query.gte("record_date", from);
    if (to) query = query.lte("record_date", to);
    if (!from && !to && date) query = query.eq("record_date", date);
    if (filterBranchIds.length) query = query.in("branch_id", filterBranchIds);
    else if (url.searchParams.get("branch") && url.searchParams.get("branch") !== "all") query = query.eq("branch_id", url.searchParams.get("branch")!);
    if (url.searchParams.get("status") && url.searchParams.get("status") !== "all") query = query.eq("status", url.searchParams.get("status")! as never);
    const { data: records, error: recordsError } = await query;
    if (recordsError) throw recordsError;

    const rows = records ?? [];
    const branchIds = [...new Set(rows.map((row) => row.branch_id))];
    const staffIds = [...new Set(rows.flatMap((row) => row.submitted_by ? [row.submitted_by] : []))];
    const [{ data: branches, error: branchesError }, staffResult] = await Promise.all([
      branchIds.length ? db.from("branches").select("id, branch_name").in("id", branchIds) : Promise.resolve({ data: [], error: null }),
      staffIds.length ? db.from("staffs").select("id, full_name").in("id", staffIds) : Promise.resolve({ data: [], error: null }),
    ]);
    if (branchesError) throw branchesError;
    if (staffResult.error) throw staffResult.error;
    const branchNames = new Map((branches ?? []).map((row) => [row.id, row.branch_name]));
    const staffNames = new Map((staffResult.data ?? []).map((row) => [row.id, row.full_name]));
    const recordIds = rows.map((row) => row.id);
    const { data: lines, error: linesError } = recordIds.length
      ? await db.from("outlet_daily_record_lines").select("record_id, product_id, qty_sent, qty_sent_estimated, qty_sent_confirmed, qty_sent_source, morning_received_qty, morning_received_provided, evening_leftover_qty, wastage_qty, wastage_reason, notes").in("record_id", recordIds)
      : { data: [], error: null };
    if (linesError) throw linesError;
    const productIds = [...new Set((lines ?? []).map((line) => line.product_id))];
    const [{ data: products, error: productsError }, { data: recipes, error: recipesError }] = await Promise.all([
      productIds.length ? db.from("products").select("id, product_code, product_name, selling_unit").in("id", productIds) : Promise.resolve({ data: [], error: null }),
      productIds.length ? db.from("recipes").select("id, product_id").in("product_id", productIds).eq("status", "active").is("deleted_at", null) : Promise.resolve({ data: [], error: null }),
    ]);
    if (productsError) throw productsError;
    if (recipesError) throw recipesError;
    const recipeIds = (recipes ?? []).map((recipe) => recipe.id);
    const { data: snapshots, error: snapshotsError } = recipeIds.length
      ? await db.from("recipe_cost_snapshots").select("recipe_id, snapshot_no, cost_per_finished_unit").in("recipe_id", recipeIds).order("snapshot_no", { ascending: false })
      : { data: [], error: null };
    if (snapshotsError) throw snapshotsError;
    const productById = new Map((products ?? []).map((product) => [product.id, product]));
    const recipeByProduct = new Map((recipes ?? []).map((recipe) => [recipe.product_id, recipe.id]));
    const latestCostByRecipe = new Map<string, number>();
    for (const snapshot of snapshots ?? []) if (!latestCostByRecipe.has(snapshot.recipe_id)) latestCostByRecipe.set(snapshot.recipe_id, Number(snapshot.cost_per_finished_unit));
    const canViewWastageCost = await hasPermission("outlet_daily_record.view_all");
    const exportRows: Record<string, unknown>[] = (lines ?? []).map((line) => {
      const record = rows.find((candidate) => candidate.id === line.record_id);
      const product = productById.get(line.product_id);
      const recipeId = recipeByProduct.get(line.product_id);
      const unitCost = canViewWastageCost && recipeId ? latestCostByRecipe.get(recipeId) ?? null : null;
      const wastage = Number(line.wastage_qty ?? 0);
      return {
        record_id: line.record_id,
        record_date: record?.record_date ?? null,
        outlet: record ? branchNames.get(record.branch_id) ?? "Unknown outlet" : "Unknown outlet",
        status: record?.status ?? "Unavailable",
        product_code: product?.product_code ?? "Unavailable",
        product: product?.product_name ?? "Unavailable product",
        selling_unit: product?.selling_unit ?? null,
        qty_sent: Number(line.qty_sent ?? line.qty_sent_estimated ?? 0),
        qty_sent_source: line.qty_sent_source,
        qty_sent_confirmed: line.qty_sent_confirmed,
        received: line.morning_received_provided ? Number(line.morning_received_qty ?? 0) : null,
        leftover: Number(line.evening_leftover_qty ?? 0),
        wastage,
        wastage_reason: line.wastage_reason,
        wastage_unit_cost: unitCost,
        wastage_amount: unitCost === null ? null : Number((wastage * unitCost).toFixed(4)),
        wastage_cost_status: canViewWastageCost ? (unitCost === null ? "Unavailable — no active recipe cost snapshot" : "Recipe cost snapshot") : "Restricted",
        line_notes: line.notes,
        submitted_by: record?.submitted_by ? staffNames.get(record.submitted_by) ?? "Unavailable" : "Draft",
        created_at: record?.created_at ?? null,
        updated_at: record?.updated_at ?? null,
      };
    });

    // Keep empty records visible in an export instead of silently turning a
    // detailed export into an empty file.
    if (!exportRows.length) {
      exportRows.push(...rows.map((row) => ({
        record_id: row.id,
        record_date: row.record_date,
        outlet: branchNames.get(row.branch_id) ?? "Unknown outlet",
        status: row.status,
        product_code: null,
        product: "No product lines",
        selling_unit: null,
        qty_sent: null,
        qty_sent_source: "unavailable",
        qty_sent_confirmed: false,
        received: null,
        leftover: null,
        wastage: null,
        wastage_reason: null,
        wastage_unit_cost: null,
        wastage_amount: null,
        wastage_cost_status: canViewWastageCost ? "Unavailable" : "Restricted",
        line_notes: row.notes,
        submitted_by: row.submitted_by ? staffNames.get(row.submitted_by) ?? "Unavailable" : "Draft",
        created_at: row.created_at,
        updated_at: row.updated_at,
      })));
    }

    const safeDate = /^\d{4}-\d{2}-\d{2}$/;
    const exportDate = date && safeDate.test(date) ? date : new Date().toISOString().slice(0, 10);
    const filename = from && to && safeDate.test(from) && safeDate.test(to)
      ? `outlet-daily-records_${from}_to_${to}.csv`
      : `outlet-daily-records_${exportDate}.csv`;

    return new NextResponse(rowsToCsv(exportRows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename=${filename}`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    logServerError(error, { source: "api.export.outletDailyRecords" });
    return NextResponse.json({ ok: false, message: "Outlet daily records could not be exported." }, { status: 500 });
  }
}
