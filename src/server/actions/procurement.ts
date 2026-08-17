"use server";

import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import type { PurchaseRequestStatus } from "@/lib/status-contracts";
import { createClient } from "@/lib/supabase/server";
import { purchaseOrderSchema, purchaseRequestSchema } from "@/lib/validations/procurement";
import { extractPurchaseRequestLineInputs } from "@/lib/procurement/purchase-request-lines";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { getCurrentProfile } from "@/server/queries/common";
import { logServerError } from "@/server/observability/logger";
import { z } from "zod";
import type { ApprovalStatus, PurchaseOrderStatus } from "@/types/database";
import { getCurrentUserScope } from "@/server/queries/notifications";
import { normalizeUom } from "@/lib/uom";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parsePurchaseRequestId(id: string) {
  return z.string().uuid("The purchase request identifier is invalid.").parse(id);
}

function parsePurchaseOrderId(id: string) {
  return z.string().uuid("The purchase order identifier is invalid.").parse(id);
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

async function requirePurchaseRequestWorkflowRole(expectedRole: "manager" | "purchasing" | "finance") {
  const profile = await getCurrentProfile();
  const roleCode = String(profile?.role_code ?? "").toLowerCase();
  if (roleCode !== expectedRole && roleCode !== "super_admin") {
    throw new Error(`Only the ${expectedRole} role may complete this workflow step.`);
  }
}

async function notifyNextPrRole(input: {
  pr: { id: string; request_no: string; branch_id: string | null; company_id: string | null };
  nextStatus: PurchaseRequestStatus;
}) {
  const roleCodesByStatus: Partial<Record<PurchaseRequestStatus, string[]>> = {
    manager_review: ["manager", "super_admin"],
    admin_review: ["purchasing", "super_admin"],
    finance_review: ["finance", "super_admin"],
    ready_to_convert: ["purchasing", "super_admin"],
  };
  const roleCodes = roleCodesByStatus[input.nextStatus] ?? [];
  if (!roleCodes.length) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, role_code")
    .in("role_code", roleCodes)
    .eq("status", "active");
  if (rolesError) {
    logServerError(rolesError, { source: "procurement.notifyNextPrRole.roles" });
    return;
  }

  const titleByStatus: Partial<Record<PurchaseRequestStatus, string>> = {
    manager_review: "PR Manager Review required",
    admin_review: "PR Purchasing Review required",
    finance_review: "PR Finance Review required",
    ready_to_convert: "PR ready to convert to PO",
  };
  const messageByStatus: Partial<Record<PurchaseRequestStatus, string>> = {
    manager_review: `${input.pr.request_no} is waiting for Manager Review.`,
    admin_review: `${input.pr.request_no} is waiting for Purchasing Review.`,
    finance_review: `${input.pr.request_no} is waiting for Finance Review.`,
    ready_to_convert: `${input.pr.request_no} is approved and ready to convert to PO.`,
  };

  const notifications = (roles ?? []).map((role) => ({
    company_id: input.pr.company_id,
    actor_user_id: user?.id ?? null,
    recipient_role_id: role.id,
    branch_id: input.pr.branch_id,
    title: titleByStatus[input.nextStatus] ?? "Purchase Request update",
    message: messageByStatus[input.nextStatus] ?? `${input.pr.request_no} has moved to the next workflow step.`,
    action_url: `/purchase-requests/${input.pr.id}`,
    priority: input.nextStatus === "finance_review" ? "critical" : "low",
    entity_type: "purchase_request",
    entity_id: input.pr.id,
  }));
  if (!notifications.length) return;
  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) logServerError(error, { source: "procurement.notifyNextPrRole.insert" });
}

async function ensureActorCanUsePurchaseRequestBranch(branchId: string | null) {
  if (!branchId) throw new Error("Could not verify branch scope for this purchase request.");

  const scope = await getCurrentUserScope();
  if (!scope) throw new Error("Could not verify branch scope for this purchase request.");
  if (scope.companyWideAccess) return;
  if (!scope.branchIds.includes(branchId)) {
    throw new Error("You can only create or submit purchase requests for branches assigned to you.");
  }
}

