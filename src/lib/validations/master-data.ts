import { z } from "zod";

export const supplierItemSchema = z.object({
  supplier_id: z.string().uuid("Supplier is required"),
  item_id: z.string().uuid("Item is required"),
  supplier_item_code: z.string().trim().min(1, "Supplier item code is required").max(64),
  supplier_item_name: z.string().trim().min(1, "Supplier item name is required").max(160),
  purchase_uom: z.string().trim().min(1, "Purchase UOM is required").max(32),
  conversion_to_base_uom: z.coerce.number().positive().max(1_000_000),
  unit_cost: z.coerce.number().min(0).max(1_000_000_000),
  moq: z.coerce.number().min(0).max(1_000_000),
  lead_time_days: z.coerce.number().int().min(0).max(3_650),
  valid_from: z.iso.date().optional().nullable().or(z.literal("")),
  valid_to: z.iso.date().optional().nullable().or(z.literal("")),
  status: z.enum(["active", "inactive", "archived"]),
});

export const uomConversionSchema = z.object({
  from_uom: z.string().trim().min(1, "From UOM is required").max(32),
  to_uom: z.string().trim().min(1, "To UOM is required").max(32),
  factor: z.coerce.number().positive().max(1_000_000),
  status: z.enum(["active", "inactive", "archived"]),
});
