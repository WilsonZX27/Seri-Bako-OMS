import { z } from "zod";

export const recipeStatuses = ["draft", "pending_approval", "approved", "active", "rejected", "archived"] as const;

export const recipeLineSchema = z.object({
  ingredient_item_id: z.string().min(1, "Ingredient item is required"),
  qty_required: z.coerce.number().positive("Quantity must be more than zero"),
  recipe_uom: z.string().trim().min(1, "Recipe UOM is required"),
  base_uom: z.string().trim().min(1, "Base UOM is required"),
  conversion_factor: z.coerce.number().positive("Conversion factor must be more than zero"),
  base_qty_required: z.coerce.number().positive("Base quantity must be more than zero"),
  wastage_percent: z.coerce.number().min(0, "Wastage cannot be negative"),
  cost_per_unit: z.coerce.number().min(0, "Cost cannot be negative"),
  remarks: z.string().trim().optional().nullable(),
});

export const recipeSchema = z
  .object({
    recipe_no: z.string().trim().min(1, "Recipe number is required"),
    product_id: z.string().min(1, "Product is required"),
    version: z.coerce.number().int().positive("Version must be more than zero"),
    yield_qty: z.coerce.number().positive("Yield quantity must be more than zero"),
    yield_unit: z.string().trim().min(1, "Yield unit is required"),
    status: z.enum(recipeStatuses).default("draft"),
    approval_status: z.enum(["not_required", "draft", "pending", "approved", "rejected", "cancelled"]).default("draft"),
    effective_date: z.string().min(1, "Effective date is required"),
    remarks: z.string().trim().optional().nullable(),
    lines: z.array(recipeLineSchema).min(1, "Add at least one ingredient"),
  })
  .superRefine((value, context) => {
    const seen = new Set<string>();
    value.lines.forEach((line, index) => {
      if (seen.has(line.ingredient_item_id)) {
        context.addIssue({
          code: "custom",
          path: ["lines", index, "ingredient_item_id"],
          message: "Duplicate ingredient is not allowed in the same recipe",
        });
      }
      seen.add(line.ingredient_item_id);
    });
  });

export type RecipeInput = z.infer<typeof recipeSchema>;
