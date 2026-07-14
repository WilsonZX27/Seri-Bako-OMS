import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-[var(--sb-control-height)] w-full min-w-0 max-w-full rounded-[2px] border border-[var(--sb-border)] bg-white px-3 py-2 text-base text-[var(--sb-text)] transition-colors placeholder:text-[var(--sb-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[var(--sb-surface-muted)] disabled:opacity-70 sm:px-2.5 sm:py-1 sm:text-xs",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
