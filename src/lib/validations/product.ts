import { z } from "zod";

export const productSchema = z.object({
  product_code: z.string().trim().min(1, "Product code is required"),
  product_name: z.string().trim().min(1, "Product name is required"),
  daily_tracking: z.enum(["food_daily", "food_carryover", "beverage", "packaging"]).nullable().optional(),
  category: z.string().trim().min(1, "Category is required"),
  is_seasonal: z.enum(["true", "false"]).default("false").transform(value => value === "true"),
  available_from: z.union([z.string().date(), z.literal("")]).optional().transform(value => value || null),
  available_until: z.union([z.string().date(), z.literal("")]).optional().transform(value => value || null),
  display_order: z.coerce.number().int().min(1, "Display order must be at least 1"),
  selling_unit: z.string().trim().min(1, "Selling unit is required"),
  status: z.enum(["active", "inactive"]),
  product_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
}).refine(value => !value.available_from || !value.available_until || value.available_from <= value.available_until, { path: ["available_until"], message: "Available until must be on or after Available from" });

export type ProductInput = z.infer<typeof productSchema>;
