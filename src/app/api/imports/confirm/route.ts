import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isMockMode } from "@/lib/mock-mode";
import { importEntities } from "@/lib/imports/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { writeActivityLog } from "@/server/activity/log";
import { formatActionError } from "@/server/actions/error-handling";
import { hasPermission } from "@/server/auth/permissions";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getNextDocumentNumber } from "@/server/documents/sequences";
import { getDefaultCompanyId } from "@/server/queries/barcodes";
import { getCurrentProfile } from "@/server/queries/common";
import type { BarcodeType, BranchType, Database, ItemStatus, RecordStatus, StaffStatus, StockTransactionStatus } from "@/types/database";

const importSchema = z.object({
  entity: z.enum(importEntities),
  mode: z.enum(["create", "update", "upsert"]).default("create"),
  confirmPosting: z.boolean().optional(),
  rows: z.array(z.record(z.string(), z.string())).min(1).max(500),
});

type ImportRequest = z.infer<typeof importSchema>;
type ImportResultRow = { rowNumber: number; values: Record<string, string>; message: string };
type ImportSummary = {
  imported: number;
  updated: number;
  skipped: number;
  errors: number;
  errorRows: ImportResultRow[];
};

type RouteContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  writeSupabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;
  profile: Awaited<ReturnType<typeof getCurrentProfile>>;
};

function getWriteClient(fallback: Awaited<ReturnType<typeof createClient>>) {
  try {
    return createAdminClient();
  } catch (error) {
    if (error instanceof Error && error.message.includes("service role key")) return fallback;
    throw error;
  }
}

function normalizeText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : "";
}

