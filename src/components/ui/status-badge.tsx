import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleX, FilePenLine, Landmark, PackageCheck, PackageOpen, Send, ShieldCheck, ShoppingCart } from "lucide-react";
import { formatStatusLabel } from "@/lib/status-label";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const normalized = status.toLowerCase();
  const workflowTone: Record<string, string> = {
    manager_review: "border-[#E8DCF7] bg-[#F3EDFA] text-[#684095]",
    admin_review: "border-[#D8E7FA] bg-[#EAF2FC] text-[#245A9C]",
    purchasing_review: "border-[#D8E7FA] bg-[#EAF2FC] text-[#245A9C]",
    finance_review: "border-[#F1E1B7] bg-[#FFF5DA] text-[#7A5500]",
    ready_to_convert: "border-[#CDE8E3] bg-[#E5F5F2] text-[#0B6B61]",
    awaiting_grn: "border-[#E7D8CB] bg-[#F5ECE5] text-[#71472C]",
    sent_to_supplier: "border-[#E7D8CB] bg-[#F5ECE5] text-[#71472C]",
    sent: "border-[#CDE8E3] bg-[#E5F5F2] text-[#0B6B61]",
    partial_received: "border-[#F1E1B7] bg-[#FFF5DA] text-[#7A5500]",
    received: "border-[#C7E7D7] bg-[#E5F5EC] text-[#176B45]",
    in_progress: "border-[#DDE4E0] bg-[#F1F4F2] text-[#52645B]",
    ready_to_post: "border-[#BFDCD3] bg-[#E1F3ED] text-[#075942]",
  };
  const stageClassName = workflowTone[normalized];
  const StatusIcon = normalized === "draft"
    ? FilePenLine
    : normalized === "manager_review"
    ? ShieldCheck
    : ["admin_review", "purchasing_review"].includes(normalized)
      ? ShoppingCart
      : normalized === "finance_review"
        ? Landmark
        : ["ready", "ready_to_convert", "ready_to_send_supplier", "sent_to_supplier", "sent"].includes(normalized)
          ? Send
          : normalized === "partial_received"
            ? PackageOpen
            : normalized === "received"
              ? PackageCheck
          : ["converted", "converted_to_po", "approved", "posted", "completed"].includes(normalized)
            ? CircleCheck
            : ["rejected", "cancelled"].includes(normalized)
              ? CircleX
              : null;
  const variant = stageClassName
    ? "secondary"
    : ["approved", "posted", "completed", "evening_completed", "ready", "closed", "converted", "converted_to_po", "sent", "active", "available", "dispatched", "paid"].includes(normalized)
    ? "success"
    : ["rejected", "cancelled", "void", "critical", "short", "suspended", "inactive", "disabled", "archived"].includes(normalized)
      ? "danger"
      : ["pending", "submitted", "pending_approval", "in_review", "admin_review", "purchasing_review", "manager_review", "finance_review", "in_transit", "need_repair", "open", "partially_paid"].includes(normalized)
        ? "warning"
        : ["in_production", "qc_review"].includes(normalized)
          ? "default"
        : "secondary";
  return <Badge variant={variant} data-status={normalized} data-status-icon={StatusIcon ? "true" : undefined} className={cn("gap-1.5", stageClassName, className)}>{StatusIcon ? <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}{formatStatusLabel(status)}</Badge>;
}
