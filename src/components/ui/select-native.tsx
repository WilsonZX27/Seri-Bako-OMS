import * as React from "react";
import { cn } from "@/lib/utils";

export function SelectNative({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-8 w-full rounded-[2px] border border-[var(--sb-border)] bg-white px-2.5 py-1 text-xs text-[var(--sb-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-300)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