function extractPurchaseRequest(formData: FormData) {
  const { lines, unresolvedLines, lineBranchIds } = extractPurchaseRequestLineInputs(formData);
  const parsed = purchaseRequestSchema.parse({
    request_no: formData.get("request_no"),
    request_date: formData.get("request_date"),
    required_date: formData.get("required_date"),
    priority: formData.get("priority") ?? "normal",
    needed_by_date: formData.get("needed_by_date"),
    urgency_reason: formData.get("urgency_reason"),
    production_risk: formData.get("production_risk") === "on",
    branch_id: formData.get("branch_id"),
    remarks: formData.get("remarks"),
    lines,
    unresolved_lines: unresolvedLines,
  });
  return { ...parsed, lineBranchIds };
}

function extractPurchaseOrder(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const qtys = formData.getAll("line_qty_ordered").map(String);
  const received = formData.getAll("line_qty_received").map(String);
  const cancelled = formData.getAll("line_qty_cancelled").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const prices = formData.getAll("line_unit_price").map(String);
  return purchaseOrderSchema.parse({
    po_no: formData.get("po_no"),
    branch_id: formData.get("branch_id"),
    supplier_id: formData.get("supplier_id"),
    order_date: formData.get("order_date"),
    expected_delivery_date: formData.get("expected_delivery_date"),
    remarks: formData.get("remarks"),
    lines: itemIds
      .map((itemId, index) => ({
        item_id: itemId,
        qty_ordered: qtys[index],
        qty_received: received[index] ?? 0,
        qty_cancelled: cancelled[index] ?? 0,
        uom: uoms[index],
        unit_price: prices[index] ?? 0,
      }))
      .filter((line) => line.item_id),
  });
}

async function ensureBranchSupplierSelections(
  branchId: string,
  lines: Array<{ item_id: string; suggested_supplier_id?: string | null; uom?: string | null }>,
  requireAll: boolean,
) {
  const missing = lines.filter((line) => !line.suggested_supplier_id);
  if (requireAll && missing.length) throw new Error("Every item needs a supplier mapped to this branch before the request can continue.");
  const selected = lines.filter((line): line is { item_id: string; suggested_supplier_id: string; uom?: string | null } => Boolean(line.suggested_supplier_id));
  if (!selected.length) return;
  const supabase = await createClient();
  const itemIds = [...new Set(selected.map((line) => line.item_id))];
  const { data: mappings, error: mappingsError } = await supabase
    .from("branch_supplier_items")
    .select("supplier_item_id, item_id")
    .eq("branch_id", branchId)
    .in("item_id", itemIds)
    .eq("status", "active")
    .is("deleted_at", null);
  if (mappingsError) throw new Error(mappingsError.message);
  const relationshipIds = [...new Set((mappings ?? []).map((row) => row.supplier_item_id))];
  const { data: relationships, error: relationshipsError } = relationshipIds.length
    ? await supabase.from("supplier_items").select("id, item_id, supplier_id, purchase_uom").in("id", relationshipIds).eq("status", "active").is("deleted_at", null)
    : { data: [], error: null };
  if (relationshipsError) throw new Error(relationshipsError.message);
  const { data: itemDefaults, error: itemDefaultsError } = await supabase
    .from("items")
    .select("id, supplier_id, purchase_unit, base_unit")
    .in("id", itemIds)
    .eq("status", "active")
    .is("deleted_at", null);
  if (itemDefaultsError) throw new Error(itemDefaultsError.message);
  const valid = new Set((relationships ?? []).map((row) => `${row.item_id}|${row.supplier_id}|${normalizeUom(row.purchase_uom)}`));
  const mappedItemIds = new Set((mappings ?? []).map((row) => row.item_id));
  const itemDefaultById = new Map((itemDefaults ?? []).map((row) => [row.id, row]));
  const isValid = (line: { item_id: string; suggested_supplier_id: string; uom?: string | null }) => {
    const requested = `${line.item_id}|${line.suggested_supplier_id}|${normalizeUom(String(line.uom ?? ""))}`;
    if (valid.has(requested)) return true;
    if (mappedItemIds.has(line.item_id)) return false;
    const item = itemDefaultById.get(line.item_id);
    if (!item || item.supplier_id !== line.suggested_supplier_id) return false;
    return normalizeUom(String(item.purchase_unit ?? item.base_unit ?? "")) === normalizeUom(String(line.uom ?? ""));
  };
  if (selected.some((line) => !isValid(line))) {
    throw new Error("A selected supplier is not mapped to this branch, item, and unit of measure.");
  }
}

type PurchaseRequestPayload = ReturnType<typeof purchaseRequestSchema.parse> & { lineBranchIds?: string[] };

