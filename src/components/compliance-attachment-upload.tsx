"use client";

import { useActionState, useRef } from "react";
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { ComplianceFileInput } from "@/components/compliance-file-input";

type UploadState = { error: string | null; success: string | null };

export function ComplianceAttachmentUpload({ action }: { action: (state: UploadState, formData: FormData) => Promise<UploadState> }) {
  const [state, formAction] = useActionState(action, { error: null, success: null });
  const labelRef = useRef<HTMLInputElement>(null);
  return <form action={formAction} className="grid gap-2">
    <label className="text-xs font-medium">Attachment label <span className="text-[var(--sb-danger)]">*</span><Input ref={labelRef} name="file_name" minLength={3} maxLength={180} required placeholder="Name this attachment" className="mt-1" /></label>
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
      <ComplianceFileInput />
      <SubmitButton pendingLabel="Uploading..." variant="outline" className="shrink-0"><Upload className="h-4 w-4"/>Upload</SubmitButton>
    </div>
    {state.error ? <p role="alert" className="text-xs text-[var(--sb-danger)]">{state.error}</p> : null}
    {state.success ? <p role="status" className="text-xs text-[var(--sb-success)]">{state.success}</p> : null}
  </form>;
}
