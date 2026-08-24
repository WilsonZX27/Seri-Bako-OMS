"use client";

import { useActionState, useId, useState } from "react";
import { Paperclip } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type UploadState = { error: string | null; success: string | null };

export function AttachmentUploadForm({
  action,
  defaultLabel,
  submitLabel = "Upload attachment",
}: {
  action: (state: UploadState, formData: FormData) => Promise<UploadState>;
  defaultLabel?: string;
  submitLabel?: string;
}) {
  const [state, formAction] = useActionState(action, { error: null, success: null });
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const inputId = useId();

  return (
    <form action={formAction} className="grid min-w-0 gap-2">
      <Field label="Attachment label">
        <Input name="file_name" defaultValue={defaultLabel} placeholder="Delivery order, invoice, photo" className="w-full" />
      </Field>
      <Field label="Attachment file" labelClassName="sr-only">
        <Input
          id={inputId}
          name="file"
          type="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? "");
            setFileError(file && file.size > 10 * 1024 * 1024 ? "Attachment must be 10 MB or smaller." : null);
            if (file && file.size > 10 * 1024 * 1024) event.target.value = "";
          }}
        />
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-2">
          <label htmlFor={inputId} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-0 cursor-pointer justify-start overflow-hidden") }><Paperclip className="h-4 w-4 shrink-0" /><span className="truncate">{fileName || "Add Attachment"}</span></label>
          <SubmitButton type="submit" pendingLabel="Uploading..." disabled={Boolean(fileError)} className="shrink-0 justify-center">{submitLabel}</SubmitButton>
        </div>
      </Field>
      <p className="break-words text-[11px] text-muted-foreground">PDF, image, text, CSV, DOCX, or XLSX up to 10 MB.</p>
      {fileError || state.error ? <p role="alert" className="text-xs text-destructive">{fileError ?? state.error}</p> : null}
      {state.success ? <p role="status" className="text-xs text-success">{state.success}</p> : null}
    </form>
  );
}
