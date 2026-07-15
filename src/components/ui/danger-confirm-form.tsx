"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
}: DangerConfirmFormProps) {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const matches = !confirmWord || typed.trim().toUpperCase() === confirmWord;

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  return (
    <>
      <Button
        type="button"
        variant="destructive"
        onClick={() => setOpen(true)}
        className="w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          {buttonLabel}
        </span>
        <span className="text-xs text-red-500">Confirm</span>
      </Button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-red-200">
            <CardHeader>
              <CardTitle id={titleId} className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-4 w-4" />
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={action} className="space-y-4">
                <label className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
                  <input type="checkbox" className="mt-0.5 h-4 w-4" checked={checked} onChange={(event) => setChecked(event.target.checked)} />
                  <span>{checkboxLabel}</span>
                </label>
                {warning ? <p className="text-sm text-muted-foreground">{warning}</p> : null}
                {confirmWord ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Type {confirmWord} to continue.</p>
                    <Input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={confirmWord} />
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
                    className="border-[var(--sb-danger)] bg-[var(--sb-danger)] text-white hover:bg-red-700"
                  >
                    {buttonLabel}
                  </SubmitButton>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : null}
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
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  return (
    <>
      <Button type="button" variant="destructive" className="w-full" onClick={() => setOpen(true)}>{buttonLabel}</Button>
      {open ? (
        <div role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }} className="fixed inset-0 z-[var(--sb-z-dialog)] flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-lg border-red-200">
            <CardHeader>
              <CardTitle id={titleId} className="flex items-center gap-2 text-red-700"><AlertTriangle className="h-4 w-4" />{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="border border-[var(--sb-info)] bg-[var(--sb-info-bg)] p-3 text-sm text-[var(--sb-info)]">{recommendation}</p>
              <div className="flex justify-end"><Button ref={closeRef} type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button></div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  );
}
