"use client";

import Link from "next/link";
import { Paperclip } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";

export function AttachmentRequiredAction({
  href,
  label,
  hasAttachment,
  canUpload,
  children,
}: {
  href: string;
  label: string;
  hasAttachment: boolean;
  canUpload: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (hasAttachment) setOpen(false);
  }, [hasAttachment]);

  if (hasAttachment) {
    return <Button asChild className="w-full justify-center"><Link href={href}>{label}</Link></Button>;
  }

  return (
    <>
      <Button ref={triggerRef} type="button" className="w-full justify-center" disabled={!canUpload} onClick={() => setOpen(true)}>
        <Paperclip className="h-4 w-4" aria-hidden="true" />
        {label}
      </Button>
      <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} className="max-w-md">
        <h2 id={titleId} className="text-base font-semibold">Attach the Delivery Order first</h2>
        <p className="mt-1 text-sm text-muted-foreground">Receiving must keep the supplier document with the purchase order. Upload it here, then continue to record the delivered quantities.</p>
        <div className="mt-4">{children}</div>
      </ModalShell>
    </>
  );
}
