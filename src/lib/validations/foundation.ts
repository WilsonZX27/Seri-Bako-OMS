import { z } from "zod";

const optionalText = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const recordStatusSchema = z.enum(["active", "inactive", "archived"]);

export const companySchema = z.object({
  company_code: z.string().trim().min(1, "Company code is required"),
  company_name: z.string().trim().min(1, "Company name is required"),
  registration_no: optionalText,
  tax_no: optionalText,
  phone: optionalText,
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable().transform((value) => (value ? value : null)),
  address: optionalText,
  status: recordStatusSchema,
});

export const branchSchema = z.object({
  company_id: z.string().trim().min(1, "Company is required"),
  branch_code: z.string().trim().min(1, "Branch code is required"),
  branch_name: z.string().trim().min(1, "Branch name is required"),
  branch_type: z.enum(["central_kitchen", "outlet", "event_booth", "office", "other"]),
  phone: optionalText,
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable().transform((value) => (value ? value : null)),
  address: optionalText,
  status: recordStatusSchema,
});

export const locationSchema = z.object({
  company_id: z.string().trim().min(1, "Company is required"),
  branch_id: z.string().trim().min(1, "Branch is required"),
  location_code: z.string().trim().min(1, "Location code is required"),
  location_name: z.string().trim().min(1, "Location name is required"),
  location_type: z.enum(["dry_store", "chiller", "freezer", "packaging_area", "production_floor", "dispatch_area", "receiving_area", "finished_goods_store", "other"]),
  status: recordStatusSchema,
});

export const staffSchema = z.object({
  company_id: z.string().trim().min(1, "Company is required"),
  staff_code: optionalText,
  full_name: z.string().trim().min(1, "Full name is required"),
  email: z.union([z.email("Enter a valid email"), z.literal("")]).optional().nullable().transform((value) => (value ? value : null)),
  phone: optionalText,
  default_branch_id: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  status: recordStatusSchema,
});

export const roleSchema = z.object({
  company_id: z.string().trim().min(1, "Company is required"),
  role_code: z.string().trim().min(1, "Role code is required"),
  role_name: z.string().trim().min(1, "Role name is required"),
  description: optionalText,
  status: recordStatusSchema,
});

export const staffAccessSchema = z.object({
  role_id: z.string().trim().min(1, "Primary role is required"),
  role_branch_id: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  effective_from: z.string().trim().min(1, "Effective from is required"),
  effective_to: z.string().trim().optional().nullable().transform((value) => (value ? value : null)),
  branch_id: z.string().trim().min(1, "Default branch access is required"),
  access_level: z.enum(["full", "manage", "read_only"]),
  location_ids: z.array(z.string()).default([]),
});

export const documentSequenceSchema = z.object({
  company_id: z.string().trim().min(1, "Company is required"),
  document_type: z.string().trim().min(1, "Document type is required"),
  prefix: z.string().trim().min(1, "Prefix is required"),
  next_number: z.coerce.number().int().min(1, "Current number must be positive"),
  padding: z.coerce.number().int().min(1, "Padding must be positive").max(12, "Padding is too large"),
  reset_frequency: z.enum(["never", "yearly", "monthly", "daily"]),
  status: recordStatusSchema,
});
