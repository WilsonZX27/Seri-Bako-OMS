"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type DateInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

function normalizeDateValue(value: React.InputHTMLAttributes<HTMLInputElement>["value"] | React.InputHTMLAttributes<HTMLInputElement>["defaultValue"]) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function formatDateDisplay(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, defaultValue, value, onChange, disabled, ...props }, ref) => {
    const localRef = React.useRef<HTMLInputElement | null>(null);
    const controlled = value !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() => normalizeDateValue(defaultValue));
    const displayedValue = controlled ? normalizeDateValue(value) : uncontrolledValue;

    React.useEffect(() => {
      if (!controlled) setUncontrolledValue(normalizeDateValue(defaultValue));
    }, [controlled, defaultValue]);

    return (
      <div
        className={cn(
          "relative flex h-[var(--sb-control-height)] min-h-[var(--sb-control-height)] w-full min-w-0 max-w-full items-center rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white px-2.5 py-1.5 text-sm text-[var(--sb-text)] transition-colors focus-within:ring-2 focus-within:ring-[var(--sb-green-700)] focus-within:ring-offset-1 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-[var(--sb-surface-muted)] has-[:disabled]:opacity-70 unified-list-date-control",
          className,
        )}
        onClick={() => {
          if (disabled) return;
          const picker = localRef.current as (HTMLInputElement & { showPicker?: () => void }) | null;
          picker?.focus();
          try { picker?.showPicker?.(); } catch { /* Browser may restrict programmatic picker opening. */ }
        }}
      >
        <span aria-hidden="true" className={cn("min-w-0 flex-1 truncate tabular-nums", !displayedValue && "text-[var(--sb-text-muted)]")}>
          {displayedValue ? formatDateDisplay(displayedValue) : "DD/MM/YYYY"}
        </span>
        <CalendarDays aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 text-[var(--sb-text-muted)]" />
        <input
          {...props}
          ref={(node) => {
            localRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          type="date"
          style={{ opacity: 0 }}
          value={controlled ? displayedValue : undefined}
          defaultValue={controlled ? undefined : displayedValue}
          disabled={disabled}
          lang="en-GB"
          onChange={(event) => {
            if (!controlled) setUncontrolledValue(event.target.value);
            onChange?.(event);
          }}
          className="absolute inset-0 h-full min-h-[var(--sb-control-height)] w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </div>
    );
  },
);
DateInput.displayName = "DateInput";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, lang, onKeyDown, onWheel, ...props }, ref) => {
    if (type === "date") return <DateInput ref={ref} className={className} lang={lang} {...props} />;

    return (
      <input
        type={type}
        lang={lang}
        className={cn(
          "flex h-[var(--sb-control-height)] min-h-[var(--sb-control-height)] w-full min-w-0 max-w-full rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white px-2.5 py-1.5 text-sm text-[var(--sb-text)] transition-colors placeholder:text-[var(--sb-text-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:bg-[var(--sb-surface-muted)] disabled:opacity-70 file:mr-3 file:rounded-[var(--sb-control-radius)] file:border-0 file:bg-[var(--sb-surface-muted)] file:px-3 file:py-1 file:text-[var(--sb-text)]",
          className,
        )}
        ref={ref}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (type === "number" && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
            event.preventDefault();
          }
        }}
        onWheel={(event) => {
          if (type === "number" && event.currentTarget === document.activeElement) {
            event.currentTarget.blur();
          }
          onWheel?.(event);
        }}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
