import { shiftBusinessDate, todayInKualaLumpur } from "@/lib/business-date";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";

export type PackagingUsageRow = {
  id: string;
  date: string;
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
  if (isMockMode()) return { rows: [] as PackagingUsageRow[], warehouse: [] as Array<{ id: string; name: string; branch: string; quantity: number; unit: string }>, truncated: false };
  const db = await createClient();
  const end = todayInKualaLumpur();
  const start = shiftBusinessDate(end, 1 - days);
  const [{ data: products, error: productError }, { data: records, error: recordError }, { data: branches, error: branchError }, canViewWarehouse] = await Promise.all([
    db.from("products").select("id,product_code,product_name,selling_unit,category").ilike("category", "packaging").is("deleted_at", null),
    db.from("outlet_daily_records").select("id,branch_id,record_date,status").gte("record_date", start).lte("record_date", end).neq("status", "void").order("record_date", { ascending: false }).limit(1000),
    db.from("branches").select("id,branch_name"),
    hasPermission("stock_balance.read"),
  ]);
  if (productError || recordError || branchError) throw new Error(productError?.message ?? recordError?.message ?? branchError?.message ?? "Packaging report unavailable");
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
  const rows: PackagingUsageRow[] = [];
  if (productMap.size) {
    // Keep each PostgREST IN request bounded; a busy month can contain hundreds of records.
    for (let index = 0; index < (records ?? []).length; index += 100) {
      const batch = (records ?? []).slice(index, index + 100);
      const { data: lines, error } = await db.from("outlet_daily_record_lines")
        .select("record_id,product_id,morning_received_qty,morning_received_provided,wastage_qty,evening_leftover_qty")
        .in("record_id", batch.map((record) => record.id))
        .in("product_id", [...productMap.keys()]);
      if (error) throw new Error(error.message);
      const recordMap = new Map(batch.map((record) => [record.id, record]));
      for (const line of lines ?? []) {
        const record = recordMap.get(line.record_id);
        const product = productMap.get(line.product_id);
        if (!record || !product) continue;
        rows.push({
          id: `${record.id}:${product.id}`,
          date: record.record_date,
          branch: branchMap.get(record.branch_id) ?? "Unknown outlet",
          product: product.product_name,
          code: product.product_code,
          unit: product.selling_unit,
          received: line.morning_received_provided ? Number(line.morning_received_qty) : null,
          usage: Number(line.wastage_qty),
          // Closing balance is an outlet-entered physical count. An unfinished
          // record does not establish a reliable stock position.
          closing: ["evening_completed", "reviewed"].includes(record.status) ? Number(line.evening_leftover_qty) : null,
          status: record.status,
        });
      }
    }
  }
  let warehouse: Array<{ id: string; name: string; branch: string; quantity: number; unit: string }> = [];
  if (canViewWarehouse) {
    const { data, error } = await db.from("stock_balances_view").select("item_id,item_name,branch_name,current_qty,base_unit,category").ilike("category", "packaging").order("item_name").limit(500);
    if (error) throw new Error(error.message);
    warehouse = (data ?? []).map((item) => ({ id: `${item.item_id}:${item.branch_name ?? "unassigned"}`, name: item.item_name, branch: item.branch_name ?? "Unassigned", quantity: Number(item.current_qty), unit: item.base_unit }));
  }
  rows.sort((left, right) => right.date.localeCompare(left.date) || left.branch.localeCompare(right.branch) || left.product.localeCompare(right.product));
  return { rows, warehouse, truncated: (records ?? []).length === 1000 };
}
