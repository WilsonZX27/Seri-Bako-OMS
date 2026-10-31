"use client";

import * as Select from "@radix-ui/react-select";
import { useEffect, useId, useMemo, useRef, useState, type AriaAttributes } from "react";
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
  onCreateOption,
  onCloseAutoFocus,
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
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  "aria-busy": ariaBusy,
  "data-pr-field": prField,
}: {
  id?: string;
  name?: string;
  value?: string | number;
  defaultValue?: string | number;
  onValueChange?: (value: string) => void;
  onCreateOption?: (label: string) => void;
  onCloseAutoFocus?: (event: Event) => void;
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
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
  "aria-busy"?: AriaAttributes["aria-busy"];
  "data-pr-field"?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const createOptionValue = `sb-create-option-${useId()}`;
  const emptyOptionValue = `sb-empty-option-${useId()}`;
  const [nativeDialogContainer, setNativeDialogContainer] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [insideDialog, setInsideDialog] = useState(false);
  const [query, setQuery] = useState("");
  const [resetRevision, setResetRevision] = useState(0);
  // Keep the trigger value controlled after hydration. Radix can otherwise
  // render an empty trigger when a server-provided default value is only
  // available during the first render (most visible in the shared tablet
  // filter bar). Preserve the public controlled `value` contract while using
  // local state for the uncontrolled/defaultValue variant.
  const isControlled = value !== undefined;
  const normalizedDefault = defaultValue === undefined ? undefined : String(defaultValue);
  const fallbackValue = startEmpty
    ? normalizedDefault
    : (normalizedDefault ?? options[0]?.value);
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const selectedValue = isControlled ? String(value) : internalValue;
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
    const form = triggerRef.current?.closest("form");
    const reset = () => queueMicrotask(() => {
      if (!isControlled) setInternalValue(fallbackValue);
      // Native reset also resets Radix's hidden select; remount it from the authoritative value.
      setResetRevision(current => current + 1);
    });
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [fallbackValue, isControlled]);

  useEffect(() => {
    const closeForMore = () => setOpen(false);
    document.addEventListener("sb:close-select-controls", closeForMore);
    return () =>
      document.removeEventListener("sb:close-select-controls", closeForMore);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setInsideDialog(Boolean(triggerRef.current?.closest('dialog, [role="dialog"]')));
      setNativeDialogContainer(triggerRef.current?.closest<HTMLElement>("dialog") ?? null);
    }
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
    if (nextOpen && !triggerRef.current?.closest(".sb-filter-more-panel"))
      document.dispatchEvent(new CustomEvent("sb:close-filter-more"));
  };

  const handleValueChange = (optionValue: string) => {
    if (typeof optionValue !== "string") return;
    // Ignore Radix native-select empty mount events when no selectable empty value exists.
    if (required && optionValue === "" && !options.some(option => option.value === "" && !option.disabled)) return;
    // Radix may emit an empty native-select change while a newly created option mounts.
    if (onCreateOption && required && optionValue === "") return;
    if (optionValue === createOptionValue) { if(query.trim())onCreateOption?.(query.trim()); return; }
    const nextValue = optionValue === emptyOptionValue ? "" : optionValue;
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
        <input type="hidden" name={name} value={submittedValue ?? ""} disabled={disabled} />
      ) : null}
      <Select.Root
        key={resetRevision}
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
          aria-invalid={ariaInvalid}
          aria-describedby={ariaDescribedBy}
          aria-busy={ariaBusy}
          data-pr-field={prField}
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
        <Select.Portal container={portalContainer ?? nativeDialogContainer}>
          <Select.Content
            onCloseAutoFocus={onCloseAutoFocus}
            position="popper"
            sideOffset={4}
            collisionPadding={8}
            className={cn("sb-popover-surface max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--sb-radius-control)] text-foreground", insideDialog ? "z-[calc(var(--sb-z-sheet)+2)]" : "z-[var(--sb-z-dropdown)]")}
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
                  value={option.value || emptyOptionValue}
                  disabled={option.disabled}
                  className="relative flex min-h-9 cursor-default select-none items-center rounded-md py-1.5 pl-7 pr-2 text-xs outline-none focus:bg-[var(--sb-green-100)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium"
                >
                  <Select.ItemIndicator className="absolute left-2">
                    <Check className="h-3.5 w-3.5" />
                  </Select.ItemIndicator>
                  <Select.ItemText>{option.label}</Select.ItemText>
                </Select.Item>
              ))}
              {onCreateOption && query.trim() && !options.some(option=>option.label.toLocaleLowerCase()===query.trim().toLocaleLowerCase()) ? <Select.Item value={createOptionValue} className="cursor-pointer rounded px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-accent"><Select.ItemText>Add “{query.trim()}” as a location…</Select.ItemText></Select.Item> : null}
              {!visibleOptions.length && !onCreateOption ? (
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
