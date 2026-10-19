import { z } from "zod";

const normalizedEmail = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid work email address.")
  .max(254, "Enter a valid work email address.");

const password = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(1024, "Password is too long.");

export const signInSchema = z.object({
  email: z.union([normalizedEmail, z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9._-]{2,31}$/, "Enter your email or username.")]),
  password: z.string().min(1, "Enter your password.").max(1024, "Password is too long."),
});

export const passwordChangeSchema = z
  .object({
    password,
    confirmPassword: z.string().max(1024, "Password is too long."),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

const currentPassword = z.string().min(1, "Enter your current password.").max(1024, "Password is too long.");

export const ownPasswordChangeSchema = passwordChangeSchema.extend({
  currentPassword,
});

export const ownProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Display name is required.").max(120, "Display name is too long."),
  phone: z.string().trim().max(32, "Phone number is too long.").optional(),
});

export function readSignInInput(formData: FormData) {
  return signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
}

export function readEmailInput(value: FormDataEntryValue | null) {
  return normalizedEmail.safeParse(value);
}

export function readPasswordChangeInput(formData: FormData) {
  return passwordChangeSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirm_password"),
  });
}

export function readOwnPasswordChangeInput(formData: FormData) {
  return ownPasswordChangeSchema.safeParse({
    currentPassword: formData.get("current_password"),
    password: formData.get("new_password"),
    confirmPassword: formData.get("confirm_password"),
  });
}

export function readOwnProfileInput(formData: FormData) {
  return ownProfileSchema.safeParse({
    fullName: formData.get("full_name"),
    phone: formData.get("phone") || undefined,
  });
}
