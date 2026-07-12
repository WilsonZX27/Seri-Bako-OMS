import { NextResponse } from "next/server";
import { hasPermission } from "@/server/auth/permissions";
import { getStockLedger } from "@/server/queries/inventory";

const headers = [
  "transaction number",
  "date",
  "item",
  "branch",
  "transaction type",
  "quantity in",
  "quantity out",
  "uom",
  "unit cost",
  "total value",
  "source type",
  "source reference",
];

function csv(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  if (!(await hasPermission("stock_ledger.export"))) {
    return NextResponse.json({ ok: false, message: "You do not have permission to export this data." }, { status: 403 });
  }

  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  const ledger = await getStockLedger({ ...params, page: "all" });
  const rows = ledger.rows.map((row) => [
    row.transaction_no,
    row.transaction_date,
    `${row.item_code} - ${row.item_name}`,
    row.branch_name ?? row.location_name,
    row.transaction_type,
    row.quantity_in,
    row.quantity_out,
    row.base_unit,
    row.unit_cost,
    row.total_cost,
    row.reference_type,
    row.reference_id ?? row.document_id,
  ]);
  return new NextResponse([headers, ...rows].map((row) => row.map(csv).join(",")).join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": "attachment; filename=stock-ledger.csv",
    },
  });
}
