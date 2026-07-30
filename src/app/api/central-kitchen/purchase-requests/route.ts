import { NextResponse } from "next/server";
import { createCentralKitchenPurchaseRequest, toPurchaseRequestErrorResponse } from "@/server/services/central-kitchen-purchase-request";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await createCentralKitchenPurchaseRequest(await request.json());
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    const response = toPurchaseRequestErrorResponse(error);
    const status = response.error.code === "INVALID_REQUEST" ? 400 : response.error.code === "INSUFFICIENT_INVENTORY" ? 409 : response.error.code === "INVALID_UNIT_CONVERSION" ? 422 : 500;
    return NextResponse.json(response, { status });
  }
}
