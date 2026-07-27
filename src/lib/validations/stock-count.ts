import { z } from "zod";

const FRACTIONAL_UOMS = new Set(["kg", "g", "l", "ml", "ltr", "liter", "litre"]);

export function stockCountAllowsFraction(uom: string) {
  return FRACTIONAL_UOMS.has(uom.trim().toLowerCase());
}

export const stockCountLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  theoretical_qty: z.coerce.number().min(0),
  physical_qty: z.coerce.number().min(0, "Physical quantity cannot be negative"),
  uom: z.string().trim().min(1, "UOM is required"),
  remarks: z.string().trim().optional().nullable(),
});

export const stockCountSchema = z.object({
  count_no: z.string().trim().optional().nullable().or(z.literal("")),
  count_date: z.string().trim().min(1, "Count date is required"),
  branch_id: z.string().uuid("Branch is required"),
  status: z.literal("draft").optional(),
  tolerance_percent: z.coerce.number().min(0).default(2),
  remarks: z.string().trim().optional().nullable(),
  lines: z.array(stockCountLineSchema).min(1, "Stock count must have at least one line"),
}).superRefine((value, context) => {
  value.lines.forEach((line, index) => {
    if (!stockCountAllowsFraction(line.uom) && !Number.isInteger(line.physical_qty)) {
      context.addIssue({ code: "custom", path: ["lines", index, "physical_qty"], message: `${line.uom} quantities must be whole numbers` });
    }
  });
});