function normalizeLower(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function parseNumber(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const numeric = Number(text);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseBooleanFlag(value: unknown, defaultValue = true) {
  const normalized = normalizeLower(value);
  if (!normalized) return defaultValue;
  if (["1", "true", "yes", "y", "active", "checked"].includes(normalized)) return true;
  if (["0", "false", "no", "n", "inactive", "unchecked"].includes(normalized)) return false;
  return defaultValue;
}

function parseStatus(value: unknown): RecordStatus {
  const normalized = normalizeLower(value);
  return normalized === "inactive" || normalized === "archived" ? normalized : "active";
}

function hasDuplicateInFile(summary: ImportSummary, seen: Map<string, number>, key: string, rowNumber: number, row: Record<string, string>) {
  if (!key) return false;
  const first = seen.get(key);
  if (first) {
    pushIssue(summary, rowNumber, row, `Duplicate of row ${first}.`);
    return true;
  }
  seen.set(key, rowNumber);
  return false;
}

function parseDate(value: unknown) {
  const text = normalizeText(value);
  if (!text) return null;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function createSummary(): ImportSummary {
  return { imported: 0, updated: 0, skipped: 0, errors: 0, errorRows: [] };
}

function pushIssue(summary: ImportSummary, rowNumber: number, values: Record<string, string>, message: string, type: "error" | "skip" = "error") {
  summary.errorRows.push({ rowNumber, values, message });
  if (type === "skip") summary.skipped += 1;
  else summary.errors += 1;
}

function summaryMessage(entity: ImportRequest["entity"], summary: ImportSummary) {
  return `${entity} import finished. Imported: ${summary.imported}. Updated: ${summary.updated}. Skipped: ${summary.skipped}. Errors: ${summary.errors}.`;
}

function response(entity: ImportRequest["entity"], summary: ImportSummary, status = 200) {
  return NextResponse.json(
    {
      ok: summary.errors === 0,
      imported: summary.imported,
      updated: summary.updated,
      skipped: summary.skipped,
      errors: summary.errors,
      message: summaryMessage(entity, summary),
      errorRows: summary.errorRows,
    },
    { status },
  );
}

async function canImport(entity: ImportRequest["entity"]) {
  if (entity === "opening-stock") {
    return (await hasPermission("stock_transactions.create")) || (await hasPermission("company.update"));
  }

  return (await hasPermission("imports.create")) || (await hasPermission("company.update"));
}

async function ensurePrimaryItemBarcode(
  context: RouteContext,
  companyId: string,
  itemId: string,
  barcodeValue: string,
  existingPrimaryId?: string | null,
) {
  const payload = {
    company_id: companyId,
    stock_entity_type: "item" as const,
    item_id: itemId,
    barcode_value: barcodeValue,
    barcode_type: "internal" as BarcodeType,
    is_primary: true,
    status: "active" as RecordStatus,
    deleted_at: null,
  };

  if (existingPrimaryId) {
    const { error } = await context.writeSupabase.from("barcode_mappings").update(payload).eq("id", existingPrimaryId);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await context.writeSupabase.from("barcode_mappings").insert(payload);
  if (error) throw new Error(error.message);
}

function getItemImportValues(row: Record<string, string>, entity: ImportRequest["entity"]) {
  if (entity === "items-stock-listing") {
    return {
      item_code: normalizeText(row["Item Code"]),
      item_name: normalizeText(row.Description),
      category: normalizeText(row["Item Group"]) || "Uncategorized",
      base_uom: normalizeText(row["Base UOM"]),
      purchase_uom: normalizeText(row["Base UOM"]),
      barcode: "",
      cost: null,
      safety_stock: 0,
      supplier_name: "",
      supplier_code: normalizeText(row["Main Supplier"]),
      active: normalizeText(row["Is Active"]),
      autocount_code: "",
    };
  }

  return {
    item_code: normalizeText(row.item_code),
    item_name: normalizeText(row.item_name),
    category: normalizeText(row.category),
    base_uom: normalizeText(row.base_uom),
    purchase_uom: normalizeText(row.purchase_uom) || normalizeText(row.base_uom),
    barcode: "",
    cost: parseNumber(row.default_unit_cost ?? row.cost),
    safety_stock: parseNumber(row.safety_stock),
    supplier_name: normalizeText(row.supplier_name),
    supplier_code: normalizeText(row.supplier_code),
    active: normalizeText(row.status ?? row.active),
    autocount_code: "",
  };
}

async function handleItemsImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const seen = new Map<string, number>();
  const itemRows = rows.map((row) => ({ source: row, values: getItemImportValues(row, request.entity) }));
  const itemCodes = [...new Set(itemRows.map((row) => row.values.item_code).filter(Boolean))];
  const supplierNames = [...new Set(itemRows.map((row) => normalizeLower(row.values.supplier_name)).filter(Boolean))];
  const barcodeValues = [...new Set(itemRows.map((row) => row.values.barcode).filter(Boolean))];
  const companyId = context.profile?.company_id ?? (await getDefaultCompanyId());

  const [{ data: existingItems, error: itemsError }, { data: suppliers, error: suppliersError }, { data: existingBarcodes, error: barcodesError }] = await Promise.all([
    context.supabase.from("items").select("id, item_code").in("item_code", itemCodes.length ? itemCodes : [""]),
    context.supabase.from("suppliers").select("id, name, supplier_code").eq("status", "active"),
    context.supabase
      .from("barcode_mappings")
      .select("id, barcode_value, item_id, is_primary")
      .eq("company_id", companyId)
      .eq("stock_entity_type", "item")
      .is("deleted_at", null)
      .in("barcode_value", barcodeValues.length ? barcodeValues : [""]),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (suppliersError) throw new Error(suppliersError.message);
  if (barcodesError) throw new Error(barcodesError.message);

  const existingByCode = new Map((existingItems ?? []).map((row) => [normalizeLower(row.item_code), row]));
  const supplierByName = new Map((suppliers ?? []).map((row) => [normalizeLower(row.name), row]));
  const supplierByCode = new Map((suppliers ?? []).filter((row) => row.supplier_code).map((row) => [normalizeLower(row.supplier_code), row]));
  const barcodeByValue = new Map((existingBarcodes ?? []).map((row) => [normalizeLower(row.barcode_value), row]));

  for (const [index, row] of itemRows.entries()) {
    const rowNumber = index + 1;
    const sourceRow = row.source;
    const itemCode = row.values.item_code;
    const itemName = row.values.item_name;
    const category = row.values.category;
    const baseUom = row.values.base_uom;
    const purchaseUom = row.values.purchase_uom || baseUom;
    const barcode = row.values.barcode;
    const cost = row.values.cost;
    const safetyStock = row.values.safety_stock;
    const existing = existingByCode.get(normalizeLower(itemCode));
    const supplier = row.values.supplier_code
      ? supplierByCode.get(normalizeLower(row.values.supplier_code))
      : row.values.supplier_name
        ? supplierByName.get(normalizeLower(row.values.supplier_name))
        : null;
    const existingBarcode = barcode ? barcodeByValue.get(normalizeLower(barcode)) : null;

    if (hasDuplicateInFile(summary, seen, normalizeLower(itemCode), rowNumber, sourceRow)) continue;
    if (!itemCode || !itemName || !category || !baseUom) {
      pushIssue(summary, rowNumber, sourceRow, "Missing required field.");
      continue;
    }
    if ((cost ?? 0) < 0 || (safetyStock ?? 0) < 0) {
      pushIssue(summary, rowNumber, sourceRow, "Numeric values cannot be negative.");
      continue;
    }
    if (cost === null && request.entity !== "items-stock-listing" && normalizeText(sourceRow.cost)) {
      pushIssue(summary, rowNumber, sourceRow, "Invalid number for cost.");
      continue;
    }
    if (safetyStock === null && request.entity !== "items-stock-listing" && normalizeText(sourceRow.safety_stock)) {
      pushIssue(summary, rowNumber, sourceRow, "Invalid number for safety_stock.");
      continue;
    }
    if (row.values.supplier_code && !supplier) {
      pushIssue(summary, rowNumber, sourceRow, "Supplier code not found. Import supplier first or leave supplier blank.");
      continue;
    }
    if (supplierNames.length && row.values.supplier_name && !supplier) {
      pushIssue(summary, rowNumber, sourceRow, "Unknown supplier.");
      continue;
    }
    if (existingBarcode && existingBarcode.item_id && (!existing || existingBarcode.item_id !== existing.id)) {
      pushIssue(summary, rowNumber, sourceRow, "Invalid barcode. This barcode already belongs to another item.");
      continue;
    }
    if (existing && request.mode === "create") {
      pushIssue(summary, rowNumber, sourceRow, "Duplicate code. This item already exists.", "skip");
      continue;
    }
    if (!existing && request.mode === "update") {
      pushIssue(summary, rowNumber, sourceRow, "Unknown item_code. Update mode only changes existing items.", "skip");
      continue;
    }

    const payload: Database["public"]["Tables"]["items"]["Insert"] = {
      item_code: itemCode,
      item_name: itemName,
      category,
      base_unit: baseUom,
      purchase_unit: purchaseUom,
      conversion_to_base_unit: 1,
      autocount_code: row.values.autocount_code || null,
      supplier_id: supplier?.id ?? null,
      safety_stock: safetyStock ?? 0,
      cost: cost ?? 0,
      status: (parseBooleanFlag(row.values.active, true) ? "active" : "inactive") as ItemStatus,
    };

    if (existing) {
      const { error } = await context.writeSupabase.from("items").update(payload).eq("id", existing.id);
      if (error) {
        pushIssue(summary, rowNumber, sourceRow, error.message);
        continue;
      }
      if (barcode) {
        try {
          await ensurePrimaryItemBarcode(context, companyId, existing.id, barcode, existingBarcode?.id ?? null);
        } catch (error) {
          pushIssue(summary, rowNumber, sourceRow, error instanceof Error ? error.message : "Could not update barcode mapping.");
          continue;
        }
      }
      summary.updated += 1;
    } else {
      const { data, error } = await context.writeSupabase.from("items").insert(payload).select("id").single();
      if (error || !data) {
        pushIssue(summary, rowNumber, sourceRow, error?.message ?? "Could not create this item.");
        continue;
      }
      if (barcode) {
        try {
          await ensurePrimaryItemBarcode(context, companyId, data.id, barcode);
        } catch (error) {
          pushIssue(summary, rowNumber, sourceRow, error instanceof Error ? error.message : "Could not create barcode mapping.");
          continue;
        }
      }
      summary.imported += 1;
    }
  }

  return summary;
}

async function handleProductsImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const productCodes = [...new Set(rows.map((row) => normalizeText(row.product_code)).filter(Boolean))];
  const { data: existingProducts, error: existingError } = await context.supabase
    .from("products")
    .select("id, product_code")
    .in("product_code", productCodes.length ? productCodes : [""]);
  if (existingError) throw new Error(existingError.message);
  const existingByCode = new Map((existingProducts ?? []).map((row) => [normalizeLower(row.product_code), row]));

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const productCode = normalizeText(row.product_code);
    const existing = existingByCode.get(normalizeLower(productCode));
    if (!productCode || !normalizeText(row.product_name) || !normalizeText(row.category) || !normalizeText(row.selling_unit)) {
      pushIssue(summary, rowNumber, row, "Missing required field.");
      continue;
    }
    if (existing && request.mode === "create") {
      pushIssue(summary, rowNumber, row, "Duplicate code. This product already exists.", "skip");
      continue;
    }
    if (!existing && request.mode === "update") {
      pushIssue(summary, rowNumber, row, "Unknown product_code. Update mode only changes existing products.", "skip");
      continue;
    }

    const payload: Database["public"]["Tables"]["products"]["Insert"] = {
      product_code: productCode,
      product_name: normalizeText(row.product_name),
      category: normalizeText(row.category),
      selling_unit: normalizeText(row.selling_unit),
      status: (parseBooleanFlag(row.active, true) ? "active" : "inactive") as ItemStatus,
    };

    if (existing) {
      const { error } = await context.writeSupabase.from("products").update(payload).eq("id", existing.id);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.updated += 1;
    } else {
      const { error } = await context.writeSupabase.from("products").insert(payload);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.imported += 1;
    }
  }

  return summary;
}

async function handleSuppliersImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const seen = new Map<string, number>();
  const { data: existingSuppliers, error: existingError } = await context.supabase
    .from("suppliers")
    .select("id, supplier_code, name")
    .eq("status", "active");
  if (existingError) throw new Error(existingError.message);

  const existingByCode = new Map(
    (existingSuppliers ?? [])
      .filter((row) => row.supplier_code)
      .map((row) => [normalizeLower(row.supplier_code), row]),
  );
  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const supplierCode = normalizeText(row.supplier_code);
    const supplierName = normalizeText(row.supplier_name);
    const existing = existingByCode.get(normalizeLower(supplierCode));

    if (hasDuplicateInFile(summary, seen, normalizeLower(supplierCode), rowNumber, row)) continue;
    if (!supplierCode || !supplierName) {
      pushIssue(summary, rowNumber, row, "supplier_code and supplier_name are required.");
      continue;
    }
    const paymentTerms = parseNumber(row.payment_terms_days ?? row.payment_terms);
    if (paymentTerms !== null && paymentTerms < 0) {
      pushIssue(summary, rowNumber, row, "payment_terms_days cannot be negative.");
      continue;
    }

    if (normalizeText(row.email) && !z.string().email().safeParse(row.email).success) {
      pushIssue(summary, rowNumber, row, "Invalid email address.");
      continue;
    }

    if (existing && request.mode === "create") {
      pushIssue(summary, rowNumber, row, "Duplicate code. This supplier already exists.", "skip");
      continue;
    }
    if (!existing && request.mode === "update") {
      pushIssue(summary, rowNumber, row, "Unknown supplier_code. Update mode only changes existing suppliers.", "skip");
      continue;
    }

    const payload: Database["public"]["Tables"]["suppliers"]["Insert"] = {
      supplier_code: supplierCode,
      name: supplierName,
      contact_person: normalizeText(row.contact_name ?? row.contact_person) || null,
      phone: normalizeText(row.phone) || null,
      email: normalizeText(row.email) || null,
      address: normalizeText(row.address) || null,
      payment_terms_days: paymentTerms ?? 30,
      status: parseStatus(row.status ?? row.active) as Database["public"]["Tables"]["suppliers"]["Row"]["status"],
    };

    if (existing) {
      const { error } = await context.writeSupabase.from("suppliers").update(payload).eq("id", existing.id);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.updated += 1;
    } else {
      const { error } = await context.writeSupabase.from("suppliers").insert(payload);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.imported += 1;
    }
  }

  return summary;
}

async function handleBranchesImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const seen = new Map<string, number>();
  const companyId = context.profile?.company_id ?? (await getDefaultCompanyId());
  const allowedTypes: BranchType[] = ["central_kitchen", "outlet", "event_booth", "office", "other"];
  const codes = [...new Set(rows.map((row) => normalizeText(row.branch_code)).filter(Boolean))];
  const { data: existingBranches, error } = await context.supabase
    .from("branches")
    .select("id, branch_code")
    .in("branch_code", codes.length ? codes : [""])
    .is("deleted_at", null);
  if (error) throw new Error(error.message);
  const existingByCode = new Map((existingBranches ?? []).map((row) => [normalizeLower(row.branch_code), row]));

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const branchCode = normalizeText(row.branch_code);
    const branchType = normalizeText(row.branch_type) as BranchType;
    if (hasDuplicateInFile(summary, seen, normalizeLower(branchCode), rowNumber, row)) continue;
    if (!branchCode || !normalizeText(row.branch_name) || !branchType) {
      pushIssue(summary, rowNumber, row, "branch_code, branch_name, and branch_type are required.");
      continue;
    }
    if (!allowedTypes.includes(branchType)) {
      pushIssue(summary, rowNumber, row, "Invalid branch_type.");
      continue;
    }
    if (!["active", "inactive", "archived", ""].includes(normalizeLower(row.status))) {
      pushIssue(summary, rowNumber, row, "Invalid status.");
      continue;
    }
    if (existingByCode.has(normalizeLower(branchCode))) {
      pushIssue(summary, rowNumber, row, "Duplicate code. This branch already exists.", "skip");
      continue;
    }

    const { error: insertError } = await context.writeSupabase.from("branches").insert({
      company_id: companyId,
      branch_code: branchCode,
      branch_name: normalizeText(row.branch_name),
      branch_type: branchType,
      address: normalizeText(row.address) || null,
      status: parseStatus(row.status),
      created_by: context.profile?.id ?? null,
    });
    if (insertError) {
      pushIssue(summary, rowNumber, row, insertError.message);
      continue;
    }
    summary.imported += 1;
  }

  return summary;
}

