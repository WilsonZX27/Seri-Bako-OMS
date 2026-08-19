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
      ? await db.from("outlet_daily_record_lines").select("record_id, qty_sent_estimated, morning_received_qty, wastage_qty").in("record_id", recordIds)
      : { data: [], error: null };
    if (linesError) throw linesError;
    const totals = new Map<string, { sent: number; received: number; wastage: number }>();
    for (const line of lines ?? []) {
      const current = totals.get(line.record_id) ?? { sent: 0, received: 0, wastage: 0 };
      current.sent += Number(line.qty_sent_estimated ?? 0);
      current.received += Number(line.morning_received_qty ?? 0);
      current.wastage += Number(line.wastage_qty ?? 0);
      totals.set(line.record_id, current);
    }
    const exportRows = rows.map((row) => {
      const total = totals.get(row.id) ?? { sent: 0, received: 0, wastage: 0 };
      return {
        record_id: row.id,
        record_date: row.record_date,
        outlet: branchNames.get(row.branch_id) ?? "Unknown outlet",
        status: row.status,
        submitted_by: row.submitted_by ? staffNames.get(row.submitted_by) ?? "Unavailable" : "Draft",
        qty_sent: total.sent,
        received: total.received,
        wastage: total.wastage,
        wastage_rate: total.received > 0 ? Number(((total.wastage / total.received) * 100).toFixed(4)) : null,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,
      };
    });

    return new NextResponse(rowsToCsv(exportRows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=outlet-daily-records.csv",
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    logServerError(error, { source: "api.export.outletDailyRecords" });
    return NextResponse.json({ ok: false, message: "Outlet daily records could not be exported." }, { status: 500 });
  }
}
