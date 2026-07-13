import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-8 w-full rounded-[2px] border border-[var(--sb-border)] bg-white px-2.5 py-1 text-xs text-[var(--sb-text)] transition-colors placeholder:text-[var(--sb-text-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-300)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
