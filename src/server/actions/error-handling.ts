import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

export type ActionErrorKind =
  | "permission_denied"
  | "validation_failed"
  | "duplicate_record"
  | "record_not_found"
  | "conflict"
  | "database_unavailable"
  | "operation_failed"
  | "unknown_error";

export function rethrowRedirect(error: unknown) {
  if (isRedirectError(error)) throw error;
}

export function classifyActionError(error: unknown): ActionErrorKind {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (error instanceof Error && error.name === "ZodError") return "validation_failed";
  if (isTechnicalDatabaseError(error)) return "database_unavailable";
  if (normalized.includes("missing permission") || normalized.includes("permission denied") || normalized.includes("row-level security")) return "permission_denied";
  if (normalized.includes("duplicate key") || normalized.includes("already exists") || normalized.includes("unique constraint")) return "duplicate_record";
  if (normalized.includes("not found") || normalized.includes("no rows") || normalized.includes("does not exist")) return "record_not_found";
  if (
    normalized.includes("already posted")
    || normalized.includes("already converted")
    || normalized.includes("already completed")
    || normalized.includes("insufficient stock")
    || normalized.includes("exceed")
    || normalized.includes("current state")
  ) return "conflict";
  if (normalized.includes("violates not-null") || normalized.includes("check constraint") || normalized.includes("invalid") || normalized.includes("required")) return "validation_failed";
  if (isPendingMigrationError(error) || normalized.includes("schema cache") || normalized.includes("connection") || normalized.includes("timeout")) return "database_unavailable";
  if (!message) return "unknown_error";
  return "operation_failed";
}

export function formatActionError(error: unknown, fallback = "Something went wrong. Please try again.") {
  logServerError(error, { source: "action.error" });
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  const kind = classifyActionError(error);

  if (!message) return fallback;
  if (normalized.includes("po_number_required") || normalized.includes("autoCount po number is required".toLowerCase())) {
    return "AutoCount PO Number is required.";
  }
  if (normalized.includes("po_number_already_used") || normalized.includes("this autocount po number is already used")) {
    return "This AutoCount PO Number is already used. Enter a different number.";
  }
  if (normalized.includes("pr_not_ready")) {
    return "This PR is no longer ready to convert. Refresh the page and check its current status.";
  }
  if (normalized.includes("pr_has_no_lines")) {
    return "This PR has no item lines. Add at least one item before converting it.";
  }
  if (normalized.includes("pr_has_invalid_lines")) {
    return "One or more PR item lines are no longer active. Return to the PR and replace the affected item.";
  }
  if (normalized.includes("pr_supplier_required")) {
    return "Every PR item line needs a supplier before it can become a Purchase Order.";
  }
  if (normalized.includes("pr_has_multiple_suppliers")) {
    return "This PR contains multiple suppliers. Split the request or keep one supplier before converting it.";
  }
  if (normalized.includes("supplier_not_active")) {
    return "The selected supplier is inactive or unavailable in this company.";
  }
  if (normalized.includes("pr_branch_required")) {
    return "Request branch is required before converting this PR.";
  }
  if (normalized.includes("pr_branch_invalid")) {
    return "The request branch is no longer available in this company.";
  }
  if (normalized.includes("qty_sent_missing")) {
    const safeMessage = message.replace(/^qty_sent_missing:\s*/i, "").trim();
    if (safeMessage.length <= 220 && !/(supabase|postgres|constraint|sqlstate|violates)/i.test(safeMessage)) return safeMessage;
    return "Qty Sent is missing. A Kitchen or authorised company-wide user must confirm Qty Sent before the outlet can complete this record.";
  }
  if (
    normalized.includes("idempotency_migration_pending")
    || (normalized.includes("idempotency_key") && (normalized.includes("purchase_order") || normalized.includes("purchase order")))
  ) {
    return "Purchase Order conversion is not available because the database migration is pending. Please contact the Super Admin / Owner.";
  }
  if (normalized.includes("conversion_permission_denied") || normalized.includes("only the purchasing role")) {
    return "You do not have permission to convert this PR to a Purchase Order.";
  }
  if (normalized.includes("outlet_daily_active_branch_date_idx")) {
    return "This outlet already has a record for that date. Open it from the Outlet Daily Records list instead.";
  }
  if (normalized.includes("wastage") && normalized.includes("exceed")) {
    // The save RPC may include a safe product label/code so the form can take
    // the operator directly to the offending line. Preserve that context when
    // it is short and contains no database/provider internals; otherwise keep
    // the generic, non-leaky message.
    if (message.length <= 220 && !/(supabase|postgres|constraint|sqlstate|violates)/i.test(message)) return message;
    return "Wastage cannot exceed Received without a line remark. Review the affected product line and add a remark.";
  }
  const validationMessage = formatValidationError(error);
  if (validationMessage) return validationMessage;
  if (isPendingMigrationError(error)) return "Database migration is pending. Please contact the Super Admin / Owner.";
  if (isTechnicalDatabaseError(error)) {
    return "This action is temporarily unavailable because the system database is not ready. Please retry or contact the Super Admin / Owner.";
  }
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
    return "We could not send the email right now. Please contact the Super Admin / Owner or try again later.";
  }
  if (kind === "permission_denied") return "You do not have permission to complete this action.";
  if (kind === "duplicate_record") return "A record with this code already exists.";
  if (kind === "record_not_found") return "This record could not be found.";
  if (kind === "conflict") return "This action cannot be completed in the current state.";
  if (kind === "validation_failed") return "Review the required fields and try again.";
  if (normalized.includes("bucket") || normalized.includes("storage")) {
    return "File storage is not configured correctly. Please contact the Super Admin / Owner.";
  }
  if (message.length <= 160 && !/(supabase|postgres|constraint|sqlstate|violates)/i.test(message)) return message;
  return fallback;
}

