import { z } from "zod";
import type { StockTransactionType } from "@/types/database";

const MAX_TRANSACTION_QUANTITY = 1_000_000;
const MAX_TRANSACTION_UNIT_COST = 1_000_000_000;

export const inboundTypes: StockTransactionType[] = ["opening_balance", "purchase", "production_output", "transfer_in", "extra", "customer_return"];
export const outboundTypes: StockTransactionType[] = ["production_usage", "transfer_out", "wastage", "damage", "missing", "return_supplier", "return_to_supplier"];
export const flexibleTypes: StockTransactionType[] = ["correction", "transfer", "stock_adjustment", "stock_count_adjustment"];

export const stockTransactionSchema = z
  .object({
    item_id: z.string().uuid("Select an item"),
    branch_id: z.string().uuid("Select a branch"),
    transaction_type: z.enum([
      "opening_balance",
      "purchase",
      "production_usage",
      "production_output",
      "transfer_in",
      "transfer_out",
      "stock_adjustment",
      "stock_count_adjustment",
      "wastage",
      "damage",
      "missing",
      "extra",
      "correction",
      "transfer",
      "return_supplier",
      "return_to_supplier",
      "customer_return",
    ]),
    transaction_date: z.iso.date("Use YYYY-MM-DD for dates."),
    direction: z.enum(["in", "out"]),
    quantity: z.coerce.number().positive("Quantity must be more than zero").max(MAX_TRANSACTION_QUANTITY, "Quantity is too large."),
    unit_cost: z.coerce.number().min(0).max(MAX_TRANSACTION_UNIT_COST, "Unit cost is too large.").optional().nullable(),
    remarks: z.string().trim().max(2_000, "Remarks must be 2,000 characters or fewer.").optional().nullable(),
  })
  .superRefine((value, context) => {
    if (inboundTypes.includes(value.transaction_type) && value.direction !== "in") {
      context.addIssue({ code: "custom", path: ["direction"], message: "This transaction type must increase stock" });
    }

    if (outboundTypes.includes(value.transaction_type) && value.direction !== "out") {
      context.addIssue({ code: "custom", path: ["direction"], message: "This transaction type must reduce stock" });
    }
  });

export type StockTransactionInput = z.infer<typeof stockTransactionSchema>;
