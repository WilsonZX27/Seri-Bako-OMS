import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CircleCheck, CircleX, FilePenLine, Landmark, PackageCheck, PackageOpen, Send, ShieldCheck, ShoppingCart } from "lucide-react";
import { formatStatusLabel } from "@/lib/status-label";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className, label }: { status: string; className?: string; label?: string }) {
  const normalized = status.toLowerCase();
  const workflowTone: Record<string, string> = {
    manager_review: "border-[#E8DCF7] bg-[#F3EDFA] text-[#684095]",
    manager_approval: "border-[#E1B85A] bg-[#FFF3D0] text-[#6F4700]",
    admin_review: "border-[#D8E7FA] bg-[#EAF2FC] text-[#245A9C]",
    purchasing_review: "border-[#D8E7FA] bg-[#EAF2FC] text-[#245A9C]",
    finance_review: "border-[#F1E1B7] bg-[#FFF5DA] text-[#7A5500]",
    ready_to_convert: "border-[#CDE8E3] bg-[#E5F5F2] text-[#0B6B61]",
    awaiting_grn: "border-[#E7D8CB] bg-[#F5ECE5] text-[#71472C]",
    sent_to_supplier: "border-[#E7D8CB] bg-[#F5ECE5] text-[#71472C]",
    sent: "border-[#BFDDE2] bg-[#E2F2F4] text-[#145D68]",
    partial_received: "border-[#F1E1B7] bg-[#FFF5DA] text-[#7A5500]",
    received: "border-[#075942] bg-[#075942] text-white",
    in_progress: "border-[#DDE4E0] bg-[#F1F4F2] text-[#52645B]",
    ready_to_post: "border-[#8FB8DC] bg-[#E7F1FA] text-[#174F7A]",
    posted: "border-[#075942] bg-[#075942] text-white",
    attention: "border-[#D88400] bg-[#FFF0C2] text-[#7A4300] ring-1 ring-[#D88400]/25",
  };
  const stageClassName = workflowTone[normalized];
  const StatusIcon = normalized === "draft"
    ? FilePenLine
    : ["manager_review", "manager_approval"].includes(normalized)
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
          : normalized === "attention"
            ? AlertTriangle
          : ["converted", "converted_to_po", "approved", "posted", "completed"].includes(normalized)
            ? CircleCheck
            : ["rejected", "cancelled"].includes(normalized)
              ? CircleX
              : null;
  const variant = normalized === "attention"
    ? "warning"
    : stageClassName
    ? "secondary"
    : ["approved", "posted", "completed", "evening_completed", "ready", "closed", "converted", "converted_to_po", "sent", "active", "available", "dispatched", "paid"].includes(normalized)
    ? "success"
    : ["rejected", "cancelled", "void", "critical", "short", "suspended", "inactive", "disabled", "employment_ended", "archived"].includes(normalized)
      ? "danger"
      : ["pending", "submitted", "pending_approval", "in_review", "admin_review", "purchasing_review", "manager_review", "manager_approval", "finance_review", "in_transit", "need_repair", "open", "partially_paid"].includes(normalized)
        ? "warning"
        : ["in_production", "qc_review"].includes(normalized)
          ? "default"
        : "secondary";
  const description = normalized === "ready_to_post" ? "All required values are present, but the daily record has not been posted yet." : normalized === "posted" ? "The daily record is finalised and posted." : normalized === "attention" ? "The record is posted but needs follow-up." : undefined;
  const visibleLabel = label ?? formatStatusLabel(status);
  return <Badge variant={variant} title={description} aria-label={description ? `${visibleLabel}. ${description}` : undefined} data-status={normalized} data-status-icon={StatusIcon ? "true" : undefined} className={cn("gap-1.5 min-w-min whitespace-normal overflow-visible text-left", stageClassName, className)}>{StatusIcon ? <StatusIcon className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}<span className="min-w-min break-normal">{visibleLabel}</span></Badge>;
}
