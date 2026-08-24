"use client";

import { useId, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

export function AttachmentRemoveAction({
  action,
  fileName,
}: {
  action: () => Promise<void>;
  fileName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <Button ref={triggerRef} type="button" variant="ghost" size="icon" className="h-8 w-8 text-[var(--sb-danger)]" onClick={() => setConfirming(true)} aria-label={`Remove ${fileName}`} title="Remove attachment"><Trash2 className="h-4 w-4" /></Button>
      <ModalShell open={confirming} onClose={() => setConfirming(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef} className="max-w-md">
        <h2 id={titleId} className="text-base font-semibold text-[var(--sb-danger)]">Remove attachment?</h2>
        <p className="mt-2 break-words text-sm text-muted-foreground">{fileName} will be archived from this document. The audit event remains available.</p>
        <div className="mt-4 flex justify-end gap-2"><Button ref={cancelRef} type="button" variant="outline" onClick={() => setConfirming(false)}>Keep file</Button><form action={action}><SubmitButton variant="destructive" pendingLabel="Removing...">Remove attachment</SubmitButton></form></div>
      </ModalShell>
    </>
  );
}
