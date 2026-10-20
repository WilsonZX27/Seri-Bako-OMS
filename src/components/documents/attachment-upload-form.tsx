"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Paperclip, Upload } from "lucide-react";
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
  const [labelError, setLabelError] = useState<string | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <form action={formAction} className="grid min-w-0 gap-2" noValidate onSubmit={(event) => {
      const label = labelRef.current?.value.trim() ?? "";
      if (label.length >= 3) {
        setLabelError(null);
        return;
      }
      event.preventDefault();
      setLabelError(label ? "Use at least 3 characters." : "Attachment label is required.");
      labelRef.current?.focus();
    }}>
      <Field label="Attachment label" required error={labelError ?? undefined}>
        <Input ref={labelRef} name="file_name" defaultValue={defaultLabel} placeholder="Name this attachment" minLength={3} maxLength={180} required aria-invalid={Boolean(labelError)} onChange={() => labelError && setLabelError(null)} className={cn("w-full", labelError && "border-destructive ring-2 ring-destructive/20")} />
      </Field>
      <Field label="Attachment file" labelClassName="sr-only" className="sb-file-picker">
        <input
          id={inputId}
          name="file"
          type="file"
          required
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.docx,.xlsx"
          className="sr-only"
          aria-describedby={`${inputId}-guidance`}
          onChange={(event) => {
            const file = event.target.files?.[0];
            setFileName(file?.name ?? "");
            setFileError(file && file.size > 10 * 1024 * 1024 ? "Attachment must be 10 MB or smaller." : null);
            if (file && file.size > 10 * 1024 * 1024) event.target.value = "";
          }}
        />
        <div className="flex min-w-0 flex-wrap gap-2">
          <label htmlFor={inputId} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-0 flex-[1_1_9rem] cursor-pointer justify-start overflow-hidden") }><Paperclip className="h-4 w-4 shrink-0" /><span className="truncate">{fileName || "Add Attachment"}</span></label>
          <SubmitButton type="submit" pendingLabel="Uploading..." disabled={Boolean(fileError)} className="flex-[1_1_6rem] justify-center"><Upload className="h-4 w-4 shrink-0" aria-hidden="true" />{submitLabel}</SubmitButton>
        </div>
      </Field>
      <p id={`${inputId}-guidance`} className="break-words text-xs leading-4 text-[var(--sb-text-muted)]">Give the file a recognisable name. PDF, image, text, CSV, DOCX, or XLSX up to 10 MB.</p>
      {fileError || state.error ? <p role="alert" className="text-xs text-destructive">{fileError ?? state.error}</p> : null}
      {state.success ? <p role="status" className="text-xs text-success">{state.success}</p> : null}
    </form>
  );
}
