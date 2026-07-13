import * as React from "react";
import { cn } from "@/lib/utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        "min-h-16 w-full rounded-[2px] border border-[var(--sb-border)] bg-white px-2.5 py-2 text-xs text-[var(--sb-text)] placeholder:text-[var(--sb-text-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-300)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Textarea.displayName = "Textarea";

export { Textarea };
