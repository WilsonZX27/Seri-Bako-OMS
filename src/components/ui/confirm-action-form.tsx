"use client";

import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

export function ConfirmActionForm({ action, label, title, description, pendingLabel, mobilePrimary = false, formId }: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  title: string;
  description: string;
  pendingLabel: string;
  mobilePrimary?: boolean;
  formId?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return <div className="w-full" data-mobile-primary-action={mobilePrimary || undefined}>
    <Button ref={triggerRef} type="button" variant="success" className="w-full" onClick={() => setOpen(true)}>{label}</Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef} className="max-w-md">
        <h2 id={titleId} className="text-base font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <form action={formId ? undefined : action} className="mt-4 flex justify-end gap-2">
          <Button ref={cancelRef} type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <SubmitButton form={formId} formAction={formId ? action : undefined} variant="success" pendingLabel={pendingLabel}>{label}</SubmitButton>
        </form>
    </ModalShell>
  </div>;
}