async function handleStaffImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const seenCode = new Map<string, number>();
  const seenEmail = new Map<string, number>();
  const companyId = context.profile?.company_id ?? (await getDefaultCompanyId());
  const [{ data: existingStaff, error: staffError }, { data: branches, error: branchError }, { data: roles, error: roleError }] = await Promise.all([
    context.supabase.from("staffs").select("id, staff_code, email, invite_email").is("deleted_at", null),
    context.supabase.from("branches").select("id, branch_code").is("deleted_at", null),
    context.supabase.from("roles").select("id, role_code").is("deleted_at", null),
  ]);
  if (staffError) throw new Error(staffError.message);
  if (branchError) throw new Error(branchError.message);
  if (roleError) throw new Error(roleError.message);
  const staffByCode = new Map((existingStaff ?? []).filter((row) => row.staff_code).map((row) => [normalizeLower(row.staff_code), row]));
  const staffByEmail = new Map((existingStaff ?? []).flatMap((row) => [row.email, row.invite_email].filter(Boolean).map((email) => [normalizeLower(email), row] as const)));
  const branchByCode = new Map((branches ?? []).map((row) => [normalizeLower(row.branch_code), row]));
  const roleByCode = new Map((roles ?? []).map((row) => [normalizeLower(row.role_code), row]));

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const staffCode = normalizeText(row.staff_code);
    const email = normalizeLower(row.email);
    const branch = branchByCode.get(normalizeLower(row.branch_code));
    const role = roleByCode.get(normalizeLower(row.role_code));
    if (hasDuplicateInFile(summary, seenCode, normalizeLower(staffCode), rowNumber, row)) continue;
    if (hasDuplicateInFile(summary, seenEmail, email, rowNumber, row)) continue;
    if (!staffCode || !normalizeText(row.full_name) || !email || !normalizeText(row.branch_code) || !normalizeText(row.role_code)) {
      pushIssue(summary, rowNumber, row, "staff_code, full_name, email, branch_code, and role_code are required.");
      continue;
    }
    if (!z.string().email().safeParse(email).success) {
      pushIssue(summary, rowNumber, row, "Invalid email address.");
      continue;
    }
    if (staffByCode.has(normalizeLower(staffCode)) || staffByEmail.has(email)) {
      pushIssue(summary, rowNumber, row, "Duplicate staff_code or email.", "skip");
      continue;
    }
    if (!branch) {
      pushIssue(summary, rowNumber, row, "Unknown branch_code.");
      continue;
    }
    if (!role) {
      pushIssue(summary, rowNumber, row, "Unknown role_code.");
      continue;
    }

    const { data: staff, error: insertError } = await context.writeSupabase.from("staffs").insert({
      company_id: companyId,
      staff_code: staffCode,
      full_name: normalizeText(row.full_name),
      email,
      invite_email: email,
      phone: normalizeText(row.phone) || null,
      default_branch_id: branch.id,
      status: (normalizeLower(row.status) === "disabled" ? "disabled" : normalizeLower(row.status) === "invited" ? "invited" : parseStatus(row.status)) as StaffStatus,
      invitation_status: "not_sent",
      must_change_password: false,
      auth_setup_method: "imported",
      created_by: context.profile?.id ?? null,
    }).select("id").single();
    if (insertError || !staff) {
      pushIssue(summary, rowNumber, row, insertError?.message ?? "Could not create staff.");
      continue;
    }
    const [roleInsert, branchInsert] = await Promise.all([
      context.writeSupabase.from("staff_roles").insert({ staff_id: staff.id, role_id: role.id, branch_id: branch.id, is_primary: true }),
      context.writeSupabase.from("staff_branches").insert({ staff_id: staff.id, branch_id: branch.id, access_level: "full", is_default: true }),
    ]);
    if (roleInsert.error || branchInsert.error) {
      pushIssue(summary, rowNumber, row, roleInsert.error?.message ?? branchInsert.error?.message ?? "Could not assign staff access.");
      continue;
    }
    summary.imported += 1;
  }

  return summary;
}

