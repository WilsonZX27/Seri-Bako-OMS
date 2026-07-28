import { z } from "zod";

export const supplierSchema = z.object({
  supplier_code: z.string().trim().max(64).optional().nullable(),
  name: z.string().trim().min(1, "Supplier name is required").max(160),
  contact_person: z.string().trim().max(160).optional().nullable(),
  phone: z.string().trim().max(48).optional().nullable(),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable(),
  address: z.string().trim().max(2_000).optional().nullable(),
  payment_terms_days: z.coerce.number().int().min(0).max(3_650),
  status: z.enum(["active", "inactive"]),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
