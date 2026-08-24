"use client";

import Link from "next/link";
import { type ReactNode, useId, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";

export function DocumentActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-2", className)}>{children}</div>;
}

export function DocumentActionForm({
  action,
  children,
  pendingLabel = "Saving...",
  mobilePrimary = false,
  ...buttonProps
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  pendingLabel?: string;
  mobilePrimary?: boolean;
} & ButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  if (buttonProps.variant === "destructive") {
    return <div className="w-full" data-mobile-primary-action={mobilePrimary || undefined}>
      <Button ref={triggerRef} type="button" variant="destructive" className={cn("w-full justify-center", buttonProps.className)} disabled={buttonProps.disabled} onClick={() => setConfirming(true)}>{children}</Button>
      <ModalShell open={confirming} onClose={() => setConfirming(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef} className="max-w-md">
        <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold text-[var(--sb-danger)]"><AlertTriangle className="h-4 w-4" />Confirm destructive action</h2>
        <p className="mt-2 text-sm text-muted-foreground">This action removes, cancels, rejects, or voids operational work. Review the record before continuing.</p>
        <form action={action} className="mt-4 flex justify-end gap-2"><Button ref={cancelRef} type="button" variant="outline" onClick={() => setConfirming(false)}>Keep record</Button><SubmitButton variant="destructive" pendingLabel={pendingLabel}>{children}</SubmitButton></form>
      </ModalShell>
    </div>;
  }
  return (
    <form action={action} className="w-full" data-mobile-primary-action={mobilePrimary || undefined}>
      <DocumentActionSubmitButton pendingLabel={pendingLabel} {...buttonProps}>
        {children}
      </DocumentActionSubmitButton>
    </form>
  );
}

export function DocumentActionLink({ href, children, ...buttonProps }: { href: string; children: ReactNode } & ButtonProps) {
  return (
    <Button asChild {...buttonProps} className={cn("w-full justify-center", buttonProps.className)}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

function DocumentActionSubmitButton({
  children,
  pendingLabel,
  ...buttonProps
}: {
  children: ReactNode;
  pendingLabel: string;
} & ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" {...buttonProps} className={cn("w-full justify-center", buttonProps.className)} disabled={pending || buttonProps.disabled} aria-busy={pending}>
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
