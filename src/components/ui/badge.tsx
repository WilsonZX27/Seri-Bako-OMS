import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "secondary" | "success" | "warning" | "danger";

const variants: Record<BadgeVariant, string> = {
  default: "border-[var(--sb-info-bg)] bg-[var(--sb-info-bg)] text-[var(--sb-info)]",
  secondary: "border-[var(--sb-neutral-bg)] bg-[var(--sb-neutral-bg)] text-[var(--sb-neutral-text)]",
  success: "border-[var(--sb-success-bg)] bg-[var(--sb-success-bg)] text-[var(--sb-success)]",
  warning: "border-[var(--sb-warning-bg)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]",
  danger: "border-[var(--sb-danger-bg)] bg-[var(--sb-danger-bg)] text-[var(--sb-danger)]",
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn("inline-flex max-w-full items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-none border px-2 py-0.5 text-[11px] font-medium", variants[variant], className)}
      {...props}
    />
  );
}