async function createPurchaseRequestAggregate(
  payload: PurchaseRequestPayload,
  profile: { company_id: string | null; id: string | null } | null,
  idempotencyKey: string,
  intent: "draft" | "submit",
) {
  const supabase = await createClient();
  const requestNo = await resolveDocumentNumber({
    companyId: profile?.company_id,
    documentType: "purchase_request",
    enteredNumber: payload.request_no,
  });
  const { data: created, error } = await supabase.rpc("create_purchase_request_atomic", {
    p_payload: { ...payload, request_no: requestNo, idempotency_key: idempotencyKey },
  });
  if (error) throw new Error(error.message);
  const data = created as { id: string; request_no: string; document_id: string };
  if (intent === "submit") {
    const submitted = await transitionPurchaseRequest(data.id, "submit");
    return { ...data, submitted: true, request_no: submitted.request_no };
  }
  return { ...data, submitted: false };
}

async function ensureActiveItems(itemIds: string[], branchId?: string | null, lineBranchIds?: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("id,status").in("id", itemIds);
  if (error) throw new Error(error.message);
  const active = new Set((data ?? []).filter((item) => item.status === "active").map((item) => item.id));
  const inactive = itemIds.filter((id) => !active.has(id));
  if (inactive.length) throw new Error("All selected items must be active.");
  if (!branchId) return;
  if (!lineBranchIds || lineBranchIds.length !== itemIds.length || lineBranchIds.some((lineBranchId) => lineBranchId !== branchId)) {
    throw new Error("All purchase request lines must belong to the selected branch.");
  }
}

async function createPurchaseOrderCreatedNotification(input: { poId: string; poNo: string; prNo: string; companyId: string | null; staffId: string | null }) {
  // Legacy linkage remains database-owned through rpc("link_purchase_request_document"); new aggregate creation uses atomic RPCs.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("notifications").insert({
    company_id: input.companyId,
    recipient_user_id: user?.id ?? null,
    recipient_staff_id: input.staffId,
    title: "Purchase Order created",
    message: `${input.poNo} created from ${input.prNo}.`,
    action_url: `/purchase-orders/${input.poId}`,
    priority: "low",
    entity_type: "purchase_order",
    entity_id: input.poId,
    actor_user_id: user?.id ?? null,
  });

  if (error) {
    logServerError(error, { source: "procurement.createPurchaseOrderNotification" });
  }
}

