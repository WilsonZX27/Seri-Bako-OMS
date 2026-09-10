import { APP_RELEASE_NOTE, APP_SPRINT, APP_VERSION } from "@/lib/app-version";
import { createZip } from "@/lib/backup/zip";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { logServerError } from "@/server/observability/logger";
import { getCompanyBranding } from "@/server/queries/common";

type BackupClassification =
  | "company_id filtered"
  | "parent-company filtered"
  | "branch/company relation filtered"
  | "intentionally global reference data"
  | "excluded";

type BackupDataset = {
  table: string;
  classification: BackupClassification;
  column?: string;
  parent?: string;
  reason?: string;
  optional?: "logs" | "attachments";
  cursorColumn?: string;
};

export const BACKUP_DATASETS: readonly BackupDataset[] = [
  { table: "companies", classification: "company_id filtered", column: "id" },
  { table: "branches", classification: "company_id filtered", column: "company_id" },
  { table: "locations", classification: "excluded", reason: "Retired legacy location table removed by migration 099 after inventory ownership moved to branches." },
  { table: "branch_supply_routes", classification: "company_id filtered", column: "company_id" },
  { table: "staffs", classification: "company_id filtered", column: "company_id" },
  { table: "profiles", classification: "excluded", reason: "Auth-profile identity metadata is not tenant business content; staff records are the authoritative company-scoped identity export." },
  { table: "roles", classification: "company_id filtered", column: "company_id" },
  { table: "permissions", classification: "intentionally global reference data", reason: "Immutable capability-code reference data; no tenant business content." },
  { table: "role_permissions", classification: "parent-company filtered", column: "role_id", parent: "roles" },
  { table: "staff_roles", classification: "parent-company filtered", column: "staff_id", parent: "staffs" },
  { table: "staff_branches", classification: "parent-company filtered", column: "staff_id", parent: "staffs" },
  { table: "staff_locations", classification: "excluded", reason: "Retired legacy staff-location mapping removed by migration 100; staff branch access is authoritative." },
  { table: "staff_permission_overrides", classification: "parent-company filtered", column: "staff_id", parent: "staffs" },
  { table: "compliance_types", classification: "company_id filtered", column: "company_id" },
  { table: "compliance_records", classification: "company_id filtered", column: "company_id" },
  { table: "compliance_record_history", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "shift_templates", classification: "company_id filtered", column: "company_id" },
  { table: "schedule_weeks", classification: "company_id filtered", column: "company_id" },
  { table: "shift_assignment_revisions", classification: "company_id filtered", column: "company_id" },
  { table: "schedule_approval_events", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "schedule_import_batches", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "shift_change_requests", classification: "company_id filtered", column: "company_id" },
  { table: "ngteco_person_mappings", classification: "company_id filtered", column: "company_id" },
  { table: "ngteco_device_mappings", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_import_batches", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_raw_punch_events", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_import_batch_events", classification: "parent-company filtered", column: "batch_id", parent: "attendance_import_batches" },
  { table: "attendance_reconciliation_rows", classification: "company_id filtered", column: "company_id" },
  { table: "daily_attendance_results", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_ot_claims", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_ro_reservations", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_pay_rule_versions", classification: "company_id filtered", column: "company_id" },
  { table: "public_holidays", classification: "company_id filtered", column: "company_id" },
  { table: "public_holiday_branches", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_exceptions", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_adjustments", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "daily_attendance_reports", classification: "company_id filtered", column: "company_id" },
  { table: "comp_time_transactions", classification: "company_id filtered", column: "company_id" },
  { table: "comp_time_allocations", classification: "company_id filtered", column: "company_id" },
  { table: "staff_sensitive_employment", classification: "company_id filtered", column: "company_id" },
  { table: "attendance_period_locks", classification: "company_id filtered", column: "company_id" },
  { table: "items", classification: "company_id filtered", column: "company_id" },
  { table: "products", classification: "company_id filtered", column: "company_id" },
  { table: "suppliers", classification: "company_id filtered", column: "company_id" },
  { table: "supplier_items", classification: "company_id filtered", column: "company_id" },
  { table: "supplier_external_references", classification: "company_id filtered", column: "company_id" },
  { table: "supplier_merge_audit", classification: "company_id filtered", column: "company_id", cursorColumn: "merged_at" },
  { table: "supplier_merge_line_audit", classification: "company_id filtered", column: "company_id" },
  { table: "supplier_item_merge_audit", classification: "company_id filtered", column: "company_id", cursorColumn: "merged_at" },
  { table: "supplier_identity_reconciliation_audit", classification: "company_id filtered", column: "company_id" },
  { table: "supplier_uom_conversion_audit", classification: "company_id filtered", column: "company_id", cursorColumn: "changed_at" },
  { table: "uom_conversions", classification: "company_id filtered", column: "company_id" },
  { table: "product_packaging", classification: "parent-company filtered", column: "product_id", parent: "products" },
  { table: "branch_supplier_items", classification: "branch/company relation filtered", column: "branch_id", parent: "branches" },
  { table: "recipes", classification: "company_id filtered", column: "company_id" },
  { table: "recipe_lines", classification: "parent-company filtered", column: "recipe_id", parent: "recipes" },
  { table: "recipe_cost_snapshots", classification: "parent-company filtered", column: "recipe_id", parent: "recipes" },
  { table: "purchase_requests", classification: "company_id filtered", column: "company_id" },
  { table: "purchase_request_lines", classification: "parent-company filtered", column: "purchase_request_id", parent: "purchase_requests" },
  { table: "purchase_request_stock_holds", classification: "parent-company filtered", column: "purchase_request_id", parent: "purchase_requests" },
  { table: "purchase_request_unresolved_lines", classification: "parent-company filtered", column: "purchase_request_id", parent: "purchase_requests" },
  { table: "purchase_orders", classification: "company_id filtered", column: "company_id" },
  { table: "purchase_order_lines", classification: "parent-company filtered", column: "purchase_order_id", parent: "purchase_orders" },
  { table: "goods_receivings", classification: "company_id filtered", column: "company_id" },
  { table: "goods_receiving_lines", classification: "parent-company filtered", column: "goods_receiving_id", parent: "goods_receivings" },
  { table: "purchase_returns", classification: "company_id filtered", column: "company_id" },
  { table: "purchase_return_lines", classification: "parent-company filtered", column: "purchase_return_id", parent: "purchase_returns" },
  { table: "supplier_invoices", classification: "company_id filtered", column: "company_id" },
  { table: "supplier_invoice_lines", classification: "parent-company filtered", column: "supplier_invoice_id", parent: "supplier_invoices" },
  { table: "supplier_invoice_payments", classification: "company_id filtered", column: "company_id" },
  { table: "stock_counts", classification: "company_id filtered", column: "company_id" },
  { table: "stock_count_lines", classification: "parent-company filtered", column: "stock_count_id", parent: "stock_counts" },
  { table: "branch_stock_count_items", classification: "company_id filtered", column: "company_id" },
  { table: "stock_count_item_retirements", classification: "company_id filtered", column: "company_id" },
  { table: "stock_count_reconciliations", classification: "company_id filtered", column: "company_id", cursorColumn: "reconciled_at" },
  { table: "stock_count_voids", classification: "company_id filtered", column: "company_id", cursorColumn: "voided_at" },
  { table: "item_correction_suggestions", classification: "company_id filtered", column: "company_id" },
  { table: "stock_transfers", classification: "company_id filtered", column: "company_id" },
  { table: "stock_transfer_lines", classification: "parent-company filtered", column: "stock_transfer_id", parent: "stock_transfers" },
  { table: "stock_transfer_reservations", classification: "company_id filtered", column: "company_id", cursorColumn: "reserved_at" },
  { table: "stock_transfer_receipts", classification: "company_id filtered", column: "company_id" },
  { table: "stock_transfer_receipt_lines", classification: "parent-company filtered", column: "receipt_id", parent: "stock_transfer_receipts" },
  { table: "stock_wastage", classification: "company_id filtered", column: "company_id" },
  { table: "stock_wastage_lines", classification: "parent-company filtered", column: "stock_wastage_id", parent: "stock_wastage" },
  { table: "stock_transactions", classification: "branch/company relation filtered", column: "branch_id", parent: "branches" },
  { table: "stock_transaction_lines", classification: "parent-company filtered", column: "stock_transaction_id", parent: "stock_transactions" },
  { table: "production_jobs", classification: "company_id filtered", column: "company_id" },
  { table: "production_job_ingredient_lines", classification: "parent-company filtered", column: "production_job_id", parent: "production_jobs" },
  { table: "production_job_output_lines", classification: "parent-company filtered", column: "production_job_id", parent: "production_jobs" },
  { table: "outlet_daily_records", classification: "company_id filtered", column: "company_id" },
  { table: "outlet_daily_record_lines", classification: "parent-company filtered", column: "record_id", parent: "outlet_daily_records" },
  { table: "outlet_daily_sales_breakdowns", classification: "parent-company filtered", column: "record_id", parent: "outlet_daily_records" },
  { table: "outlet_compliance_requirements", classification: "company_id filtered", column: "company_id" },
  { table: "documents", classification: "company_id filtered", column: "company_id" },
  { table: "document_comments", classification: "parent-company filtered", column: "document_id", parent: "documents" },
  { table: "document_revisions", classification: "parent-company filtered", column: "document_id", parent: "documents" },
  { table: "document_line_revisions", classification: "company_id filtered", column: "company_id" },
  { table: "approvals", classification: "company_id filtered", column: "company_id" },
  { table: "approval_steps", classification: "parent-company filtered", column: "approval_id", parent: "approvals" },
  { table: "attachments", classification: "company_id filtered", column: "company_id", optional: "attachments" },
  { table: "notifications", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "notification_recipients", classification: "parent-company filtered", column: "notification_id", parent: "notifications", optional: "logs" },
  { table: "activity_logs", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "audit_logs", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "operation_requests", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "system_incidents", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "system_incident_events", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "draft_revisions", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "autocount_import_jobs", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "autocount_import_files", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "autocount_import_rows", classification: "company_id filtered", column: "company_id", optional: "logs" },
  { table: "document_sequences", classification: "company_id filtered", column: "company_id" },
  { table: "document_sequence_periods", classification: "company_id filtered", column: "company_id" },
  { table: "user_preferences", classification: "company_id filtered", column: "company_id" },
  { table: "permanent_deletion_tombstones", classification: "company_id filtered", column: "company_id", cursorColumn: "deleted_at" },
  { table: "stock_balances_summary", classification: "excluded", reason: "Rebuildable inventory read model; the posted ledger is the source of truth and the summary is refreshed after restore." },
  { table: "inventory_daily_summary", classification: "excluded", reason: "Rebuildable daily inventory read model; restore the posted ledger and regenerate this summary." },
  { table: "barcode_mappings", classification: "excluded", reason: "Retired legacy table removed by migration 091; retained here only so the migration inventory remains explicitly classified." },
  { table: "auth.users", classification: "excluded", reason: "Authentication identities and credentials are not business-backup content." },
  { table: "storage.objects", classification: "excluded", reason: "File bodies and storage internals are excluded; scoped attachment metadata is included separately." },
] as const;

const SECRET_COLUMN_PATTERN = /(password|token|secret|service_role|refresh_token|access_token|encrypted)/i;
const PAGE_SIZE = 1000;
const ID_CHUNK_SIZE = 200;
// The ZIP implementation materializes members in memory. Refuse an archive that
// exceeds these reviewed limits instead of returning a partial or unstable backup.
export const MAX_ROWS_PER_DATASET = 10_000;
export const MAX_ROWS_PER_ARCHIVE = 100_000;
function serverLimit(name: string, fallback: number) {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
// Deliberately server-only: these are never NEXT_PUBLIC values. Since this ZIP
// writer materializes members, the aggregate cap also bounds process memory.
export const MAX_ZIP_MEMBER_BYTES = serverLimit("BACKUP_MAX_ZIP_MEMBER_BYTES", 8 * 1024 * 1024);
export const MAX_ZIP_UNCOMPRESSED_BYTES = serverLimit("BACKUP_MAX_ZIP_UNCOMPRESSED_BYTES", 64 * 1024 * 1024);
export const MAX_ZIP_OUTPUT_BYTES = serverLimit("BACKUP_MAX_ZIP_OUTPUT_BYTES", 72 * 1024 * 1024);

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  // Spreadsheet applications evaluate cells that begin with these characters
  // as formulas. Imported names, remarks, and references are user-controlled,
  // so neutralise the formula marker before building any CSV export or backup.
  const safeText = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\r\n]/.test(safeText) ? `"${safeText.replaceAll('"', '""')}"` : safeText;
}

export function rowsToCsv(rows: Record<string, unknown>[]) {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row)))).filter((column) => !SECRET_COLUMN_PATTERN.test(column));
  if (!columns.length) return "";
  return [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\n");
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

type BackupCursor = { value: string; id: string };

function cursorFilter(cursor: BackupCursor, cursorColumn: string) {
  // PostgREST OR syntax is deliberately limited to generated ISO timestamps and
  // UUIDs, never request input. `(created_at,id)` is a deterministic unique key.
  return `${cursorColumn}.gt.${cursor.value},and(${cursorColumn}.eq.${cursor.value},id.gt.${cursor.id})`;
}

async function fetchKeysetPages(makeQuery: (cursor: BackupCursor | null) => PromiseLike<{ data: unknown; error: { message: string } | null }>, cursorColumn = "created_at") {
  const rows: Record<string, unknown>[] = [];
  let cursor: BackupCursor | null = null;
  for (;;) {
    const { data, error } = await makeQuery(cursor);
    if (error) throw new Error(error.message);
    const page = (data ?? []) as Record<string, unknown>[];
    rows.push(...page);
    if (rows.length > MAX_ROWS_PER_DATASET) {
      throw new Error(`Backup dataset exceeds the ${MAX_ROWS_PER_DATASET.toLocaleString()} row safety limit.`);
    }
    if (page.length < PAGE_SIZE) break;
    const last = page.at(-1);
    if (!last || typeof last.id !== "string" || typeof last[cursorColumn] !== "string") throw new Error(`Backup dataset does not expose the required immutable cursor columns (${cursorColumn}, id).`);
    cursor = { id: last.id, value: last[cursorColumn] as string };
  }
  return rows;
}

async function fetchDatasetRows(
  db: ReturnType<typeof looseSupabase>,
  dataset: BackupDataset,
  companyId: string,
  idsByTable: Map<string, string[]>,
  boundary: string,
) {
  if (dataset.classification === "excluded") return [];
  const cursorColumn = dataset.cursorColumn ?? "created_at";
  const paged = (query: ReturnType<ReturnType<typeof looseSupabase>["from"]>) => fetchKeysetPages((cursor) => {
    let scoped = query.lte(cursorColumn, boundary).order(cursorColumn, { ascending: true }).order("id", { ascending: true }).limit(PAGE_SIZE);
    if (cursor) scoped = scoped.or(cursorFilter(cursor, cursorColumn));
    return scoped;
  }, cursorColumn);
  if (dataset.classification === "intentionally global reference data") {
    return paged(db.from(dataset.table).select("*"));
  }
  if (!dataset.column) throw new Error(`Backup scope is missing for ${dataset.table}.`);

  if (dataset.classification === "company_id filtered") {
    return paged(db.from(dataset.table).select("*").eq(dataset.column!, companyId));
  }

  const parentIds = idsByTable.get(dataset.parent ?? "") ?? [];
  if (!parentIds.length) return [];
  const rows: Record<string, unknown>[] = [];
  for (const idChunk of chunks(parentIds, ID_CHUNK_SIZE)) {
    rows.push(...await paged(db.from(dataset.table).select("*").in(dataset.column!, idChunk)));
    if (rows.length > MAX_ROWS_PER_DATASET) throw new Error(`Backup dataset exceeds the ${MAX_ROWS_PER_DATASET.toLocaleString()} row safety limit.`);
  }
  return rows;
}

export async function assertSuperAdminForBackup() {
  try {
    const actor = await requireActiveTenantActor({ owner: true });
    return { allowed: true as const, actor };
  } catch {
    return { allowed: false as const, actor: null };
  }
}

export async function generateSystemBackupZip(options: { includeLogs?: boolean; includeAttachmentMetadata?: boolean } = {}) {
  const access = await assertSuperAdminForBackup();
  if (!access.allowed || !access.actor) throw new Error("You do not have permission to generate a company backup.");

  const [admin, supabase, branding] = [createAdminClient(), await createClient(), await getCompanyBranding()];
  const db = looseSupabase(admin);
  const { data: { user } } = await supabase.auth.getUser();
  const includeLogs = options.includeLogs ?? true;
  const includeAttachmentMetadata = options.includeAttachmentMetadata ?? true;
  // `created_at` is an insertion timestamp in the schema and is never accepted
  // from this endpoint. A single boundary excludes later inserts; keyset cursor
  // pages prevent offset shifts, skips, and duplicates for retained source rows.
  const generatedAt = new Date().toISOString();
  const correlationId = crypto.randomUUID();
  const files: { name: string; content: string }[] = [];
  const idsByTable = new Map<string, string[]>();
  const tableResults: { table: string; classification: BackupClassification; records: number; included: boolean; warning?: string; reason?: string }[] = [];
  let archiveRows = 0;

  for (const dataset of BACKUP_DATASETS) {
    if (dataset.classification === "excluded") {
      tableResults.push({ table: dataset.table, classification: dataset.classification, records: 0, included: false, reason: dataset.reason });
      continue;
    }
    if (dataset.optional === "logs" && !includeLogs) {
      tableResults.push({ table: dataset.table, classification: dataset.classification, records: 0, included: false, reason: "Excluded by Owner backup option." });
      continue;
    }
    if (dataset.optional === "attachments" && !includeAttachmentMetadata) {
      tableResults.push({ table: dataset.table, classification: dataset.classification, records: 0, included: false, reason: "Excluded by Owner backup option." });
      continue;
    }

    try {
      const rows = await fetchDatasetRows(db, dataset, access.actor.companyId, idsByTable, generatedAt);
      archiveRows += rows.length;
      if (archiveRows > MAX_ROWS_PER_ARCHIVE) throw new Error(`Backup archive exceeds the ${MAX_ROWS_PER_ARCHIVE.toLocaleString()} row safety limit.`);
      idsByTable.set(dataset.table, rows.flatMap((row) => typeof row.id === "string" ? [row.id] : []));
      files.push({ name: `csv/${dataset.table}.csv`, content: rowsToCsv(rows) });
      tableResults.push({ table: dataset.table, classification: dataset.classification, records: rows.length, included: true, reason: dataset.reason });
      console.info("Company backup dataset", { correlationId, actorStaffId: access.actor.staffId, actorCompanyId: access.actor.companyId, table: dataset.table, scopedRowCount: rows.length });
    } catch (error) {
      // A successful response must be a complete archive. Do not silently omit a
      // failed dataset and present the result as a usable backup.
      throw new Error(`Backup export stopped at ${dataset.table}: ${error instanceof Error ? error.message : "scoped export error"}`);
    }
  }

  const manifest = {
    app_version: APP_VERSION,
    sprint: APP_SPRINT,
    release_note: APP_RELEASE_NOTE,
    correlation_id: correlationId,
    generated_at: generatedAt,
    pagination: { ordering: "created_at ascending, id ascending keyset", boundary: { created_at_lte: generatedAt }, consistency: "Stable bounded keyset export. Rows created after the captured generated_at boundary are excluded. Rows retained with created_at at or before the boundary are emitted at most once in deterministic (created_at,id) order. Concurrent updates are reflected if read before their page; concurrent deletion can omit the deleted row and is recorded as a non-snapshot limitation." },
    limits: { max_rows_per_dataset: MAX_ROWS_PER_DATASET, max_rows_per_archive: MAX_ROWS_PER_ARCHIVE },
    generated_by: { staff_name: access.actor.fullName ?? "Owner", staff_email: access.actor.email ?? user?.email ?? null, staff_id: access.actor.staffId },
    company_id: access.actor.companyId,
    company_name: branding.company_name,
    datasets: tableResults,
    warning: "Passwords, authentication tokens, service-role keys, signed URLs, and attachment file contents are not included. Store this confidential company backup securely.",
  };

  files.unshift({ name: "manifest.json", content: JSON.stringify(manifest, null, 2) });
  try {
    const { error: auditError } = await db.from("audit_logs").insert({
      company_id: access.actor.companyId,
      entity_type: "system_backup",
      entity_id: access.actor.staffId,
      action: "backup.generated",
      new_values: { correlation_id: correlationId, table_count: tableResults.filter((row) => row.included).length, generated_at: generatedAt },
      created_by: access.actor.staffId,
    });
    if (auditError) throw auditError;
  } catch (error) {
    logServerError(error, { source: "backup.audit-log", requestId: correlationId, actorId: access.actor.staffId, companyId: access.actor.companyId });
  }

  let buffer: Buffer;
  try {
    buffer = createZip(files, { maxMemberBytes: MAX_ZIP_MEMBER_BYTES, maxArchiveBytes: MAX_ZIP_UNCOMPRESSED_BYTES, maxOutputBytes: MAX_ZIP_OUTPUT_BYTES });
  } catch (error) {
    throw new Error(`Backup ZIP creation stopped: ${error instanceof Error ? error.message : "server safety limit"}`);
  }
  return { filename: `seri-bako-oms-${access.actor.companyId}-backup-${generatedAt.slice(0, 10)}.zip`, buffer, manifest };
}

export const BACKUP_TABLES = BACKUP_DATASETS.filter((dataset) => dataset.classification !== "excluded").map((dataset) => dataset.table);
