import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const variant = ["approved", "posted", "closed", "converted", "sent", "active"].includes(normalized)
    ? "success"
    : ["rejected", "cancelled", "inactive", "archived"].includes(normalized)
      ? "danger"
      : ["pending", "pending_approval", "admin_review", "purchasing_review", "draft"].includes(normalized)
        ? "warning"
        : "secondary";
  return <Badge variant={variant}>{status.replaceAll("_", " ")}</Badge>;
}