export async function createPurchaseRequest(formData: FormData) {
  const startedAt = performance.now();
  let checkpoint = startedAt;
  const timings: Record<string, number> = {};
  const mark = (phase: string) => {
    const now = performance.now();
    timings[phase] = Math.round(now - checkpoint);
    checkpoint = now;
  };
  await requirePermissionOrRedirect("purchase_request.create", "/purchase-requests/new");
  mark("authorization");
  try {
    if (isMockMode()) redirect("/purchase-requests");
    const idempotencyKey = z.uuid().parse(cleanText(formData.get("idempotency_key")));
    mark("idempotency");
    const payload = extractPurchaseRequest(formData);
    const intent = formData.get("intent") === "submit" ? "submit" : "draft";
    await ensureActorCanUsePurchaseRequestBranch(payload.branch_id);
    const [, profile] = await Promise.all([
      ensureActiveItems(payload.lines.map((line) => line.item_id), payload.branch_id, payload.lineBranchIds),
      identity(),
    ]);
    await ensureBranchSupplierSelections(payload.branch_id, payload.lines, false);
    mark("validation_and_references");
    const data = await createPurchaseRequestAggregate(payload, profile, idempotencyKey, intent);
    mark("header_insert");
    mark("document_lines_and_audit");
    revalidateWorkspaceState(["/purchase-requests"]);
    mark("revalidation");
    if (process.env.SB_PERF_LOG === "true") {
      console.info("[perf] createPurchaseRequest", { ...timings, total: Math.round(performance.now() - startedAt), id: data.id });
    }
    if (intent === "submit") safeRedirectWithMessage(`/purchase-requests/${data.id}`, "success", `${data.request_no} submitted to Manager Review. Manager has been notified.`);
    redirect(`/purchase-requests/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-requests/new", "error", formatActionError(error, "Could not create this purchase request."));
  }
}

const stockBasketLineSchema = z.object({
  item_id: z.string().uuid("The selected item is invalid."),
  qty: z.coerce.number().positive("Quantity must be more than 0").max(1_000_000, "Quantity is too large."),
  uom: z.string().trim().min(1, "UOM is required.").max(32, "UOM is too long."),
  estimated_unit_cost: z.coerce.number().min(0, "Estimated cost cannot be negative.").max(1_000_000_000, "Estimated cost is too large.").optional(),
});

const stockBasketGroupsSchema = z.array(z.object({
  supplier_id: z.string().uuid("The selected supplier is invalid."),
  lines: z.array(stockBasketLineSchema).min(1, "Each supplier requires at least one item.").max(100, "A supplier group is limited to 100 items."),
})).min(1, "Select at least one item for the purchase request.").max(20, "A stock basket is limited to 20 suppliers.").superRefine((groups, context) => {
  const lineCount = groups.reduce((total, group) => total + group.lines.length, 0);
  if (lineCount > 500) context.addIssue({ code: "custom", message: "A stock basket is limited to 500 items." });
});

function parseStockBasketGroups(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value : "";
  if (!raw || raw.length > 100_000) throw new Error("The selected stock basket is invalid.");
  try {
    return stockBasketGroupsSchema.parse(JSON.parse(raw));
  } catch {
    throw new Error("The selected stock basket is invalid.");
  }
}

export async function createPurchaseRequestsFromBasket(formData: FormData) {
  await requirePermissionOrRedirect("purchase_request.create", "/stock-balance");
  try {
    if (isMockMode()) redirect("/purchase-requests");
    const branchId = z.uuid().parse(cleanText(formData.get("branch_id")));
    await ensureActorCanUsePurchaseRequestBranch(branchId);
    const groups = parseStockBasketGroups(formData.get("supplier_groups"));
    const allLines = groups.flatMap((group) => group.lines.map((line) => ({ ...line, suggested_supplier_id: group.supplier_id, branch_id: branchId })));
    const [, profile] = await Promise.all([
      ensureActiveItems(allLines.map((line) => line.item_id), branchId, allLines.map(() => branchId)),
      identity(),
    ]);
    const created: Array<{ id: string; request_no: string }> = [];
    for (const group of groups) {
      const lines = group.lines.map((line) => ({
        item_id: line.item_id,
        qty: line.qty,
        uom: line.uom,
        estimated_unit_cost: line.estimated_unit_cost ?? 0,
        suggested_supplier_id: group.supplier_id,
        reason: "",
        remarks: "",
        branch_id: branchId,
      }));
      await ensureBranchSupplierSelections(branchId, lines, true);
      const payload = purchaseRequestSchema.parse({
        request_no: "",
        request_date: new Date().toISOString().slice(0, 10),
        required_date: "",
        priority: "normal",
        needed_by_date: "",
        urgency_reason: "",
        production_risk: false,
        branch_id: branchId,
        remarks: `Created from stock basket for ${group.supplier_id}.`,
        lines,
      });
      const result = await createPurchaseRequestAggregate(payload, profile, crypto.randomUUID(), "draft");
      created.push({ id: result.id, request_no: result.request_no });
    }
    revalidateWorkspaceState(["/purchase-requests", "/stock-balance"]);
    safeRedirectWithMessage("/purchase-requests", "success", `Created ${created.length} supplier-grouped draft PR${created.length === 1 ? "" : "s"}.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-balance", "error", formatActionError(error, "Could not create supplier-grouped purchase requests."));
  }
}

export async function updateDraftPurchaseRequest(id: string, formData: FormData) {
  try {
    if (isMockMode()) {
      redirect(`/purchase-requests/${id}`);
    }
    const requestId = parsePurchaseRequestId(id);
    await requirePermission("purchase_request.create");

    const payload = extractPurchaseRequest(formData);
    const supabase = await createClient();
    const { data: request, error: requestError } = await supabase
      .from("purchase_requests")
      .select("id, status, request_no, branch_id")
      .eq("id", requestId)
      .single();
    if (requestError) throw new Error(requestError.message);
    if (!request) throw new Error("Purchase request not found.");
    if (request.status !== "draft") throw new Error("Only draft purchase requests can be edited.");
    if (!request.branch_id || payload.branch_id !== request.branch_id) throw new Error("The purchase request branch cannot be changed while editing a draft.");
    await ensureActiveItems(payload.lines.map((line) => line.item_id), request.branch_id, payload.lineBranchIds);
    await ensureBranchSupplierSelections(request.branch_id, payload.lines, false);

    const { error: updateError } = await supabase.rpc("update_draft_purchase_request", {
      target_purchase_request_id: requestId,
      expected_updated_at: String(formData.get("expected_updated_at") ?? ""),
      submitted_branch_id: payload.branch_id,
      request_date_value: payload.request_date,
      required_date_value: cleanText(formData.get("required_date")),
      priority_value: payload.priority,
      needed_by_date_value: cleanText(formData.get("needed_by_date")),
      urgency_reason_value: payload.urgency_reason ?? null,
      production_risk_value: Boolean(payload.production_risk),
      remarks_value: payload.remarks ?? null,
      lines_value: {
        resolved: payload.lines.map((line, index) => ({ ...line, branch_id: payload.lineBranchIds[index] })),
        unresolved: payload.unresolved_lines,
      },
    });
    if (updateError) throw new Error(updateError.message);

    const requestNo = request.request_no;
    const message = `${requestNo} draft updated`;

    revalidateWorkspaceState(["/purchase-requests", `/purchase-requests/${requestId}`]);
    safeRedirectWithMessage(`/purchase-requests/${requestId}`, "success", message);
  } catch (error) {
    revalidateWorkspaceState([`/purchase-requests/${id}`]);
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not update this draft purchase request."));
  }
}

type PrTransitionAction = "submit" | "manager_approve" | "admin_approve" | "finance_approve" | "reject" | "cancel";
type PrTransitionResult = {
  id: string;
  request_no: string;
  company_id: string | null;
  branch_id: string | null;
  status: PurchaseRequestStatus;
  already_applied: boolean;
  split_requests?: Array<{
    id: string;
    request_no: string;
    company_id: string | null;
    branch_id: string | null;
    supplier_id: string;
    status: PurchaseRequestStatus;
  }>;
};

async function transitionPurchaseRequest(id: string, action: PrTransitionAction, remarks?: string | null) {
  const requestId = parsePurchaseRequestId(id);
  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase
    .from("purchase_requests")
    .select("id, branch_id, status")
    .eq("id", requestId)
    .is("deleted_at", null)
    .single();
  if (requestError) throw new Error(requestError.message);
  if (!request) throw new Error("Purchase request not found.");
  await ensureActorCanUsePurchaseRequestBranch(request.branch_id);
  const workflowRole = action === "manager_approve" || (action === "reject" && request.status === "manager_review")
    ? "manager"
    : action === "admin_approve" || (action === "reject" && request.status === "admin_review")
      ? "purchasing"
      : action === "finance_approve" || (action === "reject" && request.status === "finance_review")
        ? "finance"
        : null;
  if (workflowRole) await requirePurchaseRequestWorkflowRole(workflowRole);

  const { data, error } = await supabase.rpc("transition_purchase_request", {
    target_purchase_request_id: requestId,
    transition_action: action,
    transition_remarks: remarks ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as unknown as PrTransitionResult;
  if (!result?.id || !result.request_no || !result.status) throw new Error("Purchase request transition returned an invalid result.");
  if (!result.already_applied) {
    const nextRequests = result.split_requests?.length ? result.split_requests : [result];
    await Promise.all(nextRequests.map((pr) => notifyNextPrRole({ pr, nextStatus: pr.status })));
  }
  revalidateWorkspaceState(["/purchase-requests", `/purchase-requests/${requestId}`]);
  return result;
}

export async function submitPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "submit");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} submitted to Manager Review. Manager has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not submit this purchase request."));
  }
}

