"use client";

import { useActionState, useId, useRef, useState } from "react";
import { Paperclip, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

type UploadState = { error: string | null; success: string | null };

export function ComplianceAttachmentUpload({ action }: { action: (state: UploadState, formData: FormData) => Promise<UploadState> }) {
  const [state, formAction] = useActionState(action, { error: null, success: null });
  const [selected, setSelected] = useState("");
  const labelRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  return <form action={formAction} className="grid gap-2">
    <label className="text-xs font-medium">Attachment label <span className="text-[var(--sb-danger)]">*</span><Input ref={labelRef} name="file_name" minLength={3} maxLength={180} required placeholder="Name this attachment" className="mt-1" /></label>
    <input id={inputId} name="file" type="file" required accept=".pdf,.png,.jpg,.jpeg,.webp" className="sr-only" onChange={(event) => setSelected(event.target.files?.[0]?.name ?? "")} />
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
      <label htmlFor={inputId} className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-w-0 cursor-pointer justify-start overflow-hidden")}><Paperclip className="h-4 w-4 shrink-0"/><span className="truncate">{selected || "Add Attachment"}</span></label>
      <SubmitButton pendingLabel="Uploading..." className="shrink-0"><Upload className="h-4 w-4"/>Upload</SubmitButton>
    </div>
    {state.error ? <p role="alert" className="text-xs text-[var(--sb-danger)]">{state.error}</p> : null}
    {state.success ? <p role="status" className="text-xs text-[var(--sb-success)]">{state.success}</p> : null}
  </form>;
}
