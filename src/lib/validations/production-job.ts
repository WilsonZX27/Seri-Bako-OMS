import { z } from "zod";

export const productionJobStatuses = ["draft", "submitted", "approved", "posted", "cancelled", "rejected"] as const;

export const productionJobSchema = z.object({
  production_date: z.string().min(1, "Production date is required"),
  branch_id: z.string().min(1, "Branch is required"),
  recipe_id: z.string().min(1, "Recipe is required"),
  planned_output_qty: z.coerce.number().positive("Planned output must be more than zero"),
  output_uom: z.string().trim().min(1, "Output UOM is required"),
  priority: z.enum(["low", "normal", "urgent", "critical"]).default("normal"),
  remarks: z.string().trim().optional().nullable(),
});

export type ProductionJobInput = z.infer<typeof productionJobSchema>;
