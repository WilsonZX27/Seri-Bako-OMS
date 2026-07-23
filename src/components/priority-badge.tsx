import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type ProcurementPriority = "low" | "normal" | "urgent" | "critical";

export const priorityOptions: { value: ProcurementPriority; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "urgent", label: "Urgent" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

export function priorityClassName(priority?: string | null) {
  if (priority === "critical") return "border-[var(--sb-danger-bg)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]";
  if (priority === "urgent") return "border-[var(--sb-warning-bg)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]";
  if (priority === "low") return "border-[var(--sb-success-bg)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]";
  return "border-[var(--sb-info-bg)] bg-[var(--sb-info-bg)] text-[var(--sb-info)]";
}

export function priorityVariant(priority?: string | null) {
  if (priority === "critical") return "danger";
  if (priority === "urgent") return "warning";
  if (priority === "low") return "success";
  return "default";
}

export function PriorityBadge({ priority }: { priority?: string | null }) {
  const value = (priority ?? "normal") as ProcurementPriority;
  const label = priorityOptions.find((option) => option.value === value)?.label ?? "Normal";
  return <Badge variant={priorityVariant(value)} className={cn("capitalize", priorityClassName(value))}>{label}</Badge>;
}
