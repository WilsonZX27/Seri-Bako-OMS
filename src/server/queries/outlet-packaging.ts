import { shiftBusinessDate, todayInKualaLumpur } from "@/lib/business-date";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { hasPermission } from "@/server/auth/permissions";

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
  if (isMockMode()) return { rows: [] as PackagingUsageRow[], warehouse: [] as Array<{ id: string; itemId: string; name: string; branch: string; quantity: number; unit: string; isOutlet: boolean }>, products: [] as Array<{ id: string; code: string; name: string; unit: string }>, items: [] as Array<{ id: string; code: string; name: string; unit: string }>, links: [] as Array<{ productId: string; itemId: string; factor: number }>, mappingReady: false, warehouseTruncated: false, activeOutletCount: 0, today: todayInKualaLumpur(), truncated: false };
  const db = await createClient();
  const end = todayInKualaLumpur();
  const start = shiftBusinessDate(end, 1 - days);
  const [{ data: products, error: productError }, { data: records, error: recordError }, { data: branches, error: branchError }, { data: items, error: itemError }, { data: links, error: linkError }, canViewWarehouse] = await Promise.all([
    db.from("products").select("id,product_code,product_name,selling_unit,category").ilike("category", "packaging").is("deleted_at", null),
    db.from("outlet_daily_records").select("id,branch_id,record_date,status").gte("record_date", start).lte("record_date", end).neq("status", "void").order("record_date", { ascending: false }).limit(1000),
    db.from("branches").select("id,branch_name,branch_type,status").is("deleted_at", null),
    db.from("items").select("id,item_code,item_name,base_unit,category").ilike("category", "packaging").is("deleted_at", null),
    db.from("outlet_packaging_item_links").select("product_id,item_id,item_base_units_per_product_unit"),
    hasPermission("stock_balance.read"),
  ]);
  if (productError || recordError || branchError || itemError) throw new Error(productError?.message ?? recordError?.message ?? branchError?.message ?? itemError?.message ?? "Packaging report unavailable");
  const mappingReady = !linkError;
  if (linkError && !["42P01", "PGRST205"].includes(linkError.code ?? "")) throw new Error(linkError.message);
  const productMap = new Map((products ?? []).map((product) => [product.id, product]));
  const branchMap = new Map((branches ?? []).map((branch) => [branch.id, branch.branch_name]));
  const rows: PackagingUsageRow[] = [];
  if (productMap.size) {
    // Keep each PostgREST IN request bounded; a busy month can contain hundreds of records.
    for (let index = 0; index < (records ?? []).length; index += 20) {
      const batch = (records ?? []).slice(index, index + 20);
      const { data: lines, error, count } = await db.from("outlet_daily_record_lines")
        .select("record_id,product_id,morning_received_qty,morning_received_provided,wastage_qty,evening_leftover_qty", { count: "exact" })
        .in("record_id", batch.map((record) => record.id))
        .in("product_id", [...productMap.keys()]);
      if (error) throw new Error(error.message);
      if (count !== null && count > (lines?.length ?? 0)) throw new Error("Packaging report lines exceeded the read limit; narrow the period.");
      const recordMap = new Map(batch.map((record) => [record.id, record]));
      for (const line of lines ?? []) {
        const record = recordMap.get(line.record_id);
        const product = productMap.get(line.product_id);
        if (!record || !product) continue;
        rows.push({
          id: `${record.id}:${product.id}`,
          date: record.record_date,
          branchId: record.branch_id,
          branch: branchMap.get(record.branch_id) ?? "Unknown outlet",
          product: product.product_name,
          code: product.product_code,
          unit: product.selling_unit,
          received: line.morning_received_provided ? Number(line.morning_received_qty) : null,
          usage: Number(line.wastage_qty),
          // The form can calculate this balance from received minus usage, or
          // staff can edit it. It is a recorded balance, not a verified count.
          closing: ["evening_completed", "reviewed"].includes(record.status) ? Number(line.evening_leftover_qty) : null,
          status: record.status,
        });
      }
    }
  }
  let warehouse: Array<{ id: string; itemId: string; name: string; branch: string; quantity: number; unit: string; isOutlet: boolean }> = [];
  let warehouseTruncated = false;
  if (canViewWarehouse) {
    const { data, error, count } = await db.from("stock_balances_summary").select("item_id,item_name,branch_id,branch_name,current_qty,base_unit,category", { count: "exact" }).ilike("category", "packaging").order("item_name").limit(500);
    if (error) throw new Error(error.message);
    warehouseTruncated = count !== null && count > (data?.length ?? 0);
    const outletIds = new Set((branches ?? []).filter((branch) => branch.branch_type === "outlet").map((branch) => branch.id));
    warehouse = (data ?? []).map((item) => ({ id: `${item.item_id}:${item.branch_id}`, itemId: item.item_id, name: item.item_name, branch: item.branch_name, quantity: Number(item.current_qty), unit: item.base_unit, isOutlet: outletIds.has(item.branch_id) }));
  }
  rows.sort((left, right) => right.date.localeCompare(left.date) || left.branch.localeCompare(right.branch) || left.product.localeCompare(right.product));
  return {
    rows, warehouse,
    products: (products ?? []).map((product) => ({ id: product.id, code: product.product_code, name: product.product_name, unit: product.selling_unit })),
    items: (items ?? []).map((item) => ({ id: item.id, code: item.item_code, name: item.item_name, unit: item.base_unit })),
    links: (links ?? []).map((link) => ({ productId: link.product_id, itemId: link.item_id, factor: Number(link.item_base_units_per_product_unit) })),
    mappingReady, warehouseTruncated,
    activeOutletCount: (branches ?? []).filter((branch) => branch.branch_type === "outlet" && branch.status === "active").length,
    today: end,
    truncated: (records ?? []).length === 1000,
  };
}
