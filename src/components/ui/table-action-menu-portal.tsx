"use client";

import { MoreHorizontal } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function TableActionMenuPortal({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const updatePosition = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const menuWidth = 160;
    setPosition({
      top: Math.min(rect.bottom + 4, Math.max(8, window.innerHeight - 180)),
      left: Math.min(rect.left, Math.max(8, window.innerWidth - menuWidth - 8)),
    });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const onViewportChange = () => updatePosition();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <span className={cn("inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[var(--sb-radius-control)] text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-green-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] xl:h-8 xl:w-8"
        onClick={() => setOpen((current) => !current)}
      >
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && position && typeof document !== "undefined" ? createPortal(
        <>
          <button type="button" className="fixed inset-0 z-[var(--sb-z-dropdown)] cursor-default" aria-label="Close actions" onClick={() => setOpen(false)} />
          <div role="menu" className="sb-popover-surface fixed z-[calc(var(--sb-z-dropdown)+1)] min-w-40 rounded-[var(--sb-panel-radius)] p-1" style={position} onClick={(event) => {
            if ((event.target as HTMLElement).closest("button, a")) setOpen(false);
          }}>
            {children}
          </div>
        </>,
        document.body,
      ) : null}
    </span>
  );
}
