import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared PR-style editable document row; callers retain their field contracts. */
export function RequestLineRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("grid min-w-0 gap-2 p-3 lg:gap-3", className)} />;
}

/** Column titles share the row tracks; callers decide which breakpoints show the header. */
export function RequestLineHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("grid min-w-0 gap-2 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface-subtle)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)] lg:gap-3", className)} />;
}
