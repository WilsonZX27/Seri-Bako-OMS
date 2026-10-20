"use client";
import {SelectControl} from "@/components/ui/select-control";
import {attendanceTimeOptions} from "@/lib/attendance/time";
const timeOptions = attendanceTimeOptions();
export function TimeSelect({
  label,
  value,
  onChange,
  portalContainer,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  portalContainer?: HTMLElement | null;
}) {
  return (
    <label className="grid gap-1 text-xs">
      <span>{label}</span>
      <SelectControl
        ariaLabel={label}
        value={value}
        onValueChange={onChange}
        options={timeOptions}
        className="tabular-nums"
        portalContainer={portalContainer}
      />
    </label>
  );
}
