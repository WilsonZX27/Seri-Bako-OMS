import { z } from "zod";

export const productSchema = z.object({
  product_code: z.string().trim().min(1, "Product code is required"),
  product_name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim().min(1, "Category is required"),
  display_order: z.coerce.number().int().min(1, "Display order must be at least 1"),
  selling_unit: z.string().trim().min(1, "Selling unit is required"),
  status: z.enum(["active", "inactive"]),
  product_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
});

export type ProductInput = z.infer<typeof productSchema>;
