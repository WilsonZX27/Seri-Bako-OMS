import { NextResponse } from "next/server";
import { rowsToCsv } from "@/server/backup/export";
import { hasPermission } from "@/server/auth/permissions";
import { getCompleteApAgingReport } from "@/server/queries/ap-aging";
import { logServerError } from "@/server/observability/logger";

const MAX_AP_AGING_EXPORT_ROWS = 50_000;
const MAX_AP_AGING_EXPORT_BYTES = 25 * 1024 * 1024;

export async function GET(request: Request) {
  try {
    if (!(await hasPermission("supplier_invoice.pay"))) throw new Error("Missing permission: supplier_invoice.pay");
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const report = await getCompleteApAgingReport(params, { maxRows: MAX_AP_AGING_EXPORT_ROWS });
    const rows = report.rows.map((row) => ({
      internal_invoice_number: row.invoice_no,
      supplier_invoice_reference: row.supplier_invoice_no,
      supplier: row.supplier_name,
      invoice_date: row.invoice_date,
      due_date: row.due_date ?? "",
      days_overdue: row.days_overdue,
      original_total: row.original_total,
      amount_paid: row.amount_paid,
      outstanding: row.outstanding,
      aging_bucket: row.aging_bucket,
      status: row.status,
      currency: row.currency,
    }));
    const csv = `\uFEFF${rowsToCsv(rows)}`;
    if (Buffer.byteLength(csv, "utf8") > MAX_AP_AGING_EXPORT_BYTES) throw new Error("The AP Aging export is too large. Narrow the filters and try again.");
    return new NextResponse(csv, { headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ap-aging-${report.report_date}.csv"`,
      "cache-control": "no-store",
    } });
  } catch (error) {
    logServerError(error, { source: "api.export.apAging" });
    return NextResponse.json({ ok: false, message: "AP Aging CSV could not be exported." }, { status: 403 });
  }
}