/**
 * Zod already knows which field is invalid. Preserve that safe, operator-facing
 * context instead of collapsing every form mistake into the same generic toast.
 * The message is bounded and newline-free so it remains safe for redirect URLs.
 */
function formatValidationError(error: unknown) {
  if (!(error instanceof Error) || error.name !== "ZodError") return null;
  const issues = (error as Error & { issues?: unknown }).issues;
  if (!Array.isArray(issues)) return null;
  const issue = issues.find((candidate): candidate is { message?: unknown; path?: unknown } => Boolean(candidate && typeof candidate === "object"));
  if (!issue || typeof issue.message !== "string") return null;
  const message = issue.message.replace(/[\r\n]+/g, " ").trim();
  if (!message || message.length > 160) return null;
  const path = Array.isArray(issue.path) ? issue.path.filter((part): part is string | number => typeof part === "string" || typeof part === "number") : [];
  const fieldKey = path.length ? String(path[path.length - 1]) : "";
  const fieldLabels: Record<string, string> = {
    branch_id: "Request branch",
    count_date: "Count date",
    item_id: "Item",
    supplier_id: "Supplier",
    lines: "Requested items",
    qty: "Quantity",
    physical_qty: "Counted quantity",
    theoretical_qty: "Expected quantity",
    received: "Received quantity",
    wastage: "Wastage quantity",
    uom: "UOM",
    needed_by_date: "Needed by date",
    remarks: "Remarks",
    reason: "Reason",
    tolerance: "Tolerance",
    tolerance_percent: "Tolerance",
    count_no: "Count number",
  };
  const field = fieldLabels[fieldKey];
  return field ? `${field}: ${message}` : message;
}

/**
 * Provider/database diagnostics are useful in server logs but never actionable
 * for an operator. Keep them out of redirect query strings and inline alerts.
 */
export function isTechnicalDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  return (
    normalized.includes("column reference")
    || normalized.includes("operator does not exist")
    || normalized.includes("syntax error at or near")
    || normalized.includes("could not identify an equality operator")
    || /(?:column|table|schema|relation)\s+(?:\"[^\"]+\"|[^\s]+)\s+does not exist/.test(normalized)
    || /function\s+[^\s]+\s+does not exist/.test(normalized)
  );
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
  logServerError(error, { source: "page.error" });
  if (isPendingMigrationError(error)) {
    return "Database migration is pending. Please contact the Super Admin / Owner.";
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

export async function requireAnyPermissionOrRedirect(permissions: string[], path: string) {
  const allowed = (await Promise.all(permissions.map((permission) => hasPermission(permission)))).some(Boolean);
  if (!allowed) {
    safeRedirectWithMessage(path, "error", "You do not have permission to perform this action.");
  }
}