async function handleSupplierItemsImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const supplierCodes = [...new Set(rows.map((row) => normalizeText(row.supplier_code)).filter(Boolean))];
  const supplierNames = [...new Set(rows.map((row) => normalizeText(row.supplier_name)).filter(Boolean))];
  const itemCodes = [...new Set(rows.map((row) => normalizeText(row.item_code)).filter(Boolean))];

  const [{ data: suppliers, error: suppliersError }, { data: items, error: itemsError }] = await Promise.all([
    context.supabase.from("suppliers").select("id, supplier_code, name").eq("status", "active"),
    context.supabase.from("items").select("id, item_code, item_name").is("deleted_at", null),
  ]);
  if (suppliersError) throw new Error(suppliersError.message);
  if (itemsError) throw new Error(itemsError.message);

  const supplierByCode = new Map((suppliers ?? []).filter((row) => row.supplier_code).map((row) => [normalizeLower(row.supplier_code), row]));
  const supplierByName = new Map((suppliers ?? []).map((row) => [normalizeLower(row.name), row]));
  const itemByCode = new Map((items ?? []).map((row) => [normalizeLower(row.item_code), row]));

  const supplierIds = [
    ...new Set(
      [...supplierCodes.map((code) => supplierByCode.get(normalizeLower(code))?.id), ...supplierNames.map((name) => supplierByName.get(normalizeLower(name))?.id)].filter(
        (value): value is string => Boolean(value),
      ),
    ),
  ];
  const itemIds = [
    ...new Set(itemCodes.map((code) => itemByCode.get(normalizeLower(code))?.id).filter((value): value is string => Boolean(value))),
  ];

  const { data: existingRows, error: existingError } = await context.supabase
    .from("supplier_items")
    .select("id, supplier_id, item_id, unit_cost")
    .in("supplier_id", supplierIds.length ? supplierIds : [""])
    .in("item_id", itemIds.length ? itemIds : [""])
    .is("deleted_at", null);
  if (existingError) throw new Error(existingError.message);
  const existingByPair = new Map((existingRows ?? []).map((row) => [`${row.supplier_id}|${row.item_id}`, row]));

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const supplier =
      supplierByCode.get(normalizeLower(row.supplier_code)) ??
      supplierByName.get(normalizeLower(row.supplier_name));
    const item = itemByCode.get(normalizeLower(row.item_code));
    const purchaseUom = normalizeText(row.purchase_uom);
    const unitCost = parseNumber(row.unit_cost);
    const conversionRate = parseNumber(row.conversion_rate);
    const leadTime = parseNumber(row.lead_time_days);
    const moq = parseNumber(row.moq);

    if ((!normalizeText(row.supplier_code) && !normalizeText(row.supplier_name)) || !item || !purchaseUom || unitCost === null) {
      pushIssue(summary, rowNumber, row, !item ? "Unknown item." : "Missing required supplier, purchase_uom, or unit_cost.");
      continue;
    }
    if (!supplier) {
      pushIssue(summary, rowNumber, row, "Unknown supplier.");
      continue;
    }
    if (conversionRate === null && normalizeText(row.conversion_rate)) {
      pushIssue(summary, rowNumber, row, "Invalid conversion_rate.");
      continue;
    }
    if (conversionRate !== null && conversionRate <= 0) {
      pushIssue(summary, rowNumber, row, "conversion_rate must be greater than 0.");
      continue;
    }
    if (leadTime === null && normalizeText(row.lead_time_days)) {
      pushIssue(summary, rowNumber, row, "Invalid lead_time_days.");
      continue;
    }
    if (moq === null && normalizeText(row.moq)) {
      pushIssue(summary, rowNumber, row, "Invalid moq.");
      continue;
    }

    const pairKey = `${supplier.id}|${item.id}`;
    const existing = existingByPair.get(pairKey);
    if (existing && request.mode === "create") {
      pushIssue(summary, rowNumber, row, "This supplier and item already have a mapping.", "skip");
      continue;
    }
    if (!existing && request.mode === "update") {
      pushIssue(summary, rowNumber, row, "No existing supplier and item mapping was found for update mode.", "skip");
      continue;
    }

    const payload: Database["public"]["Tables"]["supplier_items"]["Insert"] = {
      supplier_id: supplier.id,
      item_id: item.id,
      supplier_item_code: normalizeText(row.supplier_item_code) || normalizeText(row.item_code),
      supplier_item_name: normalizeText(row.supplier_item_name) || item.item_name,
      purchase_uom: purchaseUom,
      conversion_to_base_uom: conversionRate ?? 1,
      unit_cost: unitCost,
      moq: moq ?? 0,
      lead_time_days: leadTime ?? 0,
      status: (parseBooleanFlag(row.active, true) ? "active" : "inactive") as RecordStatus,
    };

    if (existing) {
      const { error } = await context.writeSupabase.from("supplier_items").update(payload).eq("id", existing.id);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.updated += 1;
    } else {
      const { error } = await context.writeSupabase.from("supplier_items").insert(payload);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.imported += 1;
    }
  }

  return summary;
}

