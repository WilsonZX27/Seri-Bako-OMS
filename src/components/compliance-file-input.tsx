"use client";

import { type ReactNode, useId, useState } from "react";
import { Paperclip } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const COMPLIANCE_MAX_FILE_BYTES = 4 * 1024 * 1024;

const fileSize = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function ComplianceFileInput({ compact = false, action }: { compact?: boolean; action?: ReactNode }) {
  const inputId = useId();
  const [selected, setSelected] = useState<{ name: string; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  return <div className={cn("sb-file-picker grid min-w-0 gap-x-2 gap-y-1.5", action && "grid-cols-[minmax(0,1fr)_auto]")}>
    <input
      id={inputId}
      name="file"
      type="file"
      required
      accept=".pdf,.png,.jpg,.jpeg,.webp"
      className="sr-only"
      aria-describedby={`${inputId}-guidance${error ? ` ${inputId}-error` : ""}`}
      onChange={(event) => {
        const file = event.target.files?.[0] ?? null;
        setSelected(file ? { name: file.name, size: file.size } : null);
        if (file && file.size > COMPLIANCE_MAX_FILE_BYTES) {
          setError(`This file is ${fileSize(file.size)}. Compliance files must be 4 MB or smaller.`);
          event.target.value = "";
          return;
        }
        setError(null);
      }}
    />
    <label htmlFor={inputId} className={cn(buttonVariants({ size: compact ? "sm" : "default", variant: "outline" }), "min-w-0 cursor-pointer justify-start overflow-hidden")}>
      <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">{selected?.name ?? "Choose file"}</span>
      {selected && !error ? <span className="ml-auto shrink-0 text-[10px] opacity-75">{fileSize(selected.size)}</span> : null}
    </label>
    {action}
    <p id={`${inputId}-guidance`} className="col-span-full text-[10px] leading-4 text-muted-foreground">PDF, PNG, JPEG or WebP · maximum 4 MB.</p>
    {error ? <p id={`${inputId}-error`} role="alert" className="col-span-full text-xs font-medium text-[var(--sb-danger)]">{error}</p> : null}
  </div>;
}
