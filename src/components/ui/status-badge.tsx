import { Badge } from "@/components/ui/badge";
import { formatStatusLabel } from "@/lib/status-label";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant = ["approved", "posted", "completed", "ready", "closed", "converted", "sent", "active"].includes(normalized)
    ? "success"
    : ["rejected", "cancelled", "critical", "inactive", "archived"].includes(normalized)
      ? "danger"
      : ["pending", "pending_approval", "in_review", "admin_review", "purchasing_review"].includes(normalized)
        ? "warning"
        : "secondary";
  return <Badge variant={variant}>{formatStatusLabel(status)}</Badge>;
}
