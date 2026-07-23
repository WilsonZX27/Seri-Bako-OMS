import { z } from "zod";
export const wastageReasons = ["expired", "damaged", "spoiled", "production_loss", "missing", "staff_meal", "sampling", "supplier_claim", "other"] as const;

const transferLine = z.object({
  item_id: z.string().uuid(),
  quantity: z.coerce.number().positive("Quantity must be positive"),
  uom: z.string().trim().min(1),
  remarks: z.string().trim().optional().nullable(),
});

export const stockTransferSchema = z.object({
  transfer_no: z.string().trim().optional().nullable().or(z.literal("")),
  transfer_date: z.string().trim().min(1),
  from_branch_id: z.string().uuid("From branch required"),
  to_branch_id: z.string().uuid("To branch required"),
  status: z.literal("draft").optional(),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(transferLine).min(1, "Transfer must have at least one line"),
});

const wastageLine = z.object({
  item_id: z.string().uuid(),
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
  branch_id: z.string().uuid("Branch required"),
  reason: z.enum(wastageReasons),
  status: z.literal("draft").optional(),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(wastageLine).min(1, "Wastage must have at least one line"),
});
