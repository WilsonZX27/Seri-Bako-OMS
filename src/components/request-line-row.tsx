import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared PR-style editable document row; callers retain their field contracts. */
export function RequestLineRow({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn("grid min-w-0 gap-2 p-3 lg:gap-3", className)} />;
}
