import { z } from "zod";

const optionalUuid = z.string().uuid().optional().nullable().or(z.literal(""));

export const stockCountLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  theoretical_qty: z.coerce.number().min(0),
  physical_qty: z.coerce.number().min(0, "Physical quantity cannot be negative"),
  uom: z.string().trim().min(1, "UOM is required"),
  remarks: z.string().trim().optional().nullable(),
});

export const stockCountSchema = z.object({
  count_no: z.string().trim().min(1, "Count number is required"),
  count_date: z.string().trim().min(1, "Count date is required"),
  branch_id: z.string().uuid("Branch is required"),
  location_id: optionalUuid,
  status: z.enum(["draft", "submitted", "reviewed", "approved", "posted", "rejected", "cancelled"]),
  tolerance_percent: z.coerce.number().min(0).default(2),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(stockCountLineSchema).min(1, "Stock count must have at least one line"),
}).superRefine((value, context) => {
  value.lines.forEach((line, index) => {
    const variance = line.physical_qty - line.theoretical_qty;
    const percent = line.theoretical_qty === 0 ? (line.physical_qty === 0 ? 0 : 100) : Math.abs((variance / line.theoretical_qty) * 100);
    if (percent > value.tolerance_percent && !line.remarks?.trim()) {
      context.addIssue({ code: "custom", path: ["lines", index, "remarks"], message: "Remarks required for variance above tolerance" });
    }
  });
});
