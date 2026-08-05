import { NextResponse } from "next/server";
import { rowsToCsv } from "@/server/backup/export";
import { hasPermission } from "@/server/auth/permissions";
import { looseSupabase } from "@/lib/supabase/loose";
import { createClient } from "@/lib/supabase/server";
import { logServerError } from "@/server/observability/logger";

const exportTables: Record<string, { table: string; permission: string; order?: string; dateColumn?: string }> = {
  items: { table: "items", permission: "items.manage", order: "item_name" },
  suppliers: { table: "suppliers", permission: "suppliers.manage", order: "name" },
  "supplier-items": { table: "supplier_items", permission: "suppliers.manage", order: "created_at" },
  "uom-conversions": { table: "uom_conversions", permission: "settings.manage", order: "from_uom" },
  branches: { table: "branches", permission: "settings.manage", order: "branch_name" },
  staffs: { table: "staffs", permission: "staff.manage", order: "full_name" },
  "stock-transactions": { table: "stock_transactions", permission: "documents.view", order: "created_at" },
  "purchase-requests": { table: "purchase_requests", permission: "pr.view_branch", order: "created_at" },
  "purchase-orders": { table: "purchase_orders", permission: "po.create", order: "created_at", dateColumn: "order_date" },
  "production-jobs": { table: "production_jobs", permission: "production.view", order: "created_at" },
  "stock-counts": { table: "stock_counts", permission: "stock_count.read", order: "count_date", dateColumn: "count_date" },
};

export async function GET(request: Request, { params }: { params: Promise<{ table: string }> }) {
  const { table: key } = await params;
  const config = exportTables[key];
  if (!config) {
    return NextResponse.json({ ok: false, message: "Export is not available for this page." }, { status: 404 });
  }

  const allowed = await hasPermission(config.permission);
  if (!allowed) {
    return NextResponse.json({ ok: false, message: "You do not have permission to export this data." }, { status: 403 });
  }

  const supabase = await createClient();
  const db = looseSupabase(supabase);
  let query = db.from(config.table).select("*").limit(10000);
  const url = new URL(request.url);
  if (config.dateColumn && url.searchParams.get("from")) query = query.gte(config.dateColumn, url.searchParams.get("from")!);
  if (config.dateColumn && url.searchParams.get("to")) query = query.lte(config.dateColumn, url.searchParams.get("to")!);
  if (url.searchParams.get("status") && url.searchParams.get("status") !== "all") query = query.eq("status", url.searchParams.get("status")!);
  if (key === "stock-counts") query = query.is("deleted_at", null);
  if (config.order) query = query.order(config.order, { ascending: true });
  const { data, error } = await query;
  if (error) {
    logServerError(error, { source: "api.export.table", });
    return NextResponse.json({ ok: false, message: "CSV could not be exported." }, { status: 500 });
  }

  return new NextResponse(rowsToCsv((data ?? []) as Record<string, unknown>[]), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${key}.csv"`,
      "cache-control": "no-store",
    },
  });
}
