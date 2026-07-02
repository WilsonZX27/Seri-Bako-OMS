"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";
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
  const [checked, setChecked] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = !confirmWord || typed.trim().toUpperCase() === confirmWord;

  return (
    <Card className="border-red-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
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
          <div className="flex justify-end">
            <SubmitButton
              type="submit"
              variant="destructive"
              pendingLabel={pendingLabel}
              showOverlay
              overlayLabel={pendingLabel}
              disabled={!checked || !matches}
            >
              {buttonLabel}
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
