"use client";

import { useActionState, useId, useState } from "react";
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
      <Field label="Add attachment" required>
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
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor={inputId} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full cursor-pointer justify-center")}>Choose file</label>
          <p className="break-words text-xs text-muted-foreground">{fileName || "PDF, image, text, CSV, DOCX, or XLSX up to 10 MB."}</p>
        </div>
      </Field>
      {fileError || state.error ? <p role="alert" className="text-xs text-destructive">{fileError ?? state.error}</p> : null}
      {state.success ? <p role="status" className="text-xs text-success">{state.success}</p> : null}
      <SubmitButton type="submit" pendingLabel="Uploading..." className="w-full justify-center">{submitLabel}</SubmitButton>
    </form>
  );
}
