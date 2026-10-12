"use client";

import { useEffect, useRef } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { containDialogTab, focusDialog } from "@/lib/dialog-focus";

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
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef?.current ?? (dialogRef.current?.contains(document.activeElement)
      ? returnFocusRef.current
      : document.activeElement instanceof HTMLElement ? document.activeElement : null);
    returnFocusRef.current = trigger;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    if (dialog) focusDialog(dialog, initialFocusRef?.current);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (dialog) containDialogTab(event, dialog);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      // Strict Mode replays effects while the dialog remains mounted. Do not
      // let that cleanup steal focus back after the next setup focused it.
      requestAnimationFrame(() => { if (!dialog?.isConnected) trigger?.focus(); });
    };
  }, [initialFocusRef, open, triggerRef]);

  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center p-4">
      <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={onClose} aria-label="Close dialog" />
      <div ref={dialogRef} tabIndex={-1} data-modal-shell role="dialog" aria-modal="true" aria-labelledby={titleId} className={cn("sb-popover-surface relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[var(--sb-panel-radius)] p-4", className)}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
