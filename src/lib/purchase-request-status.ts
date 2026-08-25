import type { PurchaseRequestStatus } from "@/lib/status-contracts";

export const PURCHASE_REQUEST_WORKFLOW_STEPS = [
  "draft",
  "manager_review",
  "admin_review",
  "finance_review",
  "ready_to_convert",
  "converted_to_po",
] as const;

export type PurchaseRequestWorkflowStep = (typeof PURCHASE_REQUEST_WORKFLOW_STEPS)[number];

export const PR_WORKFLOW_STEP_LABELS: Record<PurchaseRequestWorkflowStep, string> = {
  draft: "Draft",
  manager_review: "Manager",
  admin_review: "Purchasing",
  finance_review: "Finance",
  ready_to_convert: "Ready",
  converted_to_po: "Converted",
};

export const PR_NEXT_STATUS_BY_ACTION = {
  submit_to_manager_review: "manager_review",
  manager_approve: "admin_review",
  admin_approve: "finance_review",
  finance_approve: "ready_to_convert",
  convert_to_po: "converted_to_po",
  reject: "rejected",
  return: "returned",
  cancel: "cancelled",
} as const satisfies Record<string, PurchaseRequestStatus>;

export function getPrWorkflowStep(status: string): PurchaseRequestWorkflowStep {
  return PURCHASE_REQUEST_WORKFLOW_STEPS.includes(status as PurchaseRequestWorkflowStep) ? (status as PurchaseRequestWorkflowStep) : "draft";
}

export function getPrWorkflowLabel(status: string) {
  if (status === "cancelled") return "Cancelled";
  if (status === "rejected") return "Rejected";
  if (status === "returned") return "Returned";
  return PR_WORKFLOW_STEP_LABELS[getPrWorkflowStep(status)] ?? status.replaceAll("_", " ");
}
