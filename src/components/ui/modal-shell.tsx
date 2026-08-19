"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { cn } from "@/lib/utils";

export function ModalShell({
  open,
  onClose,
  titleId,
  triggerRef,
  initialFocusRef,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  triggerRef?: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef?.current;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    (initialFocusRef?.current ?? focusable()[0])?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [initialFocusRef, open, triggerRef]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center p-4">
      <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={onClose} aria-label="Close dialog" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("sb-popover-surface relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[var(--sb-panel-radius)] p-4", className)}>
        {children}
      </div>
    </div>
  );
}
