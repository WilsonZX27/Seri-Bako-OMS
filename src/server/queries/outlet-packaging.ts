import { shiftBusinessDate, todayInKualaLumpur } from "@/lib/business-date";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";

export type PackagingUsageRow = {
  id: string;
  date: string;
  branchId: string;
  branch: string;
  product: string;
  code: string;
  unit: string;
  received: number | null;
  usage: number;
  closing: number | null;
  status: string;
};

export async function getOutletPackagingReport(days: 7 | 30) {
  const today = todayInKualaLumpur();
  const start = shiftBusinessDate(today, 1 - days);
  const empty = { rows: [] as PackagingUsageRow[], latest: [] as PackagingUsageRow[], products: [] as Array<{ id: string; code: string; name: string; unit: string }>, outlets: [] as Array<{ id: string; name: string }>, today };
  if (isMockMode()) return empty;
  const db = await createClient();
  const [productResult, branchResult] = await Promise.all([
    db.from("products").select("id,product_code,product_name,selling_unit").ilike("category", "packaging").is("deleted_at", null),
    db.from("branches").select("id,branch_name").eq("branch_type", "outlet").eq("status", "active").is("deleted_at", null).order("branch_name"),
  ]);
  if (productResult.error || branchResult.error) throw new Error(productResult.error?.message ?? branchResult.error?.message);
  const products = productResult.data ?? [];
  const outlets = branchResult.data ?? [];
  if (!products.length || !outlets.length) return empty;
  // Latest balances are independent of the selected trend period. Read each
  // outlet's latest completed record, without imposing a historical cutoff.
  const latestPromise = Promise.all(outlets.map((outlet) => db.from("outlet_daily_records")
    .select("id,branch_id,record_date,status").eq("branch_id", outlet.id)
    .in("status", ["evening_completed", "reviewed"]).lte("record_date", today)
    .order("record_date", { ascending: false }).limit(1)));
  const trendPromise = db.from("outlet_daily_records").select("id,branch_id,record_date,status", { count: "exact" })
    .in("branch_id", outlets.map((outlet) => outlet.id)).in("status", ["evening_completed", "reviewed"])
    .gte("record_date", start).lte("record_date", today).order("record_date", { ascending: false }).limit(1000);
  const [latestResults, trendResult] = await Promise.all([latestPromise, trendPromise]);
  for (const result of latestResults) if (result.error) throw new Error(result.error.message);
  if (trendResult.error) throw new Error(trendResult.error.message);
  if ((trendResult.count ?? 0) > (trendResult.data?.length ?? 0)) throw new Error("Packaging report exceeded the read limit.");
  const latestRecords = latestResults.flatMap((result) => result.data ?? []);
  const records = [...new Map([...latestRecords, ...(trendResult.data ?? [])].map((record) => [record.id, record])).values()];
  const productMap = new Map(products.map((product) => [product.id, product]));
  const branchMap = new Map(outlets.map((outlet) => [outlet.id, outlet.branch_name]));
  const latestIds = new Set(latestRecords.map((record) => record.id));
  const rows: PackagingUsageRow[] = [];
  const latest: PackagingUsageRow[] = [];
  const batchSize = Math.max(1, Math.min(100, Math.floor(900 / products.length)));
  const batches = Array.from({ length: Math.ceil(records.length / batchSize) }, (_, index) => records.slice(index * batchSize, (index + 1) * batchSize));
  // Cap concurrency so a month does not become a serial request waterfall or
  // an unbounded database burst. Each request retains its exact-count guard.
  for (let offset = 0; offset < batches.length; offset += 4) {
    const group = batches.slice(offset, offset + 4);
    const results = await Promise.all(group.map((batch) => db.from("outlet_daily_record_lines")
      .select("record_id,product_id,morning_received_qty,morning_received_provided,wastage_qty,evening_leftover_qty", { count: "exact" })
      .in("record_id", batch.map((record) => record.id)).in("product_id", [...productMap.keys()])));
    for (let index = 0; index < group.length; index++) {
      const batch = group[index];
      const result = results[index];
      if (result.error) throw new Error(result.error.message);
      if ((result.count ?? 0) > (result.data?.length ?? 0)) throw new Error("Packaging lines exceeded the read limit.");
      const recordMap = new Map(batch.map((record) => [record.id, record]));
      for (const line of result.data ?? []) {
        const record = recordMap.get(line.record_id);
        const product = productMap.get(line.product_id);
        if (!record || !product) continue;
        const row: PackagingUsageRow = {
          id: `${record.id}:${product.id}`, date: record.record_date, branchId: record.branch_id,
          branch: branchMap.get(record.branch_id) ?? "Unknown outlet", product: product.product_name,
          code: product.product_code, unit: product.selling_unit,
          received: line.morning_received_provided ? Number(line.morning_received_qty) : null,
          usage: Number(line.wastage_qty), closing: Number(line.evening_leftover_qty), status: record.status,
        };
        if (record.record_date >= start) rows.push(row);
        if (latestIds.has(record.id)) latest.push(row);
      }
    }
  }
  return { rows, latest, today,
    products: products.map((product) => ({ id: product.id, code: product.product_code, name: product.product_name, unit: product.selling_unit })),
    outlets: outlets.map((outlet) => ({ id: outlet.id, name: outlet.branch_name })),
  };
}