async function handleUomConversionsImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const itemCodes = [...new Set(rows.map((row) => normalizeText(row.item_code)).filter(Boolean))];

  const [{ data: items, error: itemsError }, { data: existingConversions, error: conversionsError }] = await Promise.all([
    context.supabase.from("items").select("id, item_code").in("item_code", itemCodes.length ? itemCodes : [""]),
    context.supabase.from("uom_conversions").select("id, item_id, from_uom, to_uom").is("deleted_at", null),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (conversionsError) throw new Error(conversionsError.message);

  const itemByCode = new Map((items ?? []).map((row) => [normalizeLower(row.item_code), row]));
  const existingByKey = new Map(
    (existingConversions ?? [])
      .filter((row) => row.item_id)
      .map((row) => [`${row.item_id}|${normalizeLower(row.from_uom)}|${normalizeLower(row.to_uom)}`, row]),
  );

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const item = itemByCode.get(normalizeLower(row.item_code));
    const fromUom = normalizeText(row.from_uom);
    const toUom = normalizeText(row.to_uom);
    const factor = parseNumber(row.conversion_rate);

    if (!item) {
      pushIssue(summary, rowNumber, row, "item_code must exist.");
      continue;
    }
    if (!fromUom || !toUom || factor === null) {
      pushIssue(summary, rowNumber, row, "from_uom, to_uom, and conversion_rate are required.");
      continue;
    }
    if (factor <= 0) {
      pushIssue(summary, rowNumber, row, "conversion_rate must be greater than 0.");
      continue;
    }

    const existing = existingByKey.get(`${item.id}|${normalizeLower(fromUom)}|${normalizeLower(toUom)}`);
    if (existing && request.mode === "create") {
      pushIssue(summary, rowNumber, row, "This conversion already exists for the selected item.", "skip");
      continue;
    }
    if (!existing && request.mode === "update") {
      pushIssue(summary, rowNumber, row, "No existing conversion was found for update mode.", "skip");
      continue;
    }

    const payload: Database["public"]["Tables"]["uom_conversions"]["Insert"] = {
      item_id: item.id,
      from_uom: fromUom,
      to_uom: toUom,
      factor,
      status: (parseBooleanFlag(row.active, true) ? "active" : "inactive") as RecordStatus,
    };

    if (existing) {
      const { error } = await context.writeSupabase.from("uom_conversions").update(payload).eq("id", existing.id);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.updated += 1;
    } else {
      const { error } = await context.writeSupabase.from("uom_conversions").insert(payload);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.imported += 1;
    }
  }

  return summary;
}

