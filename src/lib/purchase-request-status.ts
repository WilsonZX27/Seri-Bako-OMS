import type { PurchaseRequestStatus } from "@/types/database";

export const PURCHASE_REQUEST_WORKFLOW_STEPS = [
  "draft_pr",
  "manager_review",
  "admin_review",
  "finance_review",
  "ready_to_convert",
  "converted_to_po",
] as const;

export type PurchaseRequestWorkflowStep = (typeof PURCHASE_REQUEST_WORKFLOW_STEPS)[number];

export const PR_WORKFLOW_STEP_LABELS: Record<PurchaseRequestWorkflowStep, string> = {
  draft_pr: "Draft PR",
  manager_review: "Manager Review",
  admin_review: "Admin Review",
  finance_review: "Finance Review",
  ready_to_convert: "Ready to Convert",
  converted_to_po: "Converted to PO",
};

export const PR_WORKFLOW_TO_DB_STATUS: Record<PurchaseRequestWorkflowStep, PurchaseRequestStatus> = {
  draft_pr: "draft",
  manager_review: "admin_review",
  admin_review: "purchasing_review",
  finance_review: "pending_approval",
  ready_to_convert: "approved",
  converted_to_po: "converted",
};

export const PR_DB_STATUS_TO_WORKFLOW: Record<PurchaseRequestStatus, PurchaseRequestWorkflowStep> = {
  draft: "draft_pr",
  submitted: "manager_review",
  admin_review: "manager_review",
  purchasing_review: "admin_review",
  pending_approval: "finance_review",
  approved: "ready_to_convert",
  converted: "converted_to_po",
  rejected: "draft_pr",
  cancelled: "draft_pr",
};

export const PR_NEXT_STATUS_BY_ACTION = {
  submit_to_manager_review: PR_WORKFLOW_TO_DB_STATUS.manager_review,
  manager_approve: PR_WORKFLOW_TO_DB_STATUS.admin_review,
  admin_approve: PR_WORKFLOW_TO_DB_STATUS.finance_review,
  finance_approve: PR_WORKFLOW_TO_DB_STATUS.ready_to_convert,
  convert_to_po: PR_WORKFLOW_TO_DB_STATUS.converted_to_po,
  reject: "rejected",
  cancel: "cancelled",
} as const satisfies Record<string, PurchaseRequestStatus>;

export function getPrWorkflowStep(status: string): PurchaseRequestWorkflowStep {
  return PR_DB_STATUS_TO_WORKFLOW[status as PurchaseRequestStatus] ?? "draft_pr";
}

export function getPrWorkflowLabel(status: string) {
  return PR_WORKFLOW_STEP_LABELS[getPrWorkflowStep(status)];
}
