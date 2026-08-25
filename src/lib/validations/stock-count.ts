import { z } from "zod";

const FRACTIONAL_UOMS = new Set(["kg", "g", "l", "ml", "ltr", "liter", "litre"]);

export function stockCountAllowsFraction(uom: string) {
  return FRACTIONAL_UOMS.has(uom.trim().toLowerCase());
}

export function stockCountHasAtMostFourDecimals(value: number) {
  const rounded = Math.round(value * 10_000) / 10_000;
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(value)) * 16;
  return Math.abs(value - rounded) <= tolerance;
}

export const stockCountLineSchema = z.object({
  item_id: z.string().uuid("Item is required"),
  // The server recalculates the theoretical quantity from the ledger. Keeping
  // this field bounded still prevents an oversized FormData payload before it
  // reaches the database aggregate.
  theoretical_qty: z.coerce.number().min(0).max(1_000_000),
  physical_qty: z.coerce.number().min(0, "Physical quantity cannot be negative").max(1_000_000, "Physical quantity is too large"),
  uom: z.string().trim().min(1, "UOM is required").max(32, "UOM is too long"),
  remarks: z.string().trim().max(1_000, "Line note is too long").optional().nullable(),
});

export const stockCountSchema = z.object({
  count_no: z.string().trim().max(96, "Count number is too long").optional().nullable().or(z.literal("")),
  count_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Count date must use YYYY-MM-DD"),
  branch_id: z.string().uuid("Branch is required"),
  status: z.literal("draft").optional(),
  tolerance_percent: z.literal(0).default(0),
  remarks: z.string().trim().max(2_000, "Count note is too long").optional().nullable(),
  lines: z.array(stockCountLineSchema).min(1, "Stock count must have at least one line").max(500, "A stock count cannot contain more than 500 lines"),
}).superRefine((value, context) => {
  const itemIds = new Set<string>();
  value.lines.forEach((line, index) => {
    if (itemIds.has(line.item_id)) {
      context.addIssue({ code: "custom", path: ["lines", index, "item_id"], message: "Each item can appear only once in a stock count" });
    }
    itemIds.add(line.item_id);
    if (!stockCountAllowsFraction(line.uom) && !Number.isInteger(line.physical_qty)) {
      context.addIssue({ code: "custom", path: ["lines", index, "physical_qty"], message: `${line.uom} quantities must be whole numbers` });
    }
    // Do not use Number.isInteger(value * 10_000) here. Valid decimal input can
    // acquire a tiny IEEE-754 tail after Zod coerces the FormData string.
    if (!stockCountHasAtMostFourDecimals(line.physical_qty)) {
      context.addIssue({ code: "custom", path: ["lines", index, "physical_qty"], message: "Physical quantity cannot exceed 4 decimal places" });
    }
  });
});
