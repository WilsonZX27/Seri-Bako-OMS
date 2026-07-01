import { z } from "zod";
import { barcodeFieldsSchema } from "@/lib/validations/barcode";

export const itemSchema = z.object({
  item_code: z.string().trim().min(1, "Item code is required"),
  autocount_code: z.string().trim().optional().nullable(),
  item_name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().min(1, "Category is required"),
  purchase_unit: z.string().trim().min(1, "Purchase unit is required"),
  base_unit: z.string().trim().min(1, "Base unit is required"),
  conversion_to_base_unit: z.coerce.number().positive(),
  supplier_id: z.string().uuid().optional().nullable().or(z.literal("")),
  cost: z.coerce.number().min(0),
  safety_stock: z.coerce.number().min(0),
  lead_time_days: z.coerce.number().int().min(0),
  moq: z.coerce.number().min(0),
  status: z.enum(["active", "inactive"]),
  item_image_url: z.string().trim().url().optional().nullable().or(z.literal("")),
}).and(barcodeFieldsSchema);

export type ItemInput = z.infer<typeof itemSchema>;
