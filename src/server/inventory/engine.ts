import { createClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/server/activity/log";
import type { Database, StockTransactionType } from "@/types/database";

type MovementType =
  | "GOODS_RECEIPT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "STOCK_ADJUSTMENT"
  | "STOCK_COUNT"
  | "PRODUCTION_CONSUMPTION"
  | "PRODUCTION_OUTPUT"
  | "WASTAGE"
  | "RETURN_TO_SUPPLIER"
  | "RETURN_FROM_BRANCH";

type MovementDirection = "in" | "out";

type CreateMovementInput = {
  movementType: MovementType;
  transactionNo: string;
  itemId: string;
  locationId: string;
  branchId?: string | null;
  quantity: number;
  unitCost?: number | null;
  transactionDate?: string;
  documentId?: string | null;
  referenceType?: string | null;
  referenceId?: string | null;
  remarks?: string | null;
  postedBy?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  allowNegative?: boolean;
  direction?: MovementDirection;
};

const movementConfig = {
  GOODS_RECEIPT: { transactionType: "purchase", direction: "in", label: "Received From" },
  TRANSFER_IN: { transactionType: "transfer_in", direction: "in", label: "Transferred To" },
  TRANSFER_OUT: { transactionType: "transfer_out", direction: "out", label: "Transferred From" },
  STOCK_ADJUSTMENT: { transactionType: "stock_adjustment", direction: "in", label: "Adjusted By" },
  STOCK_COUNT: { transactionType: "stock_count_adjustment", direction: "in", label: "Adjusted after stock count" },
  PRODUCTION_CONSUMPTION: { transactionType: "production_usage", direction: "out", label: "Consumed by Production Order" },
  PRODUCTION_OUTPUT: { transactionType: "production_output", direction: "in", label: "Produced by Production Order" },
  WASTAGE: { transactionType: "wastage", direction: "out", label: "Reported Wastage" },
  RETURN_TO_SUPPLIER: { transactionType: "return_to_supplier", direction: "out", label: "Returned To Supplier" },
  RETURN_FROM_BRANCH: { transactionType: "transfer_in", direction: "in", label: "Returned From Branch" },
} satisfies Record<MovementType, { transactionType: StockTransactionType; direction: MovementDirection; label: string }>;

export const inventoryMovementTypes = Object.keys(movementConfig) as MovementType[];

async function getCurrentBalance(itemId: string, locationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stock_transactions")
    .select("quantity_in, quantity_out")
    .eq("item_id", itemId)
    .eq("location_id", locationId)
    .eq("status", "posted");
  if (error) throw new Error(error.message);
  return (data ?? []).reduce((sum, row) => sum + Number(row.quantity_in) - Number(row.quantity_out), 0);
}

export async function createInventoryMovement(input: CreateMovementInput) {
  const config = movementConfig[input.movementType];
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Stock movement quantity must be greater than zero.");
  }
  const direction = input.direction ?? config.direction;

  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("stock_transactions")
    .select("id")
    .eq("transaction_no", input.transactionNo)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existing?.id) return { id: existing.id, duplicate: true };

  if (direction === "out" && !input.allowNegative) {
    const currentBalance = await getCurrentBalance(input.itemId, input.locationId);
    if (currentBalance < quantity) {
      throw new Error("This stock movement would make current stock negative. Please check the quantity or stock location.");
    }
  }

  const quantityIn = direction === "in" ? quantity : 0;
  const quantityOut = direction === "out" ? quantity : 0;
  const unitCost = Number(input.unitCost ?? 0);
  const totalCost = unitCost * quantity;
  const now = new Date().toISOString();

  const { data: stockTransaction, error: stockError } = await supabase
    .from("stock_transactions")
    .insert({
      transaction_no: input.transactionNo,
      document_id: input.documentId ?? null,
      branch_id: input.branchId ?? null,
      item_id: input.itemId,
      location_id: input.locationId,
      transaction_type: config.transactionType,
      transaction_date: input.transactionDate,
      quantity_in: quantityIn,
      quantity_out: quantityOut,
      unit_cost: unitCost,
      total_cost: totalCost,
      status: "posted",
      posted_at: now,
      posted_by: input.postedBy ?? null,
      remarks: input.remarks ?? config.label,
      reference_type: input.referenceType ?? null,
      reference_id: input.referenceId ?? null,
      from_location_id: input.fromLocationId ?? null,
      to_location_id: input.toLocationId ?? null,
      created_by: input.postedBy ?? null,
    })
    .select("id")
    .single();
  if (stockError) throw new Error(stockError.message);

  const { error: lineError } = await supabase.from("stock_transaction_lines").insert({
    stock_transaction_id: stockTransaction.id,
    stock_entity_type: "item",
    item_id: input.itemId,
    branch_id: input.branchId ?? null,
    location_id: input.locationId,
    quantity_in: quantityIn,
    quantity_out: quantityOut,
    unit_cost: unitCost,
    reference_type: input.referenceType ?? null,
    reference_id: input.referenceId ?? null,
    remarks: input.remarks ?? config.label,
    created_by: input.postedBy ?? null,
  });
  if (lineError) throw new Error(lineError.message);

  await writeActivityLog({
    entityType: "stock_transaction",
    entityId: stockTransaction.id,
    activityType: "posted",
    message: input.remarks ?? `${config.label} stock movement posted.`,
    metadata: {
      movement_type: input.movementType,
      item_id: input.itemId,
      location_id: input.locationId,
      quantity,
    } satisfies Database["public"]["Tables"]["activity_logs"]["Insert"]["metadata"],
  });

  return { id: stockTransaction.id, duplicate: false };
}