async function handleBarcodeMappingsImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  const rows = request.rows;
  const companyId = context.profile?.company_id ?? (await getDefaultCompanyId());
  const itemCodes = [...new Set(rows.map((row) => normalizeText(row.item_code)).filter(Boolean))];
  const barcodeValues = [...new Set(rows.map((row) => normalizeText(row.barcode)).filter(Boolean))];
  const allowedBarcodeTypes: BarcodeType[] = ["internal", "supplier", "qr", "packaging", "ean13", "upc", "other"];

  const [{ data: items, error: itemsError }, { data: mappings, error: mappingsError }] = await Promise.all([
    context.supabase.from("items").select("id, item_code").in("item_code", itemCodes.length ? itemCodes : [""]),
    context.supabase
      .from("barcode_mappings")
      .select("id, barcode_value, item_id, is_primary")
      .eq("company_id", companyId)
      .eq("stock_entity_type", "item")
      .is("deleted_at", null)
      .in("barcode_value", barcodeValues.length ? barcodeValues : [""]),
  ]);
  if (itemsError) throw new Error(itemsError.message);
  if (mappingsError) throw new Error(mappingsError.message);

  const itemByCode = new Map((items ?? []).map((row) => [normalizeLower(row.item_code), row]));
  const existingByBarcode = new Map((mappings ?? []).map((row) => [normalizeLower(row.barcode_value), row]));

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const item = itemByCode.get(normalizeLower(row.item_code));
    const barcode = normalizeText(row.barcode);
    const barcodeType = normalizeLower(row.barcode_type) as BarcodeType;
    const existing = existingByBarcode.get(normalizeLower(barcode));

    if (!item) {
      pushIssue(summary, rowNumber, row, "item_code must exist.");
      continue;
    }
    if (!barcode) {
      pushIssue(summary, rowNumber, row, "barcode is required.");
      continue;
    }
    if (!allowedBarcodeTypes.includes(barcodeType)) {
      pushIssue(summary, rowNumber, row, "Invalid barcode_type.");
      continue;
    }
    if (existing && existing.item_id !== item.id) {
      pushIssue(summary, rowNumber, row, "This barcode already belongs to another item.");
      continue;
    }
    if (existing && request.mode === "create") {
      pushIssue(summary, rowNumber, row, "This barcode already exists for the selected item.", "skip");
      continue;
    }
    if (!existing && request.mode === "update") {
      pushIssue(summary, rowNumber, row, "No existing barcode mapping was found for update mode.", "skip");
      continue;
    }

    const payload: Database["public"]["Tables"]["barcode_mappings"]["Insert"] = {
      company_id: companyId,
      stock_entity_type: "item",
      item_id: item.id,
      barcode_value: barcode,
      barcode_type: barcodeType,
      is_primary: false,
      status: (parseBooleanFlag(row.active, true) ? "active" : "inactive") as RecordStatus,
    };

    if (existing) {
      const { error } = await context.writeSupabase.from("barcode_mappings").update(payload).eq("id", existing.id);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.updated += 1;
    } else {
      const { error } = await context.writeSupabase.from("barcode_mappings").insert(payload);
      if (error) {
        pushIssue(summary, rowNumber, row, error.message);
        continue;
      }
      summary.imported += 1;
    }
  }

  return summary;
}

