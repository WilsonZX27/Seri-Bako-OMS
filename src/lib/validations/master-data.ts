import { z } from "zod";

export const supplierItemSchema = z.object({
  supplier_id: z.string().uuid("Supplier is required"),
  item_id: z.string().uuid("Item is required"),
  supplier_item_code: z.string().trim().min(1, "Supplier item code is required"),
  supplier_item_name: z.string().trim().min(1, "Supplier item name is required"),
  purchase_uom: z.string().trim().min(1, "Purchase UOM is required"),
  conversion_to_base_uom: z.coerce.number().positive(),
  unit_cost: z.coerce.number().min(0),
  moq: z.coerce.number().min(0),
  lead_time_days: z.coerce.number().int().min(0),
  valid_from: z.string().trim().optional().nullable().or(z.literal("")),
  valid_to: z.string().trim().optional().nullable().or(z.literal("")),
  status: z.enum(["active", "inactive", "archived"]),
});

export const uomConversionSchema = z.object({
  from_uom: z.string().trim().min(1, "From UOM is required"),
  to_uom: z.string().trim().min(1, "To UOM is required"),
  factor: z.coerce.number().positive(),
  status: z.enum(["active", "inactive", "archived"]),
});
