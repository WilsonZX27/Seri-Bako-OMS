import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

const envFile = process.env.TEST_ENV_FILE || ".env.test.local";
function parseEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  // A literal `#` is valid in passwords and other opaque values. Treat it as
  // a comment marker only when it follows whitespace, matching the browser
  // server and Playwright config parsers.
  const commentMatch = value.match(/\s+#/);
  return (commentMatch?.index !== undefined ? value.slice(0, commentMatch.index) : value).trim();
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
const includeAnnotationFixture = process.argv.includes("--annotation-fixture") || process.env.E2E_ANNOTATION_FIXTURE === "1";
const accounts = [
  ["super_admin", "TEST_SUPER_ADMIN_EMAIL", "TEST_SUPER_ADMIN_PASSWORD"],
  ["people_operations", "TEST_PEOPLE_OPERATIONS_EMAIL", "TEST_PEOPLE_OPERATIONS_PASSWORD"],
  ["finance", "TEST_FINANCE_EMAIL", "TEST_FINANCE_PASSWORD"],
  ["manager", "TEST_MANAGER_EMAIL", "TEST_MANAGER_PASSWORD"],
  ["purchasing", "TEST_PURCHASING_EMAIL", "TEST_PURCHASING_PASSWORD"],
  ["chef", "TEST_CHEF_EMAIL", "TEST_CHEF_PASSWORD"],
  ["kitchen", "TEST_KITCHEN_EMAIL", "TEST_KITCHEN_PASSWORD"],
  ["outlet_supervisor", "TEST_OUTLET_SUPERVISOR_EMAIL", "TEST_OUTLET_SUPERVISOR_PASSWORD"],
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
  // Existing local fixtures may predate Chef. Full Preview UAT requires all
  // nine identities; local setup may add Chef later without rewriting them.
  if (roleCode === "chef" && !env[emailKey] && !env[passwordKey]) continue;
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
  const { data: authLinkedStaff, error: authLinkedStaffError } = await admin
    .from("staffs")
    .select("id")
    .eq("company_id", company.id)
    .eq("auth_user_id", authUser.id)
    .maybeSingle();
  if (authLinkedStaffError) throw authLinkedStaffError;
  const reusableStaff = existingStaff ?? authLinkedStaff;
  const staffWrite = reusableStaff
    ? await admin.from("staffs").update({ auth_user_id: authUser.id, staff_code: staffCode, full_name: `Local ${roleCode}`, email: env[emailKey], default_branch_id: branch.id, status: "active", invitation_status: "completed", must_change_password: false }).eq("id", reusableStaff.id).select("id").single()
    : await admin.from("staffs").insert({ company_id: company.id, auth_user_id: authUser.id, staff_code: staffCode, full_name: `Local ${roleCode}`, email: env[emailKey], default_branch_id: branch.id, status: "active", invitation_status: "completed", must_change_password: false }).select("id").single();
  if (staffWrite.error) throw staffWrite.error;
  const staff = staffWrite.data;
  staffByRole.set(roleCode, staff.id);
  await admin.from("staff_roles").delete().eq("staff_id", staff.id);
  await admin.from("staff_branches").delete().eq("staff_id", staff.id);
  await admin.from("staff_roles").insert({ staff_id: staff.id, role_id: role.id, branch_id: ["super_admin", "finance", "purchasing"].includes(roleCode) ? null : branch.id, is_primary: true, effective_from: new Date().toISOString().slice(0, 10) });
  await admin.from("staff_branches").insert({ staff_id: staff.id, branch_id: branch.id, access_level: "full", is_default: true });
}

if (includeAnnotationFixture) {
  const today = new Date().toISOString().slice(0, 10);
  const prId = "e2000000-0000-4000-8000-000000000001";
  const prDocumentId = "e2000000-0000-4000-8000-000000000002";
  const prLineId = "e2000000-0000-4000-8000-000000000003";
  const prCommentId = "e2000000-0000-4000-8000-000000000004";
  const outletRecordId = "e2000000-0000-4000-8000-000000000005";
  const outletRecordLineId = "e2000000-0000-4000-8000-000000000006";
  const rejectedPrId = "e2000000-0000-4000-8000-000000000007";
  const rejectedDocumentId = "e2000000-0000-4000-8000-000000000008";
  const rejectionActivityId = "e2000000-0000-4000-8000-000000000009";
  const zeroDenominatorRecordId = "e2000000-0000-4000-8000-000000000010";
  const zeroDenominatorLineId = "e2000000-0000-4000-8000-000000000011";
  const missingSentRecordId = "e2000000-0000-4000-8000-000000000012";
  const missingSentLineId = "e2000000-0000-4000-8000-000000000013";
  const requesterId = staffByRole.get("kitchen");
  const superAdminId = staffByRole.get("super_admin");
  const managerId = staffByRole.get("manager");
  if (!requesterId || !superAdminId || !managerId) throw new Error("Annotation fixture requires Kitchen, Manager, and Super Admin identities.");

  let { data: reviewItem, error: reviewItemError } = await admin.from("items").select("id").eq("company_id", company.id).eq("item_code", "E2E-PR-UNMAPPED").maybeSingle();
  if (reviewItemError) throw reviewItemError;
  if (!reviewItem) {
    const result = await admin.from("items").insert({
      company_id: company.id,
      item_code: "E2E-PR-UNMAPPED",
      item_name: "Unmapped Review Ingredient",
      category: "E2E fixture",
      purchase_unit: "KG",
      base_unit: "KG",
      cost: 3.5,
      safety_stock: 0,
    }).select("id").single();
    if (result.error) throw result.error;
    reviewItem = result.data;
  }
  const reviewMappingCleanup = await admin.from("branch_supplier_items").delete().eq("branch_id", branch.id).eq("item_id", reviewItem.id);
  if (reviewMappingCleanup.error) throw reviewMappingCleanup.error;

  let { data: reviewSupplier, error: reviewSupplierError } = await admin.from("suppliers").select("id").eq("company_id", company.id).eq("supplier_code", "E2E-PR-SUP").maybeSingle();
  if (reviewSupplierError) throw reviewSupplierError;
  if (!reviewSupplier) {
    const result = await admin.from("suppliers").insert({ company_id: company.id, supplier_code: "E2E-PR-SUP", name: "Local E2E Review Supplier", status: "active" }).select("id").single();
    if (result.error) throw result.error;
    reviewSupplier = result.data;
  }

  async function ensureMappedPrOption({ supplierCode, supplierName, itemCode, itemName, baseUnit, purchaseUom }) {
    let { data: supplier, error: supplierError } = await admin.from("suppliers").select("id").eq("company_id", company.id).eq("supplier_code", supplierCode).maybeSingle();
    if (supplierError) throw supplierError;
    if (!supplier) {
      const result = await admin.from("suppliers").insert({ company_id: company.id, supplier_code: supplierCode, name: supplierName, status: "active" }).select("id").single();
      if (result.error) throw result.error;
      supplier = result.data;
    }
    let { data: item, error: itemError } = await admin.from("items").select("id").eq("company_id", company.id).eq("item_code", itemCode).maybeSingle();
    if (itemError) throw itemError;
    if (!item) {
      const result = await admin.from("items").insert({ company_id: company.id, item_code: itemCode, item_name: itemName, category: "E2E fixture", purchase_unit: purchaseUom, base_unit: baseUnit, cost: 2.5, safety_stock: 0 }).select("id").single();
      if (result.error) throw result.error;
      item = result.data;
    }
    let { data: supplierItem, error: supplierItemError } = await admin.from("supplier_items").select("id").eq("company_id", company.id).eq("supplier_id", supplier.id).eq("item_id", item.id).is("deleted_at", null).maybeSingle();
    if (supplierItemError) throw supplierItemError;
    if (!supplierItem) {
      const result = await admin.from("supplier_items").insert({ company_id: company.id, supplier_id: supplier.id, item_id: item.id, supplier_item_code: `${supplierCode}-${itemCode}`, supplier_item_name: itemName, purchase_uom: purchaseUom, conversion_to_base_uom: purchaseUom === baseUnit ? 1 : 12, unit_cost: 2.5, moq: 1, lead_time_days: 1, status: "active" }).select("id").single();
      if (result.error) throw result.error;
      supplierItem = result.data;
    }
    const { data: branchMapping, error: branchMappingError } = await admin.from("branch_supplier_items").select("id").eq("branch_id", branch.id).eq("supplier_item_id", supplierItem.id).eq("item_id", item.id).is("deleted_at", null).maybeSingle();
    if (branchMappingError) throw branchMappingError;
    if (!branchMapping) {
      const result = await admin.from("branch_supplier_items").insert({ branch_id: branch.id, supplier_item_id: supplierItem.id, item_id: item.id, is_preferred: true, status: "active" });
      if (result.error) throw result.error;
    }
    return { supplier, item };
  }

  const alphaOption = await ensureMappedPrOption({ supplierCode: "E2E-SOURCE-A", supplierName: "Local E2E Source Alpha", itemCode: "E2E-SOURCE-A-ITEM", itemName: "Alpha Mapped Ingredient", baseUnit: "KG", purchaseUom: "CTN" });
  const alphaSupplierIdentity = await admin.from("suppliers").update({ supplier_group: "E2E Alpha" }).eq("id", alphaOption.supplier.id);
  if (alphaSupplierIdentity.error) throw alphaSupplierIdentity.error;
  await ensureMappedPrOption({ supplierCode: "E2E-SOURCE-B", supplierName: "Local E2E Source Beta", itemCode: "E2E-SOURCE-B-ITEM", itemName: "Beta Mapped Ingredient", baseUnit: "KG", purchaseUom: "BAG" });
  for (const suffix of ["1", "2", "10"]) {
    const itemCode = `E2E-NAT-${suffix}`;
    const { data: naturalItem, error: naturalItemError } = await admin.from("items").select("id").eq("company_id", company.id).eq("item_code", itemCode).maybeSingle();
    if (naturalItemError) throw naturalItemError;
    if (!naturalItem) {
      const result = await admin.from("items").insert({ company_id: company.id, item_code: itemCode, item_name: `Natural Sort ${suffix}`, category: "E2E fixture", purchase_unit: "PACK", base_unit: "PACK", cost: 1, safety_stock: 0 });
      if (result.error) throw result.error;
    }
  }
  for (const [index, suffix] of ["1", "2", "10"].entries()) {
    const requestId = `e2000000-0000-4000-8000-0000000000${20 + index}`;
    const requestWrite = await admin.from("purchase_requests").upsert({
      id: requestId,
      company_id: company.id,
      request_no: `E2E-SORT-PR/${suffix}`,
      requested_by: requesterId,
      request_date: today,
      priority: "normal",
      branch_id: branch.id,
      status: "draft",
      remarks: "Disposable natural PR number sort fixture.",
      deleted_at: null,
      created_by: requesterId,
      updated_by: requesterId,
    });
    if (requestWrite.error) throw requestWrite.error;
  }

  for (const [index, stage] of ["admin_review", "finance_review", "ready_to_convert"].entries()) {
    const stageRequestWrite = await admin.from("purchase_requests").upsert({
      id: `e2000000-0000-4000-8000-0000000000${30 + index}`,
      company_id: company.id,
      request_no: `E2E-PR-STAGE-${stage.toUpperCase()}`,
      requested_by: requesterId,
      request_date: today,
      priority: "normal",
      branch_id: branch.id,
      status: stage,
      remarks: "Disposable workflow-stage color fixture.",
      deleted_at: null,
      created_by: requesterId,
      updated_by: requesterId,
    });
    if (stageRequestWrite.error) throw stageRequestWrite.error;
  }

  const documentWrite = await admin.from("documents").upsert({
    id: prDocumentId,
    company_id: company.id,
    document_no: "E2E-PR-GUIDED-REVIEW",
    document_type: "purchase_request",
    title: "Disposable guided review fixture",
    status: "pending_approval",
    approval_status: "pending",
    current_step: "Manager Review",
    related_entity_type: "purchase_request",
    related_entity_id: prId,
    created_by: requesterId,
    updated_by: requesterId,
  });
  if (documentWrite.error) throw documentWrite.error;
  // The mutation UAT replaces this fixed line and records revisions. Reset the
  // disposable dependency first so repeated full-suite runs remain idempotent
  // without weakening the single-supplier database guard.
  const revisionCleanup = await admin.from("document_line_revisions").delete().eq("line_id", prLineId);
  if (revisionCleanup.error) throw revisionCleanup.error;
  const guidedLineCleanup = await admin.from("purchase_request_lines").delete().eq("id", prLineId);
  if (guidedLineCleanup.error) throw guidedLineCleanup.error;
  const requestWrite = await admin.from("purchase_requests").upsert({
    id: prId,
    company_id: company.id,
    document_id: prDocumentId,
    request_no: "E2E-PR-GUIDED-REVIEW",
    requested_by: requesterId,
    request_date: today,
    priority: "normal",
    branch_id: branch.id,
    assigned_supplier_id: alphaOption.supplier.id,
    status: "manager_review",
    remarks: "Disposable local guided-review and comments fixture.",
    deleted_at: null,
    created_by: requesterId,
    updated_by: requesterId,
  });
  if (requestWrite.error) throw requestWrite.error;
  const lineWrite = await admin.from("purchase_request_lines").upsert({
    id: prLineId,
    purchase_request_id: prId,
    item_id: reviewItem.id,
    qty: 2,
    uom: "KG",
    estimated_unit_cost: 3.5,
    // Keep the review line intentionally unmapped while anchoring its recovery
    // catalogue to a supplier that has a valid replacement item.
    suggested_supplier_id: alphaOption.supplier.id,
    reason: "Local guided-review validation fixture.",
  });
  if (lineWrite.error) throw lineWrite.error;
  const commentWrite = await admin.from("document_comments").upsert({
    id: prCommentId,
    document_id: prDocumentId,
    comment_text: "Disposable local comment used to verify the complete portrait rail.",
    created_by: superAdminId,
    deleted_at: null,
  });
  if (commentWrite.error) throw commentWrite.error;

  const rejectedDocumentWrite = await admin.from("documents").upsert({
    id: rejectedDocumentId,
    company_id: company.id,
    document_no: "E2E-PR-REJECTED",
    document_type: "purchase_request",
    title: "Disposable rejected request fixture",
    status: "rejected",
    approval_status: "rejected",
    current_step: "Manager Review",
    related_entity_type: "purchase_request",
    related_entity_id: rejectedPrId,
    created_by: requesterId,
    updated_by: managerId,
  });
  if (rejectedDocumentWrite.error) throw rejectedDocumentWrite.error;
  const rejectedRequestWrite = await admin.from("purchase_requests").upsert({
    id: rejectedPrId,
    company_id: company.id,
    document_id: rejectedDocumentId,
    request_no: "E2E-PR-REJECTED",
    requested_by: requesterId,
    request_date: today,
    priority: "normal",
    branch_id: branch.id,
    status: "rejected",
    remarks: "Disposable local rejected-request fixture.",
    deleted_at: null,
    created_by: requesterId,
    updated_by: managerId,
  });
  if (rejectedRequestWrite.error) throw rejectedRequestWrite.error;
  const rejectionActivityWrite = await admin.from("activity_logs").upsert({
    id: rejectionActivityId,
    company_id: company.id,
    entity_type: "document",
    entity_id: rejectedDocumentId,
    activity_type: "rejected",
    message: "Purchase request rejected: Confirm the requested quantity and attach the kitchen usage note.",
    metadata: { fixture: "annotation" },
    created_by: managerId,
  });
  if (rejectionActivityWrite.error) throw rejectionActivityWrite.error;

  let { data: outletBranch, error: outletBranchError } = await admin.from("branches").select("id").eq("company_id", company.id).eq("branch_code", "E2E-OUTLET").maybeSingle();
  if (outletBranchError) throw outletBranchError;
  if (!outletBranch) {
    const result = await admin.from("branches").insert({ company_id: company.id, branch_code: "E2E-OUTLET", branch_name: "Local E2E Outlet", branch_type: "outlet", status: "active" }).select("id").single();
    if (result.error) throw result.error;
    outletBranch = result.data;
  }
  // The disposable Outlet identity must be assigned to an outlet branch. The
  // common role loop runs before the annotation fixture creates E2E-OUTLET,
  // so repair that local-only assignment here for truthful Outlet UAT.
  const outletStaffId = staffByRole.get("outlet_staff");
  if (outletStaffId) {
    const outletStaffUpdate = await admin.from("staffs").update({ default_branch_id: outletBranch.id }).eq("id", outletStaffId);
    if (outletStaffUpdate.error) throw outletStaffUpdate.error;
    const outletRoleUpdate = await admin.from("staff_roles").update({ branch_id: outletBranch.id }).eq("staff_id", outletStaffId);
    if (outletRoleUpdate.error) throw outletRoleUpdate.error;
    const outletBranchCleanup = await admin.from("staff_branches").delete().eq("staff_id", outletStaffId);
    if (outletBranchCleanup.error) throw outletBranchCleanup.error;
    const outletBranchAssignment = await admin.from("staff_branches").insert({ staff_id: outletStaffId, branch_id: outletBranch.id, access_level: "full", is_default: true });
    if (outletBranchAssignment.error) throw outletBranchAssignment.error;
  }
  let { data: outletProduct, error: outletProductError } = await admin.from("products").select("id").eq("company_id", company.id).eq("product_code", "E2E-OUTLET-001").maybeSingle();
  if (outletProductError) throw outletProductError;
  if (!outletProduct) {
    const result = await admin.from("products").insert({ company_id: company.id, product_code: "E2E-OUTLET-001", product_name: "Local E2E Daily Product", category: "E2E fixture", selling_unit: "PACK", display_order: 1, status: "active" }).select("id").single();
    if (result.error) throw result.error;
    outletProduct = result.data;
  }
  const conflictingRecord = await admin.from("outlet_daily_records").select("id").eq("branch_id", outletBranch.id).eq("record_date", today).neq("id", outletRecordId).maybeSingle();
  if (conflictingRecord.error) throw conflictingRecord.error;
  if (conflictingRecord.data) {
    const cleanup = await admin.from("outlet_daily_records").delete().eq("id", conflictingRecord.data.id);
    if (cleanup.error) throw cleanup.error;
  }
  const outletRecordWrite = await admin.from("outlet_daily_records").upsert({
    id: outletRecordId,
    company_id: company.id,
    branch_id: outletBranch.id,
    record_date: today,
    status: "evening_completed",
    submitted_by: superAdminId,
    notes: "Disposable local completed trend fixture.",
    created_by: superAdminId,
    updated_by: superAdminId,
  });
  if (outletRecordWrite.error) throw outletRecordWrite.error;
  const outletLineWrite = await admin.from("outlet_daily_record_lines").upsert({
    id: outletRecordLineId,
    record_id: outletRecordId,
    product_id: outletProduct.id,
    qty_sent: 12,
    qty_sent_estimated: 12,
    qty_sent_confirmed: true,
    qty_sent_source: "authorized_confirmed",
    morning_received_qty: 10,
    morning_received_provided: true,
    evening_leftover_qty: 2,
    wastage_qty: 1,
    wastage_reason: "unsold",
    notes: "Disposable local completed trend line.",
  });
  if (outletLineWrite.error) throw outletLineWrite.error;

  const priorDate = new Date(`${today}T00:00:00Z`);
  priorDate.setUTCDate(priorDate.getUTCDate() - 1);
  const priorDateText = priorDate.toISOString().slice(0, 10);
  const zeroRecordWrite = await admin.from("outlet_daily_records").upsert({ id: zeroDenominatorRecordId, company_id: company.id, branch_id: outletBranch.id, record_date: priorDateText, status: "evening_completed", submitted_by: superAdminId, notes: "Disposable zero-denominator fixture.", created_by: superAdminId, updated_by: superAdminId });
  if (zeroRecordWrite.error) throw zeroRecordWrite.error;
  const zeroLineWrite = await admin.from("outlet_daily_record_lines").upsert({ id: zeroDenominatorLineId, record_id: zeroDenominatorRecordId, product_id: outletProduct.id, qty_sent: 1127, qty_sent_estimated: 1127, qty_sent_confirmed: true, qty_sent_source: "authorized_confirmed", morning_received_qty: 0, morning_received_provided: true, evening_leftover_qty: 0, wastage_qty: 0, wastage_reason: null, notes: "Confirmed zero received; percentage denominator is unavailable." });
  if (zeroLineWrite.error) throw zeroLineWrite.error;

  const missingDate = new Date(`${today}T00:00:00Z`);
  missingDate.setUTCDate(missingDate.getUTCDate() - 2);
  const missingDateText = missingDate.toISOString().slice(0, 10);
  const missingRecordWrite = await admin.from("outlet_daily_records").upsert({ id: missingSentRecordId, company_id: company.id, branch_id: outletBranch.id, record_date: missingDateText, status: "evening_completed", submitted_by: superAdminId, notes: "Disposable missing Qty Sent fixture.", created_by: superAdminId, updated_by: superAdminId });
  if (missingRecordWrite.error) throw missingRecordWrite.error;
  const missingLineWrite = await admin.from("outlet_daily_record_lines").upsert({ id: missingSentLineId, record_id: missingSentRecordId, product_id: outletProduct.id, qty_sent: 0, qty_sent_estimated: null, qty_sent_confirmed: false, qty_sent_source: "unavailable", morning_received_qty: 8, morning_received_provided: true, evening_leftover_qty: 1, wastage_qty: 0, wastage_reason: null, notes: "Qty Sent deliberately missing for role-filter UAT." });
  if (missingLineWrite.error) throw missingLineWrite.error;
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
  const fixturePrId = "e2000000-0000-4000-8000-000000000070";
  const fixturePrDocumentId = "e2000000-0000-4000-8000-000000000071";
  const fixturePoDocumentId = "e2000000-0000-4000-8000-000000000072";
  const fixtureGrnDocumentId = "e2000000-0000-4000-8000-000000000073";
  const fixtureInvoiceId = "e2000000-0000-4000-8000-000000000074";
  const fixtureInvoiceDocumentId = "e2000000-0000-4000-8000-000000000075";
  const fixturePrAttachmentId = "e2000000-0000-4000-8000-000000000076";
  const fixtureGrnAttachmentId = "e2000000-0000-4000-8000-000000000077";

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

  const fixtureDocuments = [
    { id: fixturePrDocumentId, document_no: "E2E-PR-INVOICE-CHAIN", document_type: "purchase_request", title: "Local procurement chain PR", status: "posted", approval_status: "approved", related_entity_type: "purchase_request", related_entity_id: fixturePrId },
    { id: fixturePoDocumentId, document_no: `DOC-${fixturePoNo}`, document_type: "purchase_order", title: "Local procurement chain PO", status: "posted", approval_status: "approved", related_entity_type: "purchase_order", related_entity_id: null },
    { id: fixtureGrnDocumentId, document_no: `DOC-${fixtureGrnNo}`, document_type: "goods_receiving", title: "Local procurement chain GRN", status: "posted", approval_status: "approved", related_entity_type: "goods_receiving", related_entity_id: null },
    { id: fixtureInvoiceDocumentId, document_no: "E2E-INV-CHAIN", document_type: "supplier_invoice", title: "Local procurement chain invoice", status: "posted", approval_status: "approved", related_entity_type: "supplier_invoice", related_entity_id: fixtureInvoiceId },
  ];
  for (const document of fixtureDocuments) {
    const result = await admin.from("documents").upsert({ ...document, company_id: company.id, created_by: staffByRole.get("purchasing"), updated_by: staffByRole.get("purchasing"), deleted_at: null });
    if (result.error) throw result.error;
  }
  const fixturePrWrite = await admin.from("purchase_requests").upsert({ id: fixturePrId, company_id: company.id, document_id: fixturePrDocumentId, request_no: "E2E-PR-INVOICE-CHAIN", requested_by: staffByRole.get("kitchen"), request_date: new Date().toISOString().slice(0, 10), priority: "normal", branch_id: branch.id, status: "converted_to_po", remarks: "Disposable linked procurement chain fixture.", deleted_at: null, created_by: staffByRole.get("kitchen"), updated_by: staffByRole.get("purchasing") });
  if (fixturePrWrite.error) throw fixturePrWrite.error;

  let { data: invoicePo, error: invoicePoError } = await admin.from("purchase_orders").select("id").eq("company_id", company.id).eq("po_no", fixturePoNo).maybeSingle();
  if (invoicePoError) throw invoicePoError;
  if (!invoicePo) {
    const result = await admin.from("purchase_orders").insert({ company_id: company.id, document_id: fixturePoDocumentId, branch_id: branch.id, purchase_request_id: fixturePrId, po_no: fixturePoNo, supplier_id: invoiceSupplier.id, status: "received", approval_status: "approved", remarks: "Disposable local Supplier Invoice UI fixture." }).select("id").single();
    if (result.error) throw result.error;
    invoicePo = result.data;
  }
  const invoicePoChainWrite = await admin.from("purchase_orders").update({ document_id: fixturePoDocumentId, purchase_request_id: fixturePrId, status: "received" }).eq("id", invoicePo.id);
  if (invoicePoChainWrite.error) throw invoicePoChainWrite.error;
  const poDocumentLink = await admin.from("documents").update({ related_entity_id: invoicePo.id }).eq("id", fixturePoDocumentId);
  if (poDocumentLink.error) throw poDocumentLink.error;

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
    const result = await admin.from("goods_receivings").insert({ company_id: company.id, document_id: fixtureGrnDocumentId, purchase_order_id: invoicePo.id, grn_no: fixtureGrnNo, supplier_id: invoiceSupplier.id, branch_id: branch.id, status: "posted", posted_at: new Date().toISOString(), remarks: "Disposable local Supplier Invoice UI fixture." }).select("id").single();
    if (result.error) throw result.error;
    invoiceGrn = result.data;
  }
  const invoiceGrnChainWrite = await admin.from("goods_receivings").update({ document_id: fixtureGrnDocumentId, status: "posted", posted_at: new Date().toISOString() }).eq("id", invoiceGrn.id);
  if (invoiceGrnChainWrite.error) throw invoiceGrnChainWrite.error;
  const grnDocumentLink = await admin.from("documents").update({ related_entity_id: invoiceGrn.id }).eq("id", fixtureGrnDocumentId);
  if (grnDocumentLink.error) throw grnDocumentLink.error;

  const invoiceWrite = await admin.from("supplier_invoices").upsert({ id: fixtureInvoiceId, company_id: company.id, document_id: fixtureInvoiceDocumentId, invoice_no: "E2E-INV-CHAIN", supplier_invoice_no: "SUP-E2E-INV-CHAIN", supplier_id: invoiceSupplier.id, purchase_order_id: invoicePo.id, goods_receiving_id: invoiceGrn.id, total_amount: 42.5, subtotal: 42.5, tax_amount: 0, amount_paid: 0, status: "open", payment_terms_days: 30, created_by: staffByRole.get("finance"), updated_by: staffByRole.get("finance"), deleted_at: null });
  if (invoiceWrite.error) throw invoiceWrite.error;
  const sharedAttachmentWrite = await admin.from("attachments").upsert([
    { id: fixturePrAttachmentId, company_id: company.id, entity_type: "document", entity_id: fixturePrDocumentId, file_name: "Request specification.pdf", file_type: "application/pdf", file_size: 512, storage_path: "e2e/procurement-chain/request-specification.pdf", status: "active", uploaded_by: staffByRole.get("kitchen"), created_by: staffByRole.get("kitchen"), updated_by: staffByRole.get("kitchen"), deleted_at: null },
    { id: fixtureGrnAttachmentId, company_id: company.id, entity_type: "document", entity_id: fixtureGrnDocumentId, file_name: "Delivery Order.pdf", file_type: "application/pdf", file_size: 512, storage_path: "e2e/procurement-chain/delivery-order.pdf", status: "active", uploaded_by: staffByRole.get("purchasing"), created_by: staffByRole.get("purchasing"), updated_by: staffByRole.get("purchasing"), deleted_at: null },
  ]);
  if (sharedAttachmentWrite.error) throw sharedAttachmentWrite.error;

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
    const result = await admin.from("goods_receiving_lines").insert({ goods_receiving_id: invoiceGrn.id, purchase_order_line_id: invoicePoLine.id, item_id: invoiceItem.id, ordered_qty: 10, pending_qty: 0, received_qty: 10, received_base_qty: 10, rejected_qty: 0, rejected_base_qty: 0, conversion_to_base_uom_snapshot: 1, conversion_source: "e2e_fixture", returned_qty: 0, uom: "KG", unit_cost: 4.25, remarks: "Disposable local Supplier Invoice UI fixture." });
    if (result.error) throw result.error;
  } else {
    const result = await admin.from("goods_receiving_lines").update({ received_qty: 10, received_base_qty: 10, rejected_qty: 0, rejected_base_qty: 0, conversion_to_base_uom_snapshot: 1, conversion_source: "e2e_fixture", returned_qty: 0 }).eq("id", currentGrnLine.id);
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

const fixtureLabels = [includeStockCountFixture ? "stock-count" : null, includeSupplierInvoiceFixture ? "supplier-invoice" : null, includeMutationWorkflowFixture ? "workflow-mutation" : null, includeAnnotationFixture ? "annotation" : null].filter(Boolean);
console.log(fixtureLabels.length
  ? `Created eight disposable local dashboard identities and local-only ${fixtureLabels.join(" + ")} fixtures.`
  : "Created eight disposable local dashboard identities without business records.");
