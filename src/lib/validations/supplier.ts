import { z } from "zod";

export const supplierSchema = z.object({
  supplier_code: z.string().trim().optional().nullable(),
  name: z.string().trim().min(1, "Supplier name is required"),
  contact_person: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable(),
  address: z.string().trim().optional().nullable(),
  payment_terms_days: z.coerce.number().int().min(0),
  status: z.enum(["active", "inactive"]),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
