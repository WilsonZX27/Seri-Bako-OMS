"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { priorityClassName, priorityOptions, type ProcurementPriority } from "@/components/priority-badge";
import { cn } from "@/lib/utils";

export function UrgencySelect({ value, onValueChange, name = "priority" }: { value: ProcurementPriority; onValueChange: (value: ProcurementPriority) => void; name?: string }) {
  return (
    <Select.Root name={name} value={value} onValueChange={(next) => onValueChange(next as ProcurementPriority)}>
      <Select.Trigger className="flex h-[var(--sb-control-height)] w-full items-center justify-between rounded-[var(--sb-radius-control)] border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" aria-label="Urgency">
        <Select.Value>
          <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", priorityClassName(value))}>
            {priorityOptions.find((option) => option.value === value)?.label}
          </span>
        </Select.Value>
        <Select.Icon><ChevronDown className="h-4 w-4 text-muted-foreground" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content position="popper" sideOffset={4} collisionPadding={8} className="sb-popover-surface z-[var(--sb-z-dropdown)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-[var(--sb-panel-radius)] p-1 text-foreground">
          <Select.Viewport>
            {priorityOptions.map((option) => (
              <Select.Item key={option.value} value={option.value} className="relative flex min-h-8 cursor-default select-none items-center rounded-[var(--sb-control-radius)] px-8 py-1.5 text-sm outline-none focus:bg-[var(--sb-green-100)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
                <Select.ItemIndicator className="absolute left-2"><Check className="h-4 w-4" /></Select.ItemIndicator>
                <Select.ItemText>
                  <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold", priorityClassName(option.value))}>{option.label}</span>
                </Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
