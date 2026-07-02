import { Badge } from "@/components/ui/badge";

export type ProcurementPriority = "low" | "normal" | "urgent" | "critical";

export function priorityVariant(priority?: string | null) {
  if (priority === "critical") return "danger";
  if (priority === "urgent") return "warning";
  if (priority === "low") return "secondary";
  return "default";
}

export function PriorityBadge({ priority }: { priority?: string | null }) {
  const value = (priority ?? "normal") as ProcurementPriority;
  return <Badge variant={priorityVariant(value)}>{value}</Badge>;
}
