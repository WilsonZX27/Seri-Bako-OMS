import { createClient } from "@/lib/supabase/server";
import { isMockMode, mockItems, mockLocations, mockProducts, mockSuppliers } from "@/lib/mock-mode";
import { requirePermission } from "@/server/auth/permissions";

export type CleanupIssue = {
  id: string;
  module: "item" | "product" | "supplier" | "location";
  severity: "critical" | "warning" | "info";
  issueType: string;
  record: string;
  href: string;
  action: string;
};

type Filters = { severity?: string; module?: string };
type CodeRow = { id: string; code: string | null; name: string; href: string };

const normalized = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const present = (value: string | null | undefined) => Boolean(value?.trim());
const active = (row: { status: string; deleted_at?: string | null }) => row.status === "active" && !row.deleted_at;

function addDuplicateCodeIssues(issues: CleanupIssue[], module: CleanupIssue["module"], rows: CodeRow[]) {
  const grouped = new Map<string, CodeRow[]>();
  for (const row of rows) {
    const code = normalized(row.code);
    if (code) grouped.set(code, [...(grouped.get(code) ?? []), row]);
  }
  for (const group of grouped.values()) {
    if (group.length < 2) continue;
    for (const row of group) issues.push({
      id: `duplicate-code-${module}-${row.id}`,
      module,
      severity: "critical",
      issueType: "Duplicate or variant code",
      record: `${row.code?.trim() || "No code"} — ${row.name}`,
      href: row.href,
      action: "Review the matching code and correct it manually.",
    });
  }
}

function addReference(map: Map<string, number>, id: string | null) {
  if (id) map.set(id, (map.get(id) ?? 0) + 1);
}

export async function getMasterDataCleanup(filters: Filters = {}) {
  await requirePermission("items.view");

  if (isMockMode()) {
    return buildCleanupReport({ items: mockItems, products: mockProducts, suppliers: mockSuppliers, locations: mockLocations }, filters);
  }

  const supabase = await createClient();
  const [items, products, suppliers, locations, prLines, poLines, stockLines, outletLines, recipes, supplierItems, purchaseOrders] = await Promise.all([
    supabase.from("items").select("id, item_code, item_name, category, base_unit, barcode, internal_barcode, supplier_barcode, status, deleted_at"),
    supabase.from("products").select("id, product_code, product_name, category, selling_unit, barcode, internal_barcode, status"),
    supabase.from("suppliers").select("id, supplier_code, name, contact_person, phone, email, status, deleted_at"),
    supabase.from("locations").select("id, location_code, location_name, branch_id, status, deleted_at"),
    supabase.from("purchase_request_lines").select("item_id, suggested_supplier_id"),
    supabase.from("purchase_order_lines").select("item_id"),
    supabase.from("stock_transaction_lines").select("item_id, product_id"),
    supabase.from("outlet_daily_record_lines").select("product_id"),
    supabase.from("recipes").select("product_id"),
    supabase.from("supplier_items").select("supplier_id"),
    supabase.from("purchase_orders").select("supplier_id"),
  ]);
  for (const result of [items, products, suppliers, locations, prLines, poLines, stockLines, outletLines, recipes, supplierItems, purchaseOrders]) {
    if (result.error) throw new Error(result.error.message);
  }
  return buildCleanupReport({
    items: items.data ?? [], products: products.data ?? [], suppliers: suppliers.data ?? [], locations: locations.data ?? [],
    itemReferences: [...(prLines.data ?? []).map((row) => row.item_id), ...(poLines.data ?? []).map((row) => row.item_id), ...(stockLines.data ?? []).map((row) => row.item_id)],
    productReferences: [...(stockLines.data ?? []).map((row) => row.product_id), ...(outletLines.data ?? []).map((row) => row.product_id), ...(recipes.data ?? []).map((row) => row.product_id)],
    supplierReferences: [...(prLines.data ?? []).map((row) => row.suggested_supplier_id), ...(supplierItems.data ?? []).map((row) => row.supplier_id), ...(purchaseOrders.data ?? []).map((row) => row.supplier_id)],
  }, filters);
}

