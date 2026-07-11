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
  if (isPendingMigrationError(error)) return "Database migration is pending. Please contact admin.";
  if (normalized.includes("service role key")) return "Supabase service role key is not configured.";
  if (
    normalized.includes("rate limit")
    || normalized.includes("too many requests")
    || normalized.includes("email rate limit exceeded")
    || normalized.includes("429")
  ) {
    return "Email sending is temporarily limited. Use temporary password setup or try again later.";
  }
  if (
    normalized.includes("smtp")
    || normalized.includes("email provider")
    || normalized.includes("error sending")
    || normalized.includes("mailer")
  ) {
    return "We could not send the email right now. Please contact admin or try again later.";
  }
  if (normalized.includes("row-level security")) {
    return "This record is blocked by database row security. Please contact admin.";
  }
  if (normalized.includes("missing permission") || normalized.includes("permission denied")) {
    return "You do not have permission to perform this action.";
  }
  if (normalized.includes("duplicate key")) return "A matching record already exists.";
  if (normalized.includes("bucket") || normalized.includes("storage")) {
    return "File storage is not configured correctly. Please contact an administrator.";
  }
  if (normalized.includes("violates not-null constraint")) return "A required field is missing.";
  if (message.length <= 160 && !/(supabase|postgres|constraint|sqlstate|violates)/i.test(message)) return message;
  return fallback;
}

export function isPendingMigrationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("next_document_number")
    || normalized.includes("document_sequences")
    || normalized.includes("stock_balances_view")
    || normalized.includes("stock_ledger_view")
    || normalized.includes("low_stock_items")
    || normalized.includes("notification_recipients")
    || normalized.includes("could not find the function public.next_document_number")
    || normalized.includes("function public.next_document_number")
    || normalized.includes("relation \"public.document_sequences\" does not exist")
  );
}

export function formatPageError(error: unknown, fallback = "This page could not load right now. Please try again shortly.") {
  console.error(error);
  if (isPendingMigrationError(error)) {
    return "Database migration is pending. Please contact admin.";
  }
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
