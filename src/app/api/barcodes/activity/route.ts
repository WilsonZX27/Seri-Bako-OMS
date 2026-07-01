import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockMode } from "@/lib/mock-mode";
import { writeActivityLog } from "@/server/activity/log";

const scanActivitySchema = z.object({
  entityType: z.enum(["item", "product"]),
  entityId: z.string().min(1),
  barcode: z.string().min(1),
  workflow: z.string().min(1),
  quantity: z.number().min(0),
});

export async function POST(request: Request) {
  const parsed = scanActivitySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  if (!isMockMode()) {
    await writeActivityLog({
      entityType: parsed.data.entityType,
      entityId: parsed.data.entityId,
      activityType: parsed.data.workflow === "stock_count" ? "item_counted_via_barcode" : "barcode_workflow_line_saved",
      message: `Barcode ${parsed.data.barcode} saved in ${parsed.data.workflow} with quantity ${parsed.data.quantity}`,
    });
  }

  return NextResponse.json({ ok: true });
}
