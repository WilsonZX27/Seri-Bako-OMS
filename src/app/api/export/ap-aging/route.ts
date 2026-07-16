import { NextResponse } from "next/server";
import { rowsToCsv } from "@/server/backup/export";
import { getApAgingReport } from "@/server/queries/ap-aging";

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams.entries());
    const report = await getApAgingReport(params, true);
    const agingRows = [...report.rows];
    for (let page = 2; agingRows.length < report.total_rows; page += 1) {
      const next = await getApAgingReport({ ...params, page: String(page) }, true);
      if (!next.rows.length) break;
      agingRows.push(...next.rows);
    }
    const rows = agingRows.map((row) => ({
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
    return new NextResponse(`\uFEFF${rowsToCsv(rows)}`, { headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="ap-aging-${report.report_date}.csv"`,
      "cache-control": "no-store",
    } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, message: "AP Aging CSV could not be exported." }, { status: 403 });
  }
}
