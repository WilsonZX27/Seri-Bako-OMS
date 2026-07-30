import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CentralKitchenPurchaseRequestStatus = "approved_pending_po" | "pending_manager_approval";

export interface CentralKitchenPurchaseRequestLine {
  item_id: string;
  quantity: number;
  ordering_unit: string;
  estimated_unit_cost: number;
  suggested_supplier_id?: string | null;
  reason?: string | null;
  remarks?: string | null;
}

export interface CreateCentralKitchenPurchaseRequestInput {
  branch_id: string;
  request_no?: string | null;
  request_date?: string;
  required_date?: string | null;
  remarks?: string | null;
  approval_threshold: number;
  idempotency_key: string;
  lines: CentralKitchenPurchaseRequestLine[];
}

export interface CentralKitchenPurchaseRequestResult {
  id: string;
  request_no: string;
  status: CentralKitchenPurchaseRequestStatus;
  total_value: number;
  low_stock_warning: boolean;
  line_inventory?: Array<{ item_id: string; requested_inventory_quantity: number; available_stock: number; safety_stock_threshold: number; low_stock_warning: boolean }>;
}

export class CentralKitchenPurchaseRequestError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
    this.name = "CentralKitchenPurchaseRequestError";
  }
}
export class InsufficientInventoryError extends CentralKitchenPurchaseRequestError {
  constructor(details?: unknown) { super("INSUFFICIENT_INVENTORY", "The requested quantity cannot be fulfilled from central kitchen inventory.", details); }
}
export class InvalidUnitConversionError extends CentralKitchenPurchaseRequestError {
  constructor(details?: unknown) { super("INVALID_UNIT_CONVERSION", "This item has no valid ordering-to-inventory unit conversion.", details); }
}

const lineSchema = z.object({
  item_id: z.string().uuid(), quantity: z.number().positive(), ordering_unit: z.string().trim().min(1).max(32),
  estimated_unit_cost: z.number().nonnegative(), suggested_supplier_id: z.string().uuid().nullable().optional(),
  reason: z.string().max(1_000).nullable().optional(), remarks: z.string().max(2_000).nullable().optional(),
});
const inputSchema = z.object({
  branch_id: z.string().uuid(), request_no: z.string().trim().max(64).nullable().optional(),
  request_date: z.string().date().optional(), required_date: z.string().date().nullable().optional(),
  remarks: z.string().max(2_000).nullable().optional(), approval_threshold: z.number().nonnegative(),
  idempotency_key: z.string().uuid(), lines: z.array(lineSchema).min(1).max(500),
});

export async function createCentralKitchenPurchaseRequest(input: CreateCentralKitchenPurchaseRequestInput): Promise<CentralKitchenPurchaseRequestResult> {
  const payload = inputSchema.parse(input);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_central_kitchen_purchase_request_atomic", { p_payload: payload });
  if (error) {
    const message = error.message ?? "Could not create the purchase request.";
    if (message.includes("INVALID_UNIT_CONVERSION")) throw new InvalidUnitConversionError(message);
    if (message.includes("INSUFFICIENT_INVENTORY")) throw new InsufficientInventoryError(message);
    throw new CentralKitchenPurchaseRequestError("PR_CREATION_FAILED", message);
  }
  return data as unknown as CentralKitchenPurchaseRequestResult;
}

export function toPurchaseRequestErrorResponse(error: unknown) {
  if (error instanceof CentralKitchenPurchaseRequestError) return { error: { code: error.code, message: error.message, details: error.details } };
  if (error instanceof z.ZodError) return { error: { code: "INVALID_REQUEST", message: "The purchase request payload is invalid.", details: error.flatten() } };
  return { error: { code: "INTERNAL_ERROR", message: "Could not create the purchase request." } };
}
