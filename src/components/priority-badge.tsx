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
  if (priority === "critical") return "border-red-200 bg-red-50 text-red-800";
  if (priority === "urgent") return "border-pink-200 bg-pink-50 text-pink-800";
  if (priority === "low") return "border-emerald-200 bg-emerald-50 text-emerald-800";
  return "border-amber-200 bg-amber-50 text-amber-800";
}

export function priorityVariant(priority?: string | null) {
  if (priority === "critical") return "danger";
  if (priority === "urgent") return "warning";
  if (priority === "low") return "secondary";
  return "default";
}

export function PriorityBadge({ priority }: { priority?: string | null }) {
  const value = (priority ?? "normal") as ProcurementPriority;
  const label = priorityOptions.find((option) => option.value === value)?.label ?? "Normal";
  return <Badge variant={priorityVariant(value)} className={cn("capitalize", priorityClassName(value))}>{label}</Badge>;
}
