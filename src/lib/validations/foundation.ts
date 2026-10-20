import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .max(2_000, "Text is too long")
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const optionalUpperText = z
  .string()
  .trim()
  .max(64, "Text is too long")
  .optional()
  .nullable()
  .transform((value) => (value ? value.toUpperCase() : null));

export const recordStatusSchema = z.enum(["active", "inactive", "archived"]);
export const staffStatusSchema = z.enum(["invited", "active", "disabled"]);

export const companySchema = z.object({
  company_code: z.string().trim().min(1, "Company code is required").max(64),
  company_name: z.string().trim().min(1, "Company name is required").max(160),
  registration_no: optionalText,
  tax_no: optionalText,
  phone: z.string().trim().max(48).optional().nullable().transform((value) => (value ? value : null)),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable().transform((value) => (value ? value : null)),
  address: optionalText,
  status: recordStatusSchema,
});

export const branchSchema = z.object({
  company_id: z.string().uuid("Company is required"),
  branch_code: z.string().trim().min(1, "Branch code is required").max(64),
  branch_name: z.string().trim().min(1, "Branch name is required").max(160),
  branch_type: z.enum(["central_kitchen", "outlet", "event_booth", "office", "other"]),
  phone: z.string().trim().max(48).optional().nullable().transform((value) => (value ? value : null)),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable().transform((value) => (value ? value : null)),
  address: optionalText,
  status: recordStatusSchema,
});

export const staffSchema = z.object({
  username: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, "Username must be 3–32 letters, numbers, dots, underscores or hyphens.").optional().nullable(),
  company_id: z.string().uuid("Company is required"),
  staff_code: optionalUpperText,
  full_name: z.string().trim().min(1, "Full name is required").max(160),
  email: z.email("Enter a valid email").trim().toLowerCase(),
  phone: z.string().trim().max(48).optional().nullable().transform((value) => (value ? value : null)),
  employment_type: z.enum(["full_time", "part_time"]),
  employment_end_date: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid last working date"), z.literal("")]).optional().nullable().transform((value) => (value ? value : null)),
  default_branch_id: z.string().uuid().optional().nullable().transform((value) => (value ? value : null)),
  status: staffStatusSchema,
});

export const roleSchema = z.object({
  company_id: z.string().uuid("Company is required"),
  role_code: z.string().trim().min(1, "Role code is required").max(64),
  role_name: z.string().trim().min(1, "Role name is required").max(160),
  description: optionalText,
  status: recordStatusSchema,
});

export const staffAccessSchema = z.object({
  role_id: z.string().uuid("Primary role is required"),
  default_branch_id: z.string().uuid("Default branch is required"),
  accessible_branch_ids: z.array(z.string().uuid("Branch is invalid")).min(1, "Select at least one accessible branch").max(100, "Too many accessible branches"),
});

export const documentSequenceSchema = z.object({
  company_id: z.string().uuid("Company is required"),
  document_type: z.string().trim().min(1, "Document type is required").max(64),
  prefix: z.string().trim().min(1, "Prefix is required").max(32),
  next_number: z.coerce.number().int().min(1, "Current number must be positive").max(9_999_999_999, "Current number is too large"),
  padding: z.coerce.number().int().min(1, "Padding must be positive").max(12, "Padding is too large"),
  reset_frequency: z.enum(["never", "yearly", "quarterly", "monthly", "daily"]),
  status: recordStatusSchema,
});
