import * as React from "react";
import { cn } from "@/lib/utils";

export function SelectNative({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-[var(--sb-control-height)] w-full min-w-0 max-w-full rounded-[2px] border border-[var(--sb-border)] bg-white px-2.5 py-1.5 text-sm text-[var(--sb-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[var(--sb-surface-muted)] disabled:opacity-70",
        className,
      )}
      {...props}
    />
  );
}
