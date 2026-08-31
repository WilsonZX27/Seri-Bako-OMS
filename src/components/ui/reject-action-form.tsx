"use client";

import { CircleX } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export function RejectActionForm({
  action,
  label = "Reject request",
  pendingLabel = "Rejecting...",
  title = "Reject purchase request?",
  description = "Add a reason so the requester knows what to correct.",
  fieldLabel = "Rejection reason",
}: {
  action: (formData: FormData) => void | Promise<void>;
  label?: string;
  pendingLabel?: string;
  title?: string;
  description?: string;
  fieldLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const remarksRef = useRef<HTMLTextAreaElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <Button ref={triggerRef} type="button" variant="destructive" className="w-full justify-center" onClick={() => setOpen(true)}>
        <CircleX className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <ModalShell
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        triggerRef={triggerRef}
        initialFocusRef={remarksRef}
        className="max-w-md"
      >
        <header className="mb-4">
          <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-[var(--sb-danger)]">
            <CircleX className="h-4 w-4" aria-hidden="true" />
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </header>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor={`${titleId}-remarks`} className="text-sm font-medium">{fieldLabel}</label>
            <Textarea
              ref={remarksRef}
              id={`${titleId}-remarks`}
              name="remarks"
              required
              minLength={1}
              maxLength={1000}
              rows={4}
              placeholder="Explain what needs to be corrected"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button ref={cancelRef} type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <SubmitButton type="submit" variant="destructive" pendingLabel={pendingLabel} showOverlay overlayLabel={pendingLabel}>
              <CircleX className="h-4 w-4" aria-hidden="true" />
              {label}
            </SubmitButton>
          </div>
        </form>
      </ModalShell>
    </>
  );
}
