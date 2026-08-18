import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = process.env.TEST_ENV_FILE || ".env.test.local";
function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  const commentIndex = value.indexOf("#");
  return (commentIndex >= 0 ? value.slice(0, commentIndex) : value).trim();
}
const env = Object.fromEntries(fs.readFileSync(envFile, "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => {
  const index = line.indexOf("=");
  return [line.slice(0, index).trim(), parseEnvValue(line.slice(index + 1))];
}));
// This fixture deliberately avoids `supabase status`: recent Windows CLI builds
// may try to write a global telemetry file, making a deterministic local test
// suite fail before it touches the application. `.env.test.local` is the sole,
// explicit authority for this disposable local target. TEST_ENV_FILE may point
// at a local-only env file outside the worktree so secrets do not need to be
// copied into the repository.
const localUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!localUrl || !serviceRoleKey || !publishableKey) {
  throw new Error(`Local E2E fixture requires NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, and SUPABASE_SERVICE_ROLE_KEY in ${envFile}.`);
}
const localHostname = new URL(localUrl).hostname;
if (!["127.0.0.1", "localhost"].includes(localHostname) || process.env.RUN_TENANT_BOUNDARY_E2E !== "1") {
  throw new Error("Dashboard E2E fixtures are restricted to an explicitly enabled local Supabase stack.");
}
const admin = createClient(localUrl, serviceRoleKey, { auth: { persistSession: false } });
const authCheck = createClient(localUrl, publishableKey, { auth: { persistSession: false } });
const includeMutationWorkflowFixture = process.env.TEST_MUTATE_WORKFLOW === "true";
const includeStockCountFixture = process.argv.includes("--stock-count-fixture") || process.env.E2E_STOCK_COUNT_FIXTURE === "1" || includeMutationWorkflowFixture;
const includeSupplierInvoiceFixture = process.argv.includes("--supplier-invoice-fixture") || process.env.E2E_SUPPLIER_INVOICE_FIXTURE === "1" || includeMutationWorkflowFixture;
const accounts = [
  ["super_admin", "TEST_SUPER_ADMIN_EMAIL", "TEST_SUPER_ADMIN_PASSWORD"],
  ["finance", "TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD"],
  ["manager", "TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD"],
  ["purchasing", "TEST_PURCHASING_EMAIL", "TEST_PURCHASING_PASSWORD"],
  ["kitchen", "TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD"],
  ["outlet_staff", "TEST_OUTLET_EMAIL", "TEST_OUTLET_PASSWORD"],
];
const staffByRole = new Map();

