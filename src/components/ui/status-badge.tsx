import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/status-label";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant = ["approved", "posted", "completed", "ready", "ready_to_convert", "closed", "converted", "converted_to_po", "sent", "sent_to_supplier", "active", "available", "dispatched", "paid"].includes(normalized)
    ? "success"
    : ["rejected", "cancelled", "void", "critical", "short", "suspended", "inactive", "disabled", "archived"].includes(normalized)
      ? "danger"
      : ["pending", "submitted", "pending_approval", "in_review", "admin_review", "purchasing_review", "manager_review", "finance_review", "in_transit", "need_repair", "open", "partially_paid"].includes(normalized)
        ? "warning"
        : ["in_production", "qc_review"].includes(normalized)
          ? "default"
        : "secondary";
  return <Badge variant={variant}>{formatStatusLabel(status)}</Badge>;
}