function buildCleanupReport(
  data: {
    items: Array<{ id: string; item_code: string; item_name: string; category: string; base_unit: string; barcode?: string | null; internal_barcode?: string | null; supplier_barcode?: string | null; status: string; deleted_at?: string | null }>;
    products: Array<{ id: string; product_code: string; product_name: string; category: string; selling_unit: string; barcode?: string | null; internal_barcode?: string | null; status: string }>;
    suppliers: Array<{ id: string; supplier_code: string | null; name: string; contact_person: string | null; phone: string | null; email: string | null; status: string; deleted_at?: string | null }>;
    locations: Array<{ id: string; location_code: string; location_name: string; branch_id: string | null; status: string; deleted_at?: string | null }>;
    itemReferences?: Array<string | null>;
    productReferences?: Array<string | null>;
    supplierReferences?: Array<string | null>;
  },
  filters: Filters,
) {
  const issues: CleanupIssue[] = [];
  const itemReferences = new Map<string, number>();
  const productReferences = new Map<string, number>();
  const supplierReferences = new Map<string, number>();
  data.itemReferences?.forEach((id) => addReference(itemReferences, id));
  data.productReferences?.forEach((id) => addReference(productReferences, id));
  data.supplierReferences?.forEach((id) => addReference(supplierReferences, id));

  addDuplicateCodeIssues(issues, "item", data.items.filter(active).map((row) => ({ id: row.id, code: row.item_code, name: row.item_name, href: `/items/${row.id}` })));
  addDuplicateCodeIssues(issues, "product", data.products.filter(active).map((row) => ({ id: row.id, code: row.product_code, name: row.product_name, href: `/products/${row.id}` })));
  addDuplicateCodeIssues(issues, "supplier", data.suppliers.filter(active).map((row) => ({ id: row.id, code: row.supplier_code, name: row.name, href: `/suppliers/${row.id}` })));

  for (const row of data.items.filter(active)) {
    const record = `${row.item_code} — ${row.item_name || "Unnamed item"}`;
    if (!present(row.item_name)) issues.push({ id: `item-name-${row.id}`, module: "item", severity: "critical", issueType: "Missing item name", record, href: `/items/${row.id}`, action: "Add a clear item name." });
    if (!present(row.base_unit)) issues.push({ id: `item-uom-${row.id}`, module: "item", severity: "critical", issueType: "Missing base UOM", record, href: `/items/${row.id}`, action: "Set the base unit before using this item." });
    if (!present(row.category)) issues.push({ id: `item-category-${row.id}`, module: "item", severity: "warning", issueType: "Missing category", record, href: `/items/${row.id}`, action: "Set a category for filtering and reporting." });
    if (![row.barcode, row.internal_barcode, row.supplier_barcode].some(present)) issues.push({ id: `item-barcode-${row.id}`, module: "item", severity: "info", issueType: "Missing barcode", record, href: `/items/${row.id}`, action: "Add a barcode if scanning is used." });
  }
  for (const row of data.products.filter(active)) {
    const record = `${row.product_code} — ${row.product_name || "Unnamed product"}`;
    if (!present(row.product_name)) issues.push({ id: `product-name-${row.id}`, module: "product", severity: "critical", issueType: "Missing product name", record, href: `/products/${row.id}`, action: "Add a clear product name." });
    if (!present(row.selling_unit)) issues.push({ id: `product-uom-${row.id}`, module: "product", severity: "critical", issueType: "Missing selling UOM", record, href: `/products/${row.id}`, action: "Set the selling unit." });
    if (!present(row.category)) issues.push({ id: `product-category-${row.id}`, module: "product", severity: "warning", issueType: "Missing category", record, href: `/products/${row.id}`, action: "Set a category for filtering and reporting." });
    if (![row.barcode, row.internal_barcode].some(present)) issues.push({ id: `product-barcode-${row.id}`, module: "product", severity: "info", issueType: "Missing barcode", record, href: `/products/${row.id}`, action: "Add a barcode if scanning is used." });
  }
  for (const row of data.suppliers.filter(active)) {
    const record = `${row.supplier_code?.trim() || "No code"} — ${row.name || "Unnamed supplier"}`;
    if (!present(row.name)) issues.push({ id: `supplier-name-${row.id}`, module: "supplier", severity: "critical", issueType: "Missing supplier name", record, href: `/suppliers/${row.id}`, action: "Add a supplier display name." });
    if (![row.contact_person, row.phone, row.email].some(present)) issues.push({ id: `supplier-contact-${row.id}`, module: "supplier", severity: "warning", issueType: "Missing supplier contact", record, href: `/suppliers/${row.id}`, action: "Add a contact person, phone, or email." });
  }
  for (const row of data.locations.filter(active)) {
    if (!row.branch_id) issues.push({ id: `location-branch-${row.id}`, module: "location", severity: "warning", issueType: "No branch assignment", record: `${row.location_code} — ${row.location_name}`, href: `/locations/${row.id}`, action: "Assign a usable branch or confirm this is a company-level location." });
  }
  for (const [rows, module, references, href] of [[data.items, "item", itemReferences, "/items"], [data.products, "product", productReferences, "/products"], [data.suppliers, "supplier", supplierReferences, "/suppliers"]] as const) {
    for (const row of rows.filter((entry) => !active(entry))) {
      const count = references.get(row.id) ?? 0;
      if (count) issues.push({ id: `inactive-reference-${module}-${row.id}`, module, severity: "warning", issueType: "Inactive but referenced", record: `${("item_code" in row ? row.item_code : "product_code" in row ? row.product_code : row.supplier_code ?? "No code")} — ${"item_name" in row ? row.item_name : "product_name" in row ? row.product_name : row.name}`, href: `${href}/${row.id}`, action: `Review ${count} existing operational reference(s) before changing this master record.` });
    }
  }

  const summary = { total: issues.length, critical: issues.filter((issue) => issue.severity === "critical").length, warning: issues.filter((issue) => issue.severity === "warning").length, info: issues.filter((issue) => issue.severity === "info").length };
  const filtered = issues.filter((issue) => (!filters.severity || filters.severity === "all" || issue.severity === filters.severity) && (!filters.module || filters.module === "all" || issue.module === filters.module));
  return { issues: filtered, summary };
}
