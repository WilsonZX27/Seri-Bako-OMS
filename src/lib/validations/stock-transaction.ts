import { z } from "zod";
import type { StockTransactionType } from "@/types/database";

export const inboundTypes: StockTransactionType[] = ["opening_balance", "purchase", "production_output", "transfer_in", "extra", "customer_return"];
export const outboundTypes: StockTransactionType[] = ["production_usage", "transfer_out", "wastage", "damage", "missing", "return_supplier", "return_to_supplier"];
export const flexibleTypes: StockTransactionType[] = ["correction", "transfer", "stock_adjustment", "stock_count_adjustment"];

export const stockTransactionSchema = z
  .object({
    item_id: z.string().uuid("Select an item"),
    location_id: z.string().uuid("Select a location"),
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
    transaction_date: z.string().min(1),
    direction: z.enum(["in", "out"]),
    quantity: z.coerce.number().positive("Quantity must be more than zero"),
    unit_cost: z.coerce.number().min(0).optional().nullable(),
    remarks: z.string().trim().optional().nullable(),
    from_location_id: z.string().uuid().optional().nullable().or(z.literal("")),
    to_location_id: z.string().uuid().optional().nullable().or(z.literal("")),
  })
  .superRefine((value, context) => {
    if (inboundTypes.includes(value.transaction_type) && value.direction !== "in") {
      context.addIssue({ code: "custom", path: ["direction"], message: "This transaction type must increase stock" });
    }

    if (outboundTypes.includes(value.transaction_type) && value.direction !== "out") {
      context.addIssue({ code: "custom", path: ["direction"], message: "This transaction type must reduce stock" });
    }

    if (["transfer", "transfer_in", "transfer_out"].includes(value.transaction_type) && !value.from_location_id && !value.to_location_id) {
      context.addIssue({ code: "custom", path: ["from_location_id"], message: "Transfer needs at least one location side" });
    }
  });

export type StockTransactionInput = z.infer<typeof stockTransactionSchema>;
