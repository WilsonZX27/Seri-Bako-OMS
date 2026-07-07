import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  default: "border-primary/15 bg-primary/10 text-primary",
  secondary: "border-[#F3F4F6] bg-[#F3F4F6] text-[#1F2937]",
  success: "border-[#D1FAE5] bg-[#D1FAE5] text-[#065F46]",
  warning: "border-[#FEF3C7] bg-[#FEF3C7] text-[#92400E]",
  danger: "border-[#FEE2E2] bg-[#FEE2E2] text-[#991B1B]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-medium", variants[variant], className)}
      {...props}
    />
  );
}
