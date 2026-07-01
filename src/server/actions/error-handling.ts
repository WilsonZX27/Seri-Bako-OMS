import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { hasPermission } from "@/server/auth/permissions";

export function rethrowRedirect(error: unknown) {
  if (isRedirectError(error)) throw error;
}

export function formatActionError(error: unknown, fallback = "Something went wrong. Please try again.") {
  console.error(error);
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (!message) return fallback;
  if (normalized.includes("service role key")) return "Supabase service role key is not configured.";
  if (normalized.includes("missing permission") || normalized.includes("permission denied") || normalized.includes("row-level security")) {
    return "You do not have permission to perform this action.";
  }
  if (normalized.includes("duplicate key")) return "A matching record already exists.";
  if (normalized.includes("bucket") || normalized.includes("storage")) {
    return "File storage is not configured correctly. Please contact an Admin.";
  }
  if (normalized.includes("violates not-null constraint")) return "A required field is missing.";
  if (message.length <= 160 && !/(supabase|postgres|constraint|sqlstate|violates)/i.test(message)) return message;
  return fallback;
}

export function safeRedirectWithMessage(path: string, key: "error" | "success", message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}${key}=${encodeURIComponent(message)}`);
}

export async function requirePermissionOrRedirect(permission: string, path: string) {
  const allowed = await hasPermission(permission);
  if (!allowed) {
    safeRedirectWithMessage(path, "error", "You do not have permission to perform this action.");
  }
}
