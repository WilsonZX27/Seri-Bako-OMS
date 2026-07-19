"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";

export function ConfirmActionForm({ action, label, title, description, pendingLabel, mobilePrimary = false }: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  title: string;
  description: string;
  pendingLabel: string;
  mobilePrimary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();
    const dialog = dialogRef.current;
    const trigger = triggerRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button, input, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") return setOpen(false);
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [open]);

  return <div className="w-full" data-mobile-primary-action={mobilePrimary || undefined}>
    <Button ref={triggerRef} type="button" variant="success" className="w-full" onClick={() => setOpen(true)}>{label}</Button>
    {open ? <div className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 h-full w-full bg-[var(--sb-green-950)]/55" onClick={() => setOpen(false)} aria-label={`Cancel ${label}`} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative w-full max-w-md border border-[var(--sb-border)] bg-white p-4 shadow-[0_6px_18px_rgb(6_44_31_/_0.12)]">
        <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <form action={action} className="mt-4 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton variant="success" pendingLabel={pendingLabel}>{label}</SubmitButton>
        </form>
      </div>
    </div> : null}
  </div>;
}
