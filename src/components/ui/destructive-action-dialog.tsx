"use client";

import { AlertTriangle } from "lucide-react";
import { type ReactNode, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

export function DestructiveActionDialog({ action, label, title, description, pendingLabel, children, compact = false }: {
  action: (formData: FormData) => void | Promise<void>;
  label: ReactNode;
  title: string;
  description: string;
  pendingLabel: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  return <>
    <Button ref={triggerRef} type="button" variant={compact ? "ghost" : "destructive"} size={compact ? "sm" : "default"} className={compact ? "w-full justify-start text-[var(--sb-danger)]" : "w-full justify-center"} onClick={() => setOpen(true)}>{label}</Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef} className="max-w-md">
      <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-[var(--sb-danger)]"><AlertTriangle className="h-4 w-4" />{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <form action={action} className="mt-4 space-y-4">{children}<div className="flex justify-end gap-2"><Button ref={cancelRef} type="button" variant="outline" onClick={() => setOpen(false)}>Keep record</Button><SubmitButton variant="destructive" pendingLabel={pendingLabel}>{label}</SubmitButton></div></form>
    </ModalShell>
  </>;
}
