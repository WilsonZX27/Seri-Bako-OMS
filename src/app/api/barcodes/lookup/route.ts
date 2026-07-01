import { NextResponse } from "next/server";
import { barcodeLookupSchema } from "@/lib/validations/barcode";
import { lookupBarcode } from "@/server/queries/barcodes";
import { writeActivityLog } from "@/server/activity/log";
import { isMockMode } from "@/lib/mock-mode";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = barcodeLookupSchema.safeParse({ barcode: searchParams.get("barcode") });
  if (!parsed.success) {
    return NextResponse.json({ found: false, error: "Barcode is required" }, { status: 400 });
  }

  const result = await lookupBarcode(parsed.data.barcode);

  if (!isMockMode()) {
    await writeActivityLog({
      entityType: result.found ? result.stock_entity_type ?? "barcode" : "barcode",
      entityId: result.id ?? "00000000-0000-0000-0000-000000000000",
      activityType: result.found ? "barcode_scanned" : "unknown_barcode_scanned",
      message: result.found ? `Barcode ${result.barcode} scanned` : `Unknown barcode ${result.barcode} scanned`,
    });
  }

  return NextResponse.json(result);
}
