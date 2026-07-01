import { z } from "zod";

export const wastageReasons = ["expired", "damaged", "spoiled", "production_loss", "missing", "staff_meal", "sampling", "supplier_claim", "other"] as const;

const transferLine = z.object({
  item_id: z.string().uuid(),
  barcode: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  uom: z.string().trim().min(1),
  remarks: z.string().trim().optional().nullable(),
});

export const stockTransferSchema = z.object({
  transfer_no: z.string().trim().min(1),
  transfer_date: z.string().trim().min(1),
  from_branch_id: z.string().uuid().optional().nullable().or(z.literal("")),
  from_location_id: z.string().uuid("From location required"),
  to_branch_id: z.string().uuid().optional().nullable().or(z.literal("")),
  to_location_id: z.string().uuid("To location required"),
  status: z.enum(["draft", "submitted", "approved", "posted", "rejected", "cancelled"]),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(transferLine).min(1, "Transfer must have at least one line"),
}).refine((value) => value.from_location_id !== value.to_location_id, { path: ["to_location_id"], message: "Source and destination cannot be the same" });

const wastageLine = z.object({
  item_id: z.string().uuid(),
  barcode: z.string().trim().optional().nullable(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  uom: z.string().trim().min(1),
  reason: z.enum(wastageReasons),
  batch_no: z.string().trim().optional().nullable(),
  expiry_date: z.string().trim().optional().nullable().or(z.literal("")),
  remarks: z.string().trim().optional().nullable(),
});

export const stockWastageSchema = z.object({
  wastage_no: z.string().trim().min(1),
  wastage_date: z.string().trim().min(1),
  branch_id: z.string().uuid().optional().nullable().or(z.literal("")),
  location_id: z.string().uuid("Location required"),
  reason: z.enum(wastageReasons),
  status: z.enum(["draft", "submitted", "approved", "posted", "rejected", "cancelled"]),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(wastageLine).min(1, "Wastage must have at least one line"),
});
