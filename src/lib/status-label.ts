const statusLabels: Record<string, string> = {
  admin_review: "Admin Review",
  awaiting_delivery: "Awaiting Delivery",
  cancelled: "Cancelled",
  closed: "Closed",
  converted: "Converted",
  draft: "Draft",
  in_review: "In Review",
  not_required: "Not Required",
  partial_received: "Partially Received",
  pending: "Pending",
  pending_approval: "Pending Approval",
  posted: "Posted",
  purchasing_review: "Purchasing Review",
  received: "Received",
  rejected: "Rejected",
  sent: "Sent",
  submitted: "Submitted",
};

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "-";
  const normalized = status.toLowerCase();
  return statusLabels[normalized] ?? normalized.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
