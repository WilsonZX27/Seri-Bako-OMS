import { z } from "zod";

export const recipeStatuses = ["draft", "pending_approval", "approved", "active", "rejected", "archived"] as const;

const MAX_RECIPE_QUANTITY = 1_000_000;
const MAX_RECIPE_COST = 1_000_000_000;
const recipeUom = z.string().trim().min(1, "Recipe UOM is required").max(32, "Recipe UOM is too long.");
const optionalRecipeRemark = z.string().trim().max(2_000, "Remarks must be 2,000 characters or fewer.").optional().nullable();

export const recipeLineSchema = z.object({
  ingredient_item_id: z.string().uuid("Ingredient item is required"),
  qty_required: z.coerce.number().positive("Quantity must be more than zero").max(MAX_RECIPE_QUANTITY, "Quantity is too large."),
  recipe_uom: recipeUom,
  base_uom: recipeUom,
  conversion_factor: z.coerce.number().positive("Conversion factor must be more than zero").max(MAX_RECIPE_QUANTITY, "Conversion factor is too large."),
  base_qty_required: z.coerce.number().positive("Base quantity must be more than zero").max(MAX_RECIPE_QUANTITY, "Base quantity is too large."),
  wastage_percent: z.coerce.number().min(0, "Wastage cannot be negative").max(100, "Wastage cannot exceed 100%"),
  cost_per_unit: z.coerce.number().min(0, "Cost cannot be negative").max(MAX_RECIPE_COST, "Cost is too large."),
  remarks: optionalRecipeRemark,
});

export const recipeSchema = z
  .object({
    recipe_no: z.string().trim().min(1, "Recipe number is required").max(64, "Recipe number must be 64 characters or fewer."),
    product_id: z.string().uuid("Product is required"),
    version: z.coerce.number().int().positive("Version must be more than zero").max(10_000, "Version is too large."),
    yield_qty: z.coerce.number().positive("Yield quantity must be more than zero").max(MAX_RECIPE_QUANTITY, "Yield quantity is too large."),
    yield_unit: recipeUom,
    status: z.enum(recipeStatuses).default("draft"),
    approval_status: z.enum(["not_required", "draft", "pending", "approved", "rejected", "cancelled"]).default("draft"),
    effective_date: z.iso.date("Use YYYY-MM-DD for dates."),
    remarks: optionalRecipeRemark,
    lines: z.array(recipeLineSchema).min(1, "Add at least one ingredient").max(500, "A recipe is limited to 500 ingredients."),
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
