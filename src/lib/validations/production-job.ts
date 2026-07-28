import { z } from "zod";

export const productionJobStatuses = ["draft", "submitted", "approved", "posted", "cancelled", "rejected"] as const;

export const productionJobSchema = z.object({
  production_date: z.iso.date("Production date must use YYYY-MM-DD"),
  branch_id: z.string().uuid("Branch is required"),
  recipe_id: z.string().uuid("Recipe is required"),
  planned_output_qty: z.coerce.number().positive("Planned output must be more than zero").max(1_000_000),
  output_uom: z.string().trim().min(1, "Output UOM is required").max(32),
  priority: z.enum(["low", "normal", "urgent", "critical"]).default("normal"),
  remarks: z.string().trim().max(2_000).optional().nullable(),
});

export type ProductionJobInput = z.infer<typeof productionJobSchema>;
