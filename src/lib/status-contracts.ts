export const PURCHASE_REQUEST_STATUSES = [
  "draft",
  "manager_review",
  "admin_review",
  "finance_review",
  "ready_to_convert",
  "converted_to_po",
  "rejected",
  "returned",
  "cancelled",
] as const;

export type PurchaseRequestStatus = (typeof PURCHASE_REQUEST_STATUSES)[number];

export const STOCK_OPERATION_STATUSES = [
  "draft",
  "submitted",
  "approved",
  "in_transit",
  "posted",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type StockOperationStatus = (typeof STOCK_OPERATION_STATUSES)[number];

export function assertPurchaseRequestStatus(status: string): asserts status is PurchaseRequestStatus {
  if (!PURCHASE_REQUEST_STATUSES.includes(status as PurchaseRequestStatus)) throw new Error(`Invalid purchase request status: ${status}`);
}

export function assertStockOperationStatus(status: string): asserts status is StockOperationStatus {
  if (!STOCK_OPERATION_STATUSES.includes(status as StockOperationStatus)) throw new Error(`Invalid stock operation status: ${status}`);
}
