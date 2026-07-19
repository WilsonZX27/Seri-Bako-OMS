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
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useEffect(() => { if (open) cancelRef.current?.focus(); }, [open]);

  return <div className="w-full" data-mobile-primary-action={mobilePrimary || undefined}>
    <Button type="button" variant="success" className="w-full" onClick={() => setOpen(true)}>{label}</Button>
    {open ? <div role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md border border-[var(--sb-border)] bg-white p-4 shadow-xl">
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