async function handleOpeningStockImport(context: RouteContext, request: ImportRequest) {
  const summary = createSummary();
  if (!request.confirmPosting) {
    pushIssue(summary, 0, {}, "Please confirm that opening stock will be posted into the ledger.");
    return summary;
  }

  const rows = request.rows;
  const { data: branches, error: branchesError } = await context.supabase
    .from("branches")
    .select("id, branch_code, branch_name, status")
    .eq("status", "active")
    .is("deleted_at", null);
  if (branchesError) throw new Error(branchesError.message);

  const itemCodes = [...new Set(rows.map((row) => normalizeText(row.item_code)).filter(Boolean))];
  const { data: items, error: itemsError } = await context.supabase
    .from("items")
    .select("id, item_code, item_name, base_unit")
    .in("item_code", itemCodes.length ? itemCodes : [""])
    .is("deleted_at", null);
  if (itemsError) throw new Error(itemsError.message);

  const branchByNameOrCode = new Map<
    string,
    Pick<Database["public"]["Tables"]["branches"]["Row"], "id" | "branch_code" | "branch_name" | "status">
  >();
  for (const branch of branches ?? []) {
    branchByNameOrCode.set(normalizeLower(branch.branch_code), branch);
  }
  const itemByCode = new Map((items ?? []).map((row) => [normalizeLower(row.item_code), row]));
  const itemIds = [...new Set((items ?? []).map((row) => row.id))];

  const [{ data: conversions, error: conversionsError }, { data: openingRows, error: openingError }] = await Promise.all([
    context.supabase.from("uom_conversions").select("item_id, from_uom, to_uom, factor, status").is("deleted_at", null),
    context.supabase
      .from("stock_transactions")
      .select("branch_id, item_id")
      .eq("transaction_type", "opening_balance")
      .in("item_id", itemIds.length ? itemIds : [""]),
  ]);
  if (conversionsError) throw new Error(conversionsError.message);
  if (openingError) throw new Error(openingError.message);

  const openingKeySet = new Set((openingRows ?? []).map((row) => `${row.branch_id ?? ""}|${row.item_id}`));

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 1;
    const branch = branchByNameOrCode.get(normalizeLower(row.branch_code ?? row.branch));
    const item = itemByCode.get(normalizeLower(row.item_code));
    const quantity = parseNumber(row.quantity);
    const unitCost = parseNumber(row.unit_cost);
    const expiryDate = normalizeText(row.expiry_date) ? parseDate(row.expiry_date) : null;
    const inputUom = normalizeText(row.uom);

    if (!branch) {
      pushIssue(summary, rowNumber, row, "Unknown branch.");
      continue;
    }
    if (!item) {
      pushIssue(summary, rowNumber, row, "Unknown item.");
      continue;
    }
    if (quantity === null || quantity <= 0) {
      pushIssue(summary, rowNumber, row, "quantity must be greater than 0.");
      continue;
    }
    if (!inputUom) {
      pushIssue(summary, rowNumber, row, "uom is required.");
      continue;
    }
    if (unitCost === null && normalizeText(row.unit_cost)) {
      pushIssue(summary, rowNumber, row, "Invalid unit_cost.");
      continue;
    }
    if (normalizeText(row.expiry_date) && !expiryDate) {
      pushIssue(summary, rowNumber, row, "Invalid expiry_date.");
      continue;
    }
    if (normalizeText(row.transaction_date) && !parseDate(row.transaction_date)) {
      pushIssue(summary, rowNumber, row, "Invalid transaction_date.");
      continue;
    }

    const conversion =
      normalizeLower(inputUom) === normalizeLower(item.base_unit)
        ? { factor: 1 }
        : (conversions ?? []).find(
            (candidate) =>
              candidate.status === "active" &&
              normalizeLower(candidate.from_uom) === normalizeLower(inputUom) &&
              normalizeLower(candidate.to_uom) === normalizeLower(item.base_unit) &&
              (candidate.item_id === item.id || candidate.item_id === null),
          );

    if (!conversion) {
      pushIssue(summary, rowNumber, row, "Invalid UOM. No conversion found to the item's base unit.");
      continue;
    }

    const duplicateKey = `${branch.id}|${item.id}`;
    if (openingKeySet.has(duplicateKey)) {
      pushIssue(summary, rowNumber, row, "Opening stock already exists for this branch and item.", "skip");
      continue;
    }

    let locationId: string;
    try {
      locationId = await resolveDefaultLocation(branch.id);
    } catch (error) {
      pushIssue(summary, rowNumber, row, error instanceof Error ? error.message : "Could not resolve the branch default location.");
      continue;
    }

    const factor = Number(conversion.factor);
    const baseQuantity = quantity * factor;
    const ledgerUnitCost = unitCost !== null && factor > 0 ? unitCost / factor : 0;
    const now = new Date().toISOString();
    const remarks = [
      "Opening Stock Import Sprint 7.2.33",
      normalizeText(row.notes ?? row.remarks),
      normalizeText(row.batch_no) ? `Batch ${normalizeText(row.batch_no)}` : "",
      expiryDate ? `Expiry ${expiryDate}` : "",
    ]
      .filter(Boolean)
      .join(" | ");

    const transactionNo = await getNextDocumentNumber(context.profile?.company_id ?? (await getDefaultCompanyId()), "opening_balance");
    const transactionDate = parseDate(row.transaction_date) ?? now.slice(0, 10);
    const { data: transaction, error: transactionError } = await context.writeSupabase
      .from("stock_transactions")
      .insert({
        transaction_no: transactionNo,
        branch_id: branch.id,
        item_id: item.id,
        location_id: locationId,
        transaction_type: "opening_balance",
        transaction_date: transactionDate,
        quantity_in: baseQuantity,
        quantity_out: 0,
        unit_cost: ledgerUnitCost,
        total_cost: baseQuantity * ledgerUnitCost,
        status: "posted" as StockTransactionStatus,
        posted_at: now,
        posted_by: context.profile?.id ?? null,
        remarks,
        reference_type: "opening_stock_import",
        created_by: context.profile?.id ?? null,
      })
      .select("id")
      .single();

    if (transactionError || !transaction) {
      pushIssue(summary, rowNumber, row, transactionError?.message ?? "Could not post this opening stock row.");
      continue;
    }

    const { error: lineError } = await context.writeSupabase.from("stock_transaction_lines").insert({
      stock_transaction_id: transaction.id,
      stock_entity_type: "item",
      item_id: item.id,
      branch_id: branch.id,
      location_id: locationId,
      quantity_in: baseQuantity,
      quantity_out: 0,
      unit_cost: ledgerUnitCost,
      reference_type: "opening_stock_import",
      reference_id: transaction.id,
      remarks,
      created_by: context.profile?.id ?? null,
    });

    if (lineError) {
      pushIssue(summary, rowNumber, row, lineError.message);
      continue;
    }

    openingKeySet.add(duplicateKey);
    summary.imported += 1;
  }

  return summary;
}

