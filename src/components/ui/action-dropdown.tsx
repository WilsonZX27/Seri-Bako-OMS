"use client";

import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ActionDropdown({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLElement>("button, a")?.focus();
    function close() {
      setOpen(false);
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative inline-flex">
      <Button ref={triggerRef} type="button" variant="outline" size="icon" aria-label="Open actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <MoreHorizontal className="h-4 w-4" />
      </Button>
      {open ? (
        <div ref={menuRef} role="menu" className="sb-popover-surface absolute right-0 top-10 z-20 min-w-44 rounded-[2px] p-1" onClick={() => setOpen(false)}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