export async function managerApprovePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "manager_approve");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Manager Review completed. Purchasing has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not complete Manager Review."));
  }
}

export async function adminApprovePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "admin_approve");
    const splitCount = pr.split_requests?.length ?? 1;
    const message = splitCount > 1
      ? `${pr.request_no} split into ${splitCount} supplier-specific PRs. Finance has been notified for each request.`
      : `${pr.request_no} Purchasing Review completed. Finance has been notified.`;
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", message);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not complete Purchasing Review."));
  }
}

export async function resolvePurchaseRequestUnresolvedLine(id: string, formData: FormData) {
  try {
    if (isMockMode()) return;
    await requirePermission("pr.admin_review");
    const requestId = parsePurchaseRequestId(id);
    const unresolvedLineId = z.string().uuid("Unresolved line is required.").parse(formData.get("unresolved_line_id"));
    const itemId = z.string().uuid("Select an Item Master match.").parse(formData.get("item_id"));
    const supabase = await createClient();
    const { error } = await supabase.rpc("resolve_purchase_request_unresolved_line", {
      target_purchase_request_id: requestId,
      target_unresolved_line_id: unresolvedLineId,
      target_item_id: itemId,
    });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState([`/purchase-requests/${requestId}`]);
    safeRedirectWithMessage(`/purchase-requests/${requestId}`, "success", "Non-catalog line matched to Item Master. Supplier readiness has been recalculated.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not match this purchase request line."));
  }
}

