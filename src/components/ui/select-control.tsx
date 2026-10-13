"use client";

import * as Select from "@radix-ui/react-select";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectControlOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SelectControl({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  placeholder = "Select an option",
  ariaLabel,
  required,
  disabled,
  className,
  searchable = false,
  searchPlaceholder = "Search options",
  startEmpty = false,
  emptyValue,
  portalContainer,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectControlOption[];
  placeholder?: string;
  ariaLabel: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  startEmpty?: boolean;
  emptyValue?: string;
  portalContainer?: HTMLElement | null;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // Keep the trigger value controlled after hydration. Radix can otherwise
  // render an empty trigger when a server-provided default value is only
  // available during the first render (most visible in the shared tablet
  // filter bar). Preserve the public controlled `value` contract while using
  // local state for the uncontrolled/defaultValue variant.
  const isControlled = value !== undefined;
  const fallbackValue = startEmpty
    ? defaultValue
    : (defaultValue ?? options[0]?.value);
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const selectedValue = isControlled ? value : internalValue;
  const selectedLabel = options.find(
    (option) => option.value === selectedValue,
  )?.label;
  const visibleOptions = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return needle
      ? options.filter((option) =>
          option.label.toLocaleLowerCase().includes(needle),
        )
      : options;
  }, [options, query]);

  useEffect(() => {
    if (!isControlled) setInternalValue(fallbackValue);
  }, [fallbackValue, isControlled]);

  useEffect(() => {
    const closeForMore = () => setOpen(false);
    document.addEventListener("sb:close-select-controls", closeForMore);
    return () =>
      document.removeEventListener("sb:close-select-controls", closeForMore);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
    if (nextOpen && !triggerRef.current?.closest(".sb-filter-more-panel"))
      document.dispatchEvent(new CustomEvent("sb:close-filter-more"));
  };

  const handleValueChange = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  const submittedValue =
    emptyValue !== undefined && selectedValue === emptyValue
      ? ""
      : selectedValue;

  return (
    <>
      {name && emptyValue !== undefined ? (
        <input type="hidden" name={name} value={submittedValue ?? ""} />
      ) : null}
      <Select.Root
        value={selectedValue}
        open={open}
        onOpenChange={handleOpenChange}
        name={emptyValue === undefined ? name : undefined}
        onValueChange={handleValueChange}
        required={required}
        disabled={disabled}
      >
        <Select.Trigger
          ref={triggerRef}
          id={id}
          data-select-control
          data-field-name={name}
          aria-label={ariaLabel}
          title={selectedLabel ?? placeholder}
          className={cn(
            "flex min-h-[var(--sb-control-height)] w-full min-w-0 touch-manipulation items-center justify-between gap-2 overflow-hidden whitespace-nowrap rounded-[var(--sb-radius-control)] border border-input bg-background px-2.5 text-left text-sm outline-none transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.99] focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span:first-child]:min-w-0 [&>span:first-child]:truncate",
            className,
          )}
        >
          <Select.Value placeholder={placeholder}>{selectedLabel}</Select.Value>
          <Select.Icon aria-hidden="true">
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal container={portalContainer}>
          <Select.Content
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            className="sb-popover-surface z-[var(--sb-z-dropdown)] max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--sb-radius-control)] text-foreground"
          >
            {searchable ? (
              <div className="border-b border-[var(--sb-border-soft)] p-2">
                <label className="relative block">
                  <span className="sr-only">{searchPlaceholder}</span>
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--sb-text-muted)]"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={(event) => event.stopPropagation()}
                    placeholder={searchPlaceholder}
                    className="h-9 w-full rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white pl-8 pr-2 text-xs outline-none placeholder:text-[var(--sb-text-muted)] focus:ring-2 focus:ring-[var(--sb-green-700)]"
                  />
                </label>
              </div>
            ) : null}
            <Select.Viewport className="p-1">
              {visibleOptions.map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="relative flex min-h-9 cursor-default select-none items-center rounded-md py-1.5 pl-7 pr-2 text-xs outline-none focus:bg-[var(--sb-green-100)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium"
                >
                  <Select.ItemIndicator className="absolute left-2">
                    <Check className="h-3.5 w-3.5" />
                  </Select.ItemIndicator>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
              {!visibleOptions.length ? (
                <p className="px-3 py-4 text-center text-xs text-[var(--sb-text-muted)]">
                  No matching options
                </p>
              ) : null}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </>
  );
}
