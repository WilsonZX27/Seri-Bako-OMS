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
  finance_review: "Finance Review",
  manager_review: "Manager Review",
  ready_to_convert: "Ready to Convert",
  sent_to_supplier: "Sent to Supplier",
  in_production: "In Production",
  qc_review: "QC Review",
  dispatched: "Dispatched",
  short: "Short",
  available: "Available",
  critical: "Critical",
  need_repair: "Need Repair",
  active: "Active",
  inactive: "Inactive",
  suspended: "Suspended",
};

export function formatStatusLabel(status: string | null | undefined) {
  if (!status) return "-";
  const normalized = status.toLowerCase();
  return statusLabels[normalized] ?? normalized.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}
