import { APP_RELEASE_NOTE, APP_SPRINT, APP_VERSION } from "@/lib/app-version";
import { createZip } from "@/lib/backup/zip";
import { isSuperAdminRole } from "@/lib/roles";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile, getCompanyBranding } from "@/server/queries/common";

const BACKUP_TABLES = [
  "companies",
  "branches",
  "staffs",
  "roles",
  "permissions",
  "role_permissions",
  "staff_roles",
  "staff_branches",
  "items",
  "products",
  "suppliers",
  "supplier_items",
  "uom_conversions",
  "recipes",
  "recipe_lines",
  "recipe_ingredients",
  "purchase_requests",
  "purchase_request_lines",
  "purchase_orders",
  "purchase_order_lines",
  "goods_receivings",
  "goods_receiving_lines",
  "stock_counts",
  "stock_count_lines",
  "stock_transfers",
  "stock_transfer_lines",
  "stock_wastage",
  "stock_wastage_lines",
  "stock_transactions",
  "stock_transaction_lines",
  "production_jobs",
  "production_job_ingredient_lines",
  "production_job_output_lines",
  "documents",
  "document_comments",
  "document_approvals",
  "document_revisions",
  "attachments",
  "notifications",
  "activity_logs",
  "audit_logs",
  "document_sequences",
] as const;

const SECRET_COLUMN_PATTERN = /(password|token|secret|service_role|refresh_token|access_token|encrypted)/i;

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function rowsToCsv(rows: Record<string, unknown>[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((column) => !SECRET_COLUMN_PATTERN.test(column));
  if (!columns.length) return "";
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

export async function assertSuperAdminForBackup() {
  const profile = await getCurrentProfile();
  const role = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  if (!isSuperAdminRole(role)) {
    return { allowed: false, profile };
  }
  return { allowed: true, profile };
}

export async function generateSystemBackupZip(options: { includeLogs?: boolean; includeAttachmentMetadata?: boolean } = {}) {
  const access = await assertSuperAdminForBackup();
  if (!access.allowed) {
    throw new Error("You do not have permission to generate a system backup.");
  }

  const [admin, supabase, branding] = [createAdminClient(), await createClient(), await getCompanyBranding()];
  const db = looseSupabase(admin);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const includeLogs = options.includeLogs ?? true;
  const includeAttachmentMetadata = options.includeAttachmentMetadata ?? true;
  const generatedAt = new Date().toISOString();
  const profile = access.profile as { id?: string; full_name?: string | null; email?: string | null; company_id?: string | null } | null;
  const files: { name: string; content: string }[] = [];
  const tableResults: { table: string; records: number; included: boolean; warning?: string }[] = [];

  for (const table of BACKUP_TABLES) {
    if (!includeLogs && ["activity_logs", "audit_logs", "notifications"].includes(table)) continue;
    if (!includeAttachmentMetadata && table === "attachments") continue;

    const { data, error } = await db.from(table).select("*").limit(10000);
    if (error) {
      tableResults.push({ table, records: 0, included: false, warning: error.message });
      continue;
    }

    const rows = (data ?? []) as Record<string, unknown>[];
    files.push({ name: `csv/${table}.csv`, content: rowsToCsv(rows) });
    tableResults.push({ table, records: rows.length, included: true });
  }

  const manifest = {
    app_version: APP_VERSION,
    sprint: APP_SPRINT,
    release_note: APP_RELEASE_NOTE,
    generated_at: generatedAt,
    generated_by: {
      staff_name: profile?.full_name ?? "Super Admin",
      staff_email: profile?.email ?? user?.email ?? null,
      staff_id: profile?.id ?? null,
    },
    company_name: branding.company_name,
    tables: tableResults,
    warning: "Passwords, Supabase auth tokens, service role keys, and attachment file contents are not included. This backup may contain confidential company data. Store it securely.",
  };

  files.unshift({ name: "manifest.json", content: JSON.stringify(manifest, null, 2) });

  try {
    await db.from("audit_logs").insert({
      company_id: profile?.company_id ?? null,
      entity_type: "system_backup",
      entity_id: profile?.id ?? user?.id ?? crypto.randomUUID(),
      action: "backup.generated",
      new_values: { table_count: tableResults.filter((row) => row.included).length, generated_at: generatedAt },
      created_by: profile?.id ?? null,
    });
  } catch (error) {
    console.error("Backup audit log failed", error);
  }

  return {
    filename: `seri-bako-oms-backup-${generatedAt.slice(0, 10)}.zip`,
    buffer: createZip(files),
    manifest,
  };
}

export { BACKUP_TABLES };
