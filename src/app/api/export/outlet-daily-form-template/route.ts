import { NextResponse } from "next/server";
import { groupDailyProducts } from "@/lib/daily-product-tracking";
import { todayInKualaLumpur } from "@/lib/business-date";
import { hasPermission } from "@/server/auth/permissions";
import { rowsToCsv } from "@/server/backup/export";
import { getOutletDailyFormOptions } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";
import { buildOutletDailyRecordFormPdf } from "@/server/pdf/outlet-daily-record-form";
import { getCompanyBranding } from "@/server/queries/common";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasPermission("outlet_daily_record.view"))) {
    return NextResponse.json({ ok: false, message: "You do not have permission to download the outlet daily record form." }, { status: 403 });
  }

  try {
    const date = todayInKualaLumpur();
    const { products } = await getOutletDailyFormOptions(date);
    const groups = groupDailyProducts<(typeof products)[number]>(products);
    if (new URL(request.url).searchParams.get("format") !== "csv") {
      const branding = await getCompanyBranding();
      const pdf = await buildOutletDailyRecordFormPdf({ groups, companyName: branding.company_name, generatedDate: date });
      return new NextResponse(Buffer.from(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="outlet-daily-record-form-latest.pdf"',
          "Cache-Control": "private, no-store",
        },
      });
    }
    const rows = groups.flatMap((group) => group.products.map((product) => ({
      category: group.label,
      product_code: product.product_code,
      product: product.product_name,
      unit: product.selling_unit,
      qty_sent: "",
      received: "",
      wastage: "",
      usage: "",
      qty_sold: "",
      balance: "",
      wastage_details: "",
    })));
    const csv = `\uFEFF${rows.length ? rowsToCsv(rows) : "category,product_code,product,unit,qty_sent,received,wastage,usage,qty_sold,balance,wastage_details"}`;
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="outlet-daily-record-form-latest.csv"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    logServerError(error, { source: "api.export.outletDailyFormTemplate" });
    return NextResponse.json({ ok: false, message: "The latest outlet daily record form is unavailable. Please retry." }, { status: 503 });
  }
}