export async function financeApprovePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "finance_approve");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Finance Review completed. Purchase request is ready to convert.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not approve this purchase request."));
  }
}

export async function rejectPurchaseRequest(id: string, formData: FormData) {
  try {
    const remarks = z.string().trim().min(1, "Rejection remarks are required.").max(1_000, "Rejection remarks must be 1,000 characters or fewer.").parse(cleanText(formData.get("remarks")) ?? "");
    if (isMockMode()) return;
    const updated = await transitionPurchaseRequest(id, "reject", remarks);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${updated.request_no} rejected. Requester has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not reject this purchase request."));
  }
}

export async function cancelPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const requestId = parsePurchaseRequestId(id);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_purchase_request_atomic", {
      target_purchase_request_id: requestId,
    });
    if (error) throw new Error(error.message);
    const pr = data as { request_no: string };
    revalidateWorkspaceState(["/purchase-requests", `/purchase-requests/${requestId}`]);
    safeRedirectWithMessage("/purchase-requests", "success", `${pr.request_no} cancelled and removed from active work.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not cancel this purchase request."));
  }
}

export async function createPurchaseOrder(formData: FormData) {
  await requirePermission("purchase_order.create");
  try {
    const payload = extractPurchaseOrder(formData);
    if (isMockMode()) redirect("/purchase-orders");
    await ensureActiveItems(payload.lines.map((line) => line.item_id));
    await ensureBranchSupplierSelections(payload.branch_id, payload.lines.map((line) => ({ item_id: line.item_id, uom: line.uom, suggested_supplier_id: payload.supplier_id })), true);
    const profile = await identity();
    const poNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "purchase_order",
      enteredNumber: payload.po_no,
    });
    const supabase = await createClient();
    const idempotencyKey = z.uuid().parse(cleanText(formData.get("idempotency_key")));
    const { data: created, error } = await supabase.rpc("create_purchase_order_atomic", {
      p_payload: { ...payload, po_no: poNo, idempotency_key: idempotencyKey },
    });
    if (error) throw new Error(error.message);
    const data = created as { id: string; po_no: string; document_id: string };
    revalidateWorkspaceState(["/purchase-orders"]);
    redirect(`/purchase-orders/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-orders/new", "error", formatActionError(error, "Could not create this purchase order."));
  }
}

async function updatePoStatus(id: string, status: PurchaseOrderStatus, approvalStatus: ApprovalStatus) {
  const purchaseOrderId = parsePurchaseOrderId(id);
  const supabase = await createClient();
  const action = status === "pending_approval"
    ? "submit"
    : status === "approved"
      ? "approve"
      : status === "sent"
        ? "send"
        : status === "closed"
          ? "close"
          : approvalStatus === "rejected" ? "reject" : "cancel";
  const { data, error } = await supabase.rpc("transition_purchase_order_atomic", {
    p_purchase_order_id: purchaseOrderId,
    p_action: action,
  });
  if (error) throw new Error(error.message);
  const order = data as { id: string; po_no: string; status: PurchaseOrderStatus; document_id: string | null };
  revalidateWorkspaceState(["/purchase-orders", `/purchase-orders/${purchaseOrderId}`]);
  return order;
}

export async function submitPurchaseOrder(id: string) {
  try {
    await requirePermission("po.submit");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "pending_approval", "pending");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} submitted for approval.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not submit this purchase order."));
  }
}

export async function approvePurchaseOrder(id: string) {
  try {
    await requirePermission("po.approve");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "approved", "approved");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} approved.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not approve this purchase order."));
  }
}

export async function rejectPurchaseOrder(id: string) {
  try {
    await requirePermission("po.approve");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "cancelled", "rejected");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} rejected.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not reject this purchase order."));
  }
}

