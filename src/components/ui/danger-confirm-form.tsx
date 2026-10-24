"use client";

import { Notice } from "@/components/ui/system-states";
import { AlertTriangle, CirclePause, Trash2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

type DangerConfirmFormProps = {
  action: (formData: FormData) => Promise<void>;
  title: string;
  description: string;
  warning?: string;
  checkboxLabel: string;
  confirmWord?: string;
  buttonLabel: string;
  pendingLabel: string;
  triggerIcon?: "warning" | "delete" | "deactivate";
  triggerVariant?: "destructive" | "outline";
};

export function DangerConfirmForm({
  action,
  title,
  description,
  warning,
  checkboxLabel,
  confirmWord,
  buttonLabel,
  pendingLabel,
  triggerVariant = "destructive",
  triggerIcon = "warning",
}: DangerConfirmFormProps) {
  const TriggerIcon = triggerIcon === "delete" ? Trash2 : triggerIcon === "deactivate" ? CirclePause : AlertTriangle;
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const matches = !confirmWord || typed.trim().toUpperCase() === confirmWord;

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant={triggerVariant}
        onClick={() => setOpen(true)}
        className="w-full justify-start"
      >
        <span className="flex items-center gap-2">
          <TriggerIcon className="h-4 w-4" />
          {buttonLabel}
        </span>
      </Button>
      <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef}>
            <header className="mb-4">
              <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-[var(--sb-danger)]">
                <AlertTriangle className="h-4 w-4" />
                {title}
              </h2>
              <p className="mt-2 text-xs leading-4 text-muted-foreground">{description}</p>
            </header>
              <form action={action} className="space-y-4">
                <label className="flex items-start gap-2 rounded-lg border border-[var(--sb-border-soft)] bg-white px-3 py-2 text-xs leading-4">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
                  <span>{checkboxLabel}</span>
                </label>
                {warning ? <Notice tone="warning">{warning}</Notice> : null}
                {confirmWord ? (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Type {confirmWord} to continue.</p>
                    <Input name="confirmation" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={confirmWord} />
                  </div>
                ) : null}
                <div className="flex justify-end gap-2">
                  <Button ref={cancelRef} type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <SubmitButton
                    type="submit"
                    variant="destructive"
                    pendingLabel={pendingLabel}
                    showOverlay
                    overlayLabel={pendingLabel}
                    disabled={!checked || !matches}
                    className="border-[var(--sb-danger)] bg-[var(--sb-danger)] text-white hover:opacity-90"
                  >
                    {buttonLabel}
                  </SubmitButton>
                </div>
              </form>
      </ModalShell>
    </>
  );
}

export function BlockedDestructiveAction({
  buttonLabel,
  title,
  description,
  recommendation,
}: {
  buttonLabel: string;
  title: string;
  description: string;
  recommendation: string;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <Button ref={triggerRef} type="button" variant="destructive" className="w-full" onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={closeRef}>
            <header className="mb-4">
              <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-[var(--sb-danger)]"><AlertTriangle className="h-4 w-4" />{title}</h2>
              <p className="mt-2 text-xs leading-4 text-muted-foreground">{description}</p>
            </header>
            <div className="space-y-4">
              <Notice>{recommendation}</Notice>
              <div className="flex justify-end"><Button ref={closeRef} type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button></div>
            </div>
      </ModalShell>
    </>
  );
}