const { data: company, error: companyError } = await admin.from("companies").select("id").limit(1).single();
if (companyError || !company) {
  throw new Error(`Local E2E fixture requires at least one company in the configured Supabase target (${envFile}).${companyError ? ` ${companyError.message}` : ""}`);
}
const { data: branch, error: branchError } = await admin.from("branches").select("id").eq("company_id", company.id).limit(1).single();
if (branchError || !branch) {
  throw new Error(`Local E2E fixture requires at least one active branch for the configured company (${envFile}).${branchError ? ` ${branchError.message}` : ""}`);
}
const { data: branchRows, error: branchRowsError } = await admin.from("branches").select("id, branch_code").eq("company_id", company.id).is("deleted_at", null);
if (branchRowsError) throw branchRowsError;
if ((branchRows ?? []).length < 2) {
  const { error: destinationBranchError } = await admin.from("branches").insert({ company_id: company.id, branch_code: "E2E-DST", branch_name: "Local E2E Destination", branch_type: "central_kitchen", status: "active" });
  if (destinationBranchError && destinationBranchError.code !== "23505") throw destinationBranchError;
}
const { data: transferSequence, error: transferSequenceError } = await admin.from("document_sequences").select("id").eq("company_id", company.id).eq("document_type", "stock_transfer").maybeSingle();
if (transferSequenceError) throw transferSequenceError;
if (!transferSequence) {
  const { error: createTransferSequenceError } = await admin.from("document_sequences").insert({ company_id: company.id, document_type: "stock_transfer", prefix: "ST", next_number: 1, padding: 5, reset_frequency: "yearly", status: "active" });
  if (createTransferSequenceError && createTransferSequenceError.code !== "23505") throw createTransferSequenceError;
}
const { data: wastageSequence, error: wastageSequenceError } = await admin.from("document_sequences").select("id").eq("company_id", company.id).eq("document_type", "stock_wastage").maybeSingle();
if (wastageSequenceError) throw wastageSequenceError;
if (!wastageSequence) {
  const { error: createWastageSequenceError } = await admin.from("document_sequences").insert({ company_id: company.id, document_type: "stock_wastage", prefix: "WST", next_number: 1, padding: 5, reset_frequency: "yearly", status: "active" });
  if (createWastageSequenceError && createWastageSequenceError.code !== "23505") throw createWastageSequenceError;
}
const { data: roles } = await admin.from("roles").select("id, role_code").eq("company_id", company.id).is("deleted_at", null);
const { data: authUsers, error: authUsersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (authUsersError) throw authUsersError;

for (const [roleCode, emailKey, passwordKey] of accounts) {
  if (!env[emailKey] || !env[passwordKey]) throw new Error(`Missing ${emailKey} or its password variable.`);
  const existingAuthUser = authUsers.users.find((user) => user.email?.toLowerCase() === env[emailKey].toLowerCase());
  const authResult = existingAuthUser
    ? await admin.auth.admin.updateUserById(existingAuthUser.id, { password: env[passwordKey], email_confirm: true })
    : await admin.auth.admin.createUser({ email: env[emailKey], password: env[passwordKey], email_confirm: true });
  if (authResult.error) throw authResult.error;
  const authUser = authResult.data.user;
  const signInCheck = await authCheck.auth.signInWithPassword({ email: env[emailKey], password: env[passwordKey] });
  if (signInCheck.error) throw new Error(`The disposable ${roleCode} identity could not authenticate: ${signInCheck.error.message}`);
  const role = roles.find((row) => row.role_code === roleCode);
  const staffCode = `E2E-${roleCode.toUpperCase().replace("_", "-")}`;
  // Preserve the stable Staff row because local workflow fixtures may refer to
  // it through audit FKs. Re-linking Auth is safe; deleting the Staff row is not.
  const { data: existingStaff, error: existingStaffError } = await admin
    .from("staffs")
    .select("id")
    .eq("company_id", company.id)
    .eq("staff_code", staffCode)
    .maybeSingle();
  if (existingStaffError) throw existingStaffError;
  const staffWrite = existingStaff
    ? await admin.from("staffs").update({ auth_user_id: authUser.id, full_name: `Local ${roleCode}`, email: env[emailKey], default_branch_id: branch.id, status: "active", invitation_status: "completed", must_change_password: false }).eq("id", existingStaff.id).select("id").single()
    : await admin.from("staffs").insert({ company_id: company.id, auth_user_id: authUser.id, staff_code: staffCode, full_name: `Local ${roleCode}`, email: env[emailKey], default_branch_id: branch.id, status: "active", invitation_status: "completed", must_change_password: false }).select("id").single();
  if (staffWrite.error) throw staffWrite.error;
  const staff = staffWrite.data;
  staffByRole.set(roleCode, staff.id);
  await admin.from("staff_roles").delete().eq("staff_id", staff.id);
  await admin.from("staff_branches").delete().eq("staff_id", staff.id);
  await admin.from("staff_roles").insert({ staff_id: staff.id, role_id: role.id, branch_id: ["super_admin", "finance", "purchasing"].includes(roleCode) ? null : branch.id, is_primary: true, effective_from: new Date().toISOString().slice(0, 10) });
  await admin.from("staff_branches").insert({ staff_id: staff.id, branch_id: branch.id, access_level: "full", is_default: true });
}

if (includeMutationWorkflowFixture) {
  const purchaseRequestId = "e1000000-0000-4000-8000-000000000001";
  const documentId = "e1000000-0000-4000-8000-000000000002";
  const requesterId = staffByRole.get("kitchen");
  if (!requesterId) throw new Error("Mutation fixture requires the Kitchen staff identity.");
  const documentWrite = await admin.from("documents").upsert({
    id: documentId,
    company_id: company.id,
    document_no: "E2E-PR-MANAGER-REJECT",
    document_type: "purchase_request",
    title: "Disposable manager rejection fixture",
    status: "pending_approval",
    approval_status: "pending",
    current_step: "Manager Review",
    related_entity_type: "purchase_request",
    related_entity_id: purchaseRequestId,
    created_by: requesterId,
    updated_by: requesterId,
  });
  if (documentWrite.error) throw documentWrite.error;
  const requestWrite = await admin.from("purchase_requests").upsert({
    id: purchaseRequestId,
    company_id: company.id,
    document_id: documentId,
    request_no: "E2E-PR-MANAGER-REJECT",
    requested_by: requesterId,
    request_date: new Date().toISOString().slice(0, 10),
    priority: "normal",
    branch_id: branch.id,
    status: "manager_review",
    remarks: "Disposable local Manager rejection mutation fixture.",
    deleted_at: null,
    created_by: requesterId,
    updated_by: requesterId,
  });
  if (requestWrite.error) throw requestWrite.error;
}

if (includeStockCountFixture) {
  const fixtureItems = [
    ["E2E-SC-001", "Dried Shrimp", 18.5],
    ["E2E-SC-002", "Premium Rice", 42],
    ["E2E-SC-003", "Soy Sauce", 8],
    ["E2E-SC-004", "Cooking Oil", 15],
    ["E2E-SC-005", "Paper Bowl", 120],
    ["E2E-SC-006", "Chili Paste", 6.5],
  ];
  const fixtureCodes = fixtureItems.map(([itemCode]) => itemCode);
  const { data: currentItems, error: currentItemsError } = await admin.from("items").select("id, item_code").eq("company_id", company.id).in("item_code", fixtureCodes);
  if (currentItemsError) throw currentItemsError;
  const currentCodes = new Set((currentItems ?? []).map((item) => item.item_code));
  const missingItems = fixtureItems.filter(([itemCode]) => !currentCodes.has(itemCode));
  const insertedItems = missingItems.length
    ? await admin.from("items").insert(missingItems.map(([item_code, item_name]) => ({
        company_id: company.id,
        item_code,
        item_name,
        category: "E2E fixture",
        purchase_unit: "KG",
        base_unit: "KG",
        cost: 1,
        safety_stock: 1,
      }))).select("id, item_code")
    : { data: [], error: null };
  if (insertedItems.error) throw insertedItems.error;
  const items = [...(currentItems ?? []), ...(insertedItems.data ?? [])];
  const itemByCode = new Map((items ?? []).map((item) => [item.item_code, item.id]));
  const { error: cleanupStockError } = await admin.from("stock_transactions").delete().eq("reference_type", "e2e_fixture");
  if (cleanupStockError) throw cleanupStockError;
  const { error: stockError } = await admin.from("stock_transactions").insert(fixtureItems.map(([item_code, _item_name, quantity], index) => ({
    transaction_no: `E2E-SC-OPEN-${String(index + 1).padStart(3, "0")}`,
    branch_id: branch.id,
    item_id: itemByCode.get(item_code),
    transaction_type: "opening_balance",
    quantity_in: quantity,
    quantity_out: 0,
    unit_cost: 1,
    total_cost: quantity,
    status: "posted",
    posted_at: new Date().toISOString(),
    remarks: "Disposable local stock-count visual fixture.",
    reference_type: "e2e_fixture",
  })));
  if (stockError) throw stockError;
}

if (includeSupplierInvoiceFixture) {
  const fixtureItemCode = "E2E-INV-001";
  const fixtureSupplierCode = "E2E-INV-SUP";
  const fixturePoNo = "E2E-PO-INVOICE-OPEN";
  const fixtureGrnNo = "E2E-GRN-INVOICE-OPEN";

  let { data: invoiceItem, error: invoiceItemError } = await admin.from("items").select("id").eq("company_id", company.id).eq("item_code", fixtureItemCode).maybeSingle();
  if (invoiceItemError) throw invoiceItemError;
  if (!invoiceItem) {
    const result = await admin.from("items").insert({ company_id: company.id, item_code: fixtureItemCode, item_name: "Invoice Matching Ingredient", category: "E2E fixture", purchase_unit: "KG", base_unit: "KG", cost: 4.25, safety_stock: 0 }).select("id").single();
    if (result.error) throw result.error;
    invoiceItem = result.data;
  }

  let { data: invoiceSupplier, error: invoiceSupplierError } = await admin.from("suppliers").select("id").eq("company_id", company.id).eq("supplier_code", fixtureSupplierCode).maybeSingle();
  if (invoiceSupplierError) throw invoiceSupplierError;
  if (!invoiceSupplier) {
    const result = await admin.from("suppliers").insert({ company_id: company.id, supplier_code: fixtureSupplierCode, name: "Local E2E Invoice Supplier", payment_terms_days: 30, status: "active" }).select("id").single();
    if (result.error) throw result.error;
    invoiceSupplier = result.data;
  }

  let { data: invoiceSupplierItem, error: invoiceSupplierItemError } = await admin.from("supplier_items").select("id").eq("company_id", company.id).eq("supplier_id", invoiceSupplier.id).eq("item_id", invoiceItem.id).is("deleted_at", null).maybeSingle();
  if (invoiceSupplierItemError) throw invoiceSupplierItemError;
  if (!invoiceSupplierItem) {
    const result = await admin.from("supplier_items").insert({ company_id: company.id, supplier_id: invoiceSupplier.id, item_id: invoiceItem.id, supplier_item_code: "E2E-INV-SUP-ITEM", supplier_item_name: "Invoice Matching Ingredient", purchase_uom: "KG", conversion_to_base_uom: 1, unit_cost: 4.25, moq: 1, lead_time_days: 1, status: "active" }).select("id").single();
    if (result.error) throw result.error;
    invoiceSupplierItem = result.data;
  }
  const { data: invoiceBranchMapping, error: invoiceBranchMappingError } = await admin.from("branch_supplier_items").select("id").eq("branch_id", branch.id).eq("supplier_item_id", invoiceSupplierItem.id).eq("item_id", invoiceItem.id).is("deleted_at", null).maybeSingle();
  if (invoiceBranchMappingError) throw invoiceBranchMappingError;
  if (!invoiceBranchMapping) {
    const result = await admin.from("branch_supplier_items").insert({ branch_id: branch.id, supplier_item_id: invoiceSupplierItem.id, item_id: invoiceItem.id, is_preferred: true, status: "active" });
    if (result.error) throw result.error;
  }

  let { data: invoicePo, error: invoicePoError } = await admin.from("purchase_orders").select("id").eq("company_id", company.id).eq("po_no", fixturePoNo).maybeSingle();
  if (invoicePoError) throw invoicePoError;
  if (!invoicePo) {
    const result = await admin.from("purchase_orders").insert({ company_id: company.id, branch_id: branch.id, po_no: fixturePoNo, supplier_id: invoiceSupplier.id, status: "received", approval_status: "approved", remarks: "Disposable local Supplier Invoice UI fixture." }).select("id").single();
    if (result.error) throw result.error;
    invoicePo = result.data;
  }

  let { data: invoicePoLine, error: invoicePoLineError } = await admin.from("purchase_order_lines").select("id").eq("purchase_order_id", invoicePo.id).eq("item_id", invoiceItem.id).maybeSingle();
  if (invoicePoLineError) throw invoicePoLineError;
  if (!invoicePoLine) {
    const result = await admin.from("purchase_order_lines").insert({ purchase_order_id: invoicePo.id, item_id: invoiceItem.id, qty_ordered: 10, qty_received: 10, uom: "KG", unit_price: 4.25 }).select("id").single();
    if (result.error) throw result.error;
    invoicePoLine = result.data;
  }

  let { data: invoiceGrn, error: invoiceGrnError } = await admin.from("goods_receivings").select("id").eq("company_id", company.id).eq("grn_no", fixtureGrnNo).maybeSingle();
  if (invoiceGrnError) throw invoiceGrnError;
  if (!invoiceGrn) {
    const result = await admin.from("goods_receivings").insert({ company_id: company.id, purchase_order_id: invoicePo.id, grn_no: fixtureGrnNo, supplier_id: invoiceSupplier.id, branch_id: branch.id, status: "posted", posted_at: new Date().toISOString(), remarks: "Disposable local Supplier Invoice UI fixture." }).select("id").single();
    if (result.error) throw result.error;
    invoiceGrn = result.data;
  }

  const { data: staleReturns, error: staleReturnsError } = await admin.from("purchase_returns").select("id, document_id").eq("goods_receiving_id", invoiceGrn.id);
  if (staleReturnsError) throw staleReturnsError;
  const staleReturnIds = (staleReturns ?? []).map((row) => row.id);
  const staleDocumentIds = (staleReturns ?? []).map((row) => row.document_id).filter(Boolean);
  if (staleReturnIds.length) {
    const staleMovements = await admin.from("stock_transactions").select("id").eq("reference_type", "purchase_return").in("reference_id", staleReturnIds);
    if (staleMovements.error) throw staleMovements.error;
    const staleMovementIds = (staleMovements.data ?? []).map((row) => row.id);
    const lineCleanup = await admin.from("purchase_return_lines").delete().in("purchase_return_id", staleReturnIds);
    if (lineCleanup.error) throw lineCleanup.error;
    if (staleMovementIds.length) {
      const movementLineCleanup = await admin.from("stock_transaction_lines").delete().in("stock_transaction_id", staleMovementIds);
      if (movementLineCleanup.error) throw movementLineCleanup.error;
      const movementCleanup = await admin.from("stock_transactions").delete().in("id", staleMovementIds);
      if (movementCleanup.error) throw movementCleanup.error;
    }
    const returnCleanup = await admin.from("purchase_returns").delete().in("id", staleReturnIds);
    if (returnCleanup.error) throw returnCleanup.error;
    if (staleDocumentIds.length) {
      const documentCleanup = await admin.from("documents").delete().in("id", staleDocumentIds);
      if (documentCleanup.error) throw documentCleanup.error;
    }
  }

  const { data: currentGrnLine, error: currentGrnLineError } = await admin.from("goods_receiving_lines").select("id").eq("goods_receiving_id", invoiceGrn.id).eq("item_id", invoiceItem.id).maybeSingle();
  if (currentGrnLineError) throw currentGrnLineError;
  if (!currentGrnLine) {
    const result = await admin.from("goods_receiving_lines").insert({ goods_receiving_id: invoiceGrn.id, purchase_order_line_id: invoicePoLine.id, item_id: invoiceItem.id, ordered_qty: 10, pending_qty: 0, received_qty: 10, rejected_qty: 0, returned_qty: 0, uom: "KG", unit_cost: 4.25, remarks: "Disposable local Supplier Invoice UI fixture." });
    if (result.error) throw result.error;
  } else {
    const result = await admin.from("goods_receiving_lines").update({ received_qty: 10, rejected_qty: 0, returned_qty: 0 }).eq("id", currentGrnLine.id);
    if (result.error) throw result.error;
  }
  const stockCleanup = await admin.from("stock_transactions").delete().eq("transaction_no", "E2E-GRN-INVOICE-STOCK");
  if (stockCleanup.error) throw stockCleanup.error;
  const stockWrite = await admin.from("stock_transactions").insert({
    transaction_no: "E2E-GRN-INVOICE-STOCK",
    branch_id: branch.id,
    item_id: invoiceItem.id,
    transaction_type: "purchase",
    quantity_in: 10,
    quantity_out: 0,
    unit_cost: 4.25,
    total_cost: 42.5,
    status: "posted",
    posted_at: new Date().toISOString(),
    remarks: "Disposable stock backing for the returnable GRN fixture.",
    reference_type: "e2e_fixture",
    reference_id: invoiceGrn.id,
  });
  if (stockWrite.error) throw stockWrite.error;
}

const fixtureLabels = [includeStockCountFixture ? "stock-count" : null, includeSupplierInvoiceFixture ? "supplier-invoice" : null, includeMutationWorkflowFixture ? "workflow-mutation" : null].filter(Boolean);
console.log(fixtureLabels.length
  ? `Created six disposable local dashboard identities and local-only ${fixtureLabels.join(" + ")} fixtures.`
  : "Created six disposable local dashboard identities without business records.");