function revalidateImportTargets(entity: ImportRequest["entity"]) {
  revalidatePath("/data-onboarding");
  revalidatePath("/dashboard");
  revalidatePath("/quick-tools");

  if (entity === "items" || entity === "items-stock-listing") {
    revalidatePath("/items");
    revalidatePath("/inventory");
    return;
  }
  if (entity === "suppliers") {
    revalidatePath("/suppliers");
    revalidatePath("/procurement");
    return;
  }
  if (entity === "branches") {
    revalidatePath("/branches");
    return;
  }
  if (entity === "staff") {
    revalidatePath("/staffs");
    revalidatePath("/roles");
    return;
  }
  if (entity === "supplier-items") {
    revalidatePath("/supplier-items");
    revalidatePath("/procurement");
    return;
  }
  if (entity === "uom-conversions") {
    revalidatePath("/uom-conversions");
    return;
  }
  if (entity === "barcode-mappings") {
    revalidatePath("/items");
    revalidatePath("/inventory");
    return;
  }
  if (entity === "opening-stock") {
    revalidatePath("/stock-balance");
    revalidatePath("/stock-card");
    revalidatePath("/inventory");
    revalidatePath("/stock-transactions");
    return;
  }
  if (entity === "products") {
    revalidatePath("/products");
  }
}

export async function POST(request: Request) {
  try {
    const payload = importSchema.safeParse(await request.json());
    if (!payload.success) {
      return NextResponse.json(
        {
          ok: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          message: "Invalid import request.",
          errorRows: [],
        },
        { status: 400 },
      );
    }

    if (isMockMode()) {
      return NextResponse.json({
        ok: true,
        imported: payload.data.rows.length,
        updated: 0,
        skipped: 0,
        errors: 0,
        message: `${payload.data.rows.length} rows accepted in mock mode.`,
        errorRows: [],
      });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          message: "Please sign in before importing data.",
          errorRows: [],
        },
        { status: 401 },
      );
    }

    if (!(await canImport(payload.data.entity))) {
      return NextResponse.json(
        {
          ok: false,
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: 1,
          message: "You do not have permission to manage this import.",
          errorRows: [],
        },
        { status: 403 },
      );
    }

    const context: RouteContext = {
      supabase,
      profile: await getCurrentProfile(),
      writeSupabase: getWriteClient(supabase),
    };

    const summary =
      payload.data.entity === "items" || payload.data.entity === "items-stock-listing"
        ? await handleItemsImport(context, payload.data)
        : payload.data.entity === "branches"
          ? await handleBranchesImport(context, payload.data)
          : payload.data.entity === "staff"
            ? await handleStaffImport(context, payload.data)
            : payload.data.entity === "products"
              ? await handleProductsImport(context, payload.data)
              : payload.data.entity === "suppliers"
                ? await handleSuppliersImport(context, payload.data)
                : payload.data.entity === "supplier-items"
                  ? await handleSupplierItemsImport(context, payload.data)
                  : payload.data.entity === "uom-conversions"
                    ? await handleUomConversionsImport(context, payload.data)
                    : payload.data.entity === "barcode-mappings"
                      ? await handleBarcodeMappingsImport(context, payload.data)
                      : await handleOpeningStockImport(context, payload.data);

    if (summary.imported || summary.updated) {
      try {
        await writeActivityLog({
          entityType: "import",
          entityId: "00000000-0000-0000-0000-000000000000",
          activityType: "master_data_imported",
          message: summaryMessage(payload.data.entity, summary),
        });
      } catch (error) {
        console.error(error);
      }
    }

    revalidateImportTargets(payload.data.entity);
    return response(payload.data.entity, summary);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        ok: false,
        imported: 0,
        updated: 0,
        skipped: 0,
        errors: 1,
          message: formatActionError(error, "Could not complete this import right now."),
        errorRows: [],
      },
      { status: 500 },
    );
  }
}
