"use client";

import { MoreHorizontal } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ActionDropdown({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex">
      <Button type="button" variant="outline" size="icon" aria-label="Open actions" onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="absolute right-0 top-10 z-20 min-w-44 rounded-[2px] border border-[var(--sb-border-soft)] bg-card p-1 shadow-lg" onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
