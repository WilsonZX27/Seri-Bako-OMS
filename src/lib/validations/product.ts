import { z } from "zod";
import { productBarcodeFieldsSchema } from "@/lib/validations/barcode";

export const productSchema = z.object({
  product_code: z.string().trim().min(1, "Product code is required"),
  product_name: z.string().trim().min(1, "Product name is required"),
  category: z.string().trim().min(1, "Category is required"),
  selling_unit: z.string().trim().min(1, "Selling unit is required"),
  status: z.enum(["active", "inactive"]),
  product_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
}).and(productBarcodeFieldsSchema);

export type ProductInput = z.infer<typeof productSchema>;
