"use client";

import * as Select from "@radix-ui/react-select";
import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
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
}) {
  const [open, setOpen] = useState(false);
  // Keep the trigger value controlled after hydration. Radix can otherwise
  // render an empty trigger when a server-provided default value is only
  // available during the first render (most visible in the shared tablet
  // filter bar). Preserve the public controlled `value` contract while using
  // local state for the uncontrolled/defaultValue variant.
  const isControlled = value !== undefined;
  const fallbackValue = defaultValue ?? options[0]?.value;
  const [internalValue, setInternalValue] = useState(fallbackValue);
  const selectedValue = isControlled ? value : internalValue;
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label;

  useEffect(() => {
    if (!isControlled) setInternalValue(fallbackValue);
  }, [fallbackValue, isControlled]);

  useEffect(() => {
    const closeForMore = () => setOpen(false);
    document.addEventListener("sb:close-select-controls", closeForMore);
    return () => document.removeEventListener("sb:close-select-controls", closeForMore);
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) document.dispatchEvent(new CustomEvent("sb:close-filter-more"));
  };

  const handleValueChange = (nextValue: string) => {
    if (!isControlled) setInternalValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <Select.Root
      value={selectedValue}
      open={open}
      onOpenChange={handleOpenChange}
      name={name}
      onValueChange={handleValueChange}
      required={required}
      disabled={disabled}
    >
      <Select.Trigger
        id={id}
        data-select-control
        aria-label={ariaLabel}
        className={cn(
          "flex h-[var(--sb-control-height)] w-full min-w-0 items-center justify-between gap-2 rounded-[var(--sb-radius-control)] border border-input bg-background px-2.5 text-left text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      >
        <Select.Value placeholder={placeholder}>{selectedLabel}</Select.Value>
        <Select.Icon aria-hidden="true"><ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          collisionPadding={8}
          className="sb-popover-surface z-[var(--sb-z-dropdown)] max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--sb-radius-control)] text-foreground"
        >
          <Select.Viewport className="p-1">
            {options.map((option) => (
              <Select.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className="relative flex min-h-[var(--sb-control-height)] cursor-default select-none items-center rounded-md py-1.5 pl-7 pr-2 text-sm outline-none focus:bg-[var(--sb-green-100)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[state=checked]:font-medium"
              >
                <Select.ItemIndicator className="absolute left-2"><Check className="h-3.5 w-3.5" /></Select.ItemIndicator>
                <Select.ItemText>{option.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