export async function sendPurchaseOrder(id: string) {
  try {
    await requirePermission("po.send");
    if (isMockMode()) return;
    const purchaseOrderId = parsePurchaseOrderId(id);
    const supabase = await createClient();
    const { data, error } = await supabase.from("purchase_orders").select("approval_status,status,po_no").eq("id", purchaseOrderId).single();
    if (error) throw new Error(error.message);
    if (data.status === "sent") safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${data.po_no} has already been sent.`);
    if (data.approval_status !== "approved") throw new Error("Cannot send unapproved PO.");
    const order = await updatePoStatus(purchaseOrderId, "sent", "approved");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} sent to supplier.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not send this purchase order."));
  }
}

export async function cancelPurchaseOrder(id: string) {
  try {
    await requirePermission("purchase_order.cancel");
    if (isMockMode()) return;
    const purchaseOrderId = parsePurchaseOrderId(id);
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("cancel_purchase_order_atomic", {
      p_purchase_order_id: purchaseOrderId,
    });
    if (error) throw new Error(error.message);
    const order = data as { po_no: string };
    revalidateWorkspaceState(["/purchase-orders", `/purchase-orders/${purchaseOrderId}`]);
    safeRedirectWithMessage("/purchase-orders", "success", `${order.po_no} cancelled and removed from active work.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not cancel this purchase order."));
  }
}

export async function closePurchaseOrder(id: string) {
  try {
    await requirePermission("purchase_order.close");
    if (isMockMode()) return;
    const purchaseOrderId = parsePurchaseOrderId(id);
    const supabase = await createClient();
    const { data: purchaseOrder, error: orderError } = await supabase
      .from("purchase_orders")
      .select("status,approval_status,po_no")
      .eq("id", purchaseOrderId)
      .is("deleted_at", null)
      .single();
    if (orderError) throw new Error(orderError.message);
    if (!["partial_received", "received"].includes(purchaseOrder.status)) throw new Error("A purchase order can only be closed after goods have been received.");
    const { data: invoices, error: invoiceError } = await supabase
      .from("supplier_invoices")
      .select("id,status,document_id")
      .eq("purchase_order_id", purchaseOrderId)
      .is("deleted_at", null);
    if (invoiceError) throw new Error(invoiceError.message);
    if (!invoices?.length || invoices.some((invoice) => invoice.status !== "paid")) throw new Error("All matched supplier invoices must be fully paid before closing this purchase order.");
    for (const invoice of invoices) {
      if (!invoice.document_id) throw new Error("Every matched supplier invoice must have an audit document before closing this purchase order.");
      const { data: document, error: documentError } = await supabase.from("documents").select("current_step").eq("id", invoice.document_id).single();
      if (documentError) throw new Error(documentError.message);
      if (document.current_step !== "Audit Passed") throw new Error("Audit must pass before a purchase order can be closed.");
    }
    const order = await updatePoStatus(purchaseOrderId, "closed", "approved");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} closed.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not close this purchase order."));
  }
}

export async function convertPurchaseRequestToPurchaseOrder(id: string, formData: FormData) {
  try {
    if (isMockMode()) redirect("/purchase-orders/po-mock-001");
    await requirePermission("pr.convert_to_po");
    const requestId = parsePurchaseRequestId(id);
    const autocountPoNo = z.string().trim().min(1, "AutoCount PO Number is required.").max(160, "AutoCount PO Number must be 160 characters or fewer.").parse(cleanText(formData.get("autocount_po_no")) ?? "");
    const supabase = await createClient();
    const profile = await identity();
    const { data, error } = await supabase.rpc("convert_purchase_request_to_purchase_order", {
      target_purchase_request_id: requestId,
      target_po_no: autocountPoNo,
    });
    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (!result) throw new Error("Purchase order conversion returned no result.");
    if (!result.already_existed) {
      await createPurchaseOrderCreatedNotification({ poId: result.purchase_order_id, poNo: result.purchase_order_no, prNo: result.purchase_request_no, companyId: profile?.company_id ?? null, staffId: profile?.id ?? null });
    }

    revalidateWorkspaceState([`/purchase-requests/${requestId}`, "/purchase-orders"]);
    const message = result.already_existed
      ? `Purchase order ${result.purchase_order_no} is already linked to this PR.`
      : `Purchase order ${result.purchase_order_no} created from ${result.purchase_request_no}.`;
    safeRedirectWithMessage(`/purchase-orders/${result.purchase_order_id}`, "success", message);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not convert this purchase request."));
  }
}
