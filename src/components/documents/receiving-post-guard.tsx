"use client";

import { PackageCheck } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";

export function ReceivingPostGuard({
  action,
  hasDeliveryOrder,
  attachmentForm,
  primaryAction = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hasDeliveryOrder: boolean;
  attachmentForm: ReactNode;
  primaryAction?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  if (hasDeliveryOrder) {
    return (
      <form action={action} className="w-full" data-mobile-primary-action={primaryAction || undefined}>
        <SubmitButton pendingLabel="Posting..." className="w-full justify-center">
          <PackageCheck className="h-4 w-4" aria-hidden="true" />Post Receiving to Stock
        </SubmitButton>
      </form>
    );
  }

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        className="w-full justify-center"
        onClick={() => setOpen(true)}
        data-mobile-primary-action={primaryAction || undefined}
      >
        <PackageCheck className="h-4 w-4" aria-hidden="true" />Post Receiving to Stock
      </Button>
      <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} className="max-w-md">
        <h2 id={titleId} className="text-base font-semibold">Delivery Order required</h2>
        <div className="mt-3">{attachmentForm}</div>
        <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-[0.08em] text-muted-foreground"><span className="h-px flex-1 bg-border" /><span>No DO available</span><span className="h-px flex-1 bg-border" /></div>
        <form action={action} className="space-y-2">
          <Textarea name="do_exception_reason" placeholder="Exception reason" required className="min-h-20 resize-none text-[13px]" />
          <SubmitButton pendingLabel="Posting..." className="w-full justify-center">
            <PackageCheck className="h-4 w-4" aria-hidden="true" />Post with exception
          </SubmitButton>
        </form>
      </ModalShell>
    </>
  );
}
