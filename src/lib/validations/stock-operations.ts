import { z } from "zod";
export const wastageReasons = ["expired", "damaged", "spoiled", "production_loss", "missing", "staff_meal", "sampling", "supplier_claim", "other"] as const;

const operationalDate = z.iso.date("Use YYYY-MM-DD for dates.");
const optionalOperationalDate = z.union([z.iso.date("Use YYYY-MM-DD for dates."), z.literal("")]).optional().nullable();
const operationalQuantity = z.coerce.number().positive("Quantity must be positive").max(1_000_000, "Quantity is too large.");
const operationalUom = z.string().trim().min(1, "UOM is required").max(32, "UOM is too long.");
const optionalOperationalRemark = z.string().trim().max(2_000, "Remarks must be 2,000 characters or fewer.").optional().nullable();

const transferLine = z.object({
  item_id: z.string().uuid(),
  quantity: operationalQuantity,
  uom: operationalUom,
  remarks: optionalOperationalRemark,
});

export const stockTransferSchema = z.object({
  transfer_no: z.string().trim().max(64, "Transfer number must be 64 characters or fewer.").optional().nullable().or(z.literal("")),
  transfer_date: operationalDate,
  from_branch_id: z.string().uuid("From branch required"),
  to_branch_id: z.string().uuid("To branch required"),
  status: z.literal("draft").optional(),
  remarks: optionalOperationalRemark,
  lines: z.array(transferLine).min(1, "Transfer must have at least one line").max(500, "A transfer is limited to 500 lines."),
});

const wastageLine = z.object({
  item_id: z.string().uuid(),
  quantity: operationalQuantity,
  uom: operationalUom,
  reason: z.enum(wastageReasons),
  batch_no: z.string().trim().max(160, "Batch number must be 160 characters or fewer.").optional().nullable(),
  expiry_date: optionalOperationalDate,
  remarks: optionalOperationalRemark,
});

export const stockWastageSchema = z.object({
  wastage_no: z.string().trim().min(1).max(64, "Wastage number must be 64 characters or fewer."),
  wastage_date: operationalDate,
  branch_id: z.string().uuid("Branch required"),
  reason: z.enum(wastageReasons),
  status: z.literal("draft").optional(),
  remarks: optionalOperationalRemark,
  lines: z.array(wastageLine).min(1, "Wastage must have at least one line").max(500, "A wastage record is limited to 500 lines."),
});
