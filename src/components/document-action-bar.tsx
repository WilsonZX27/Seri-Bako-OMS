"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DocumentActionBar({ children }: { children: ReactNode }) {
  return <div className="grid gap-2" data-document-actions>{children}</div>;
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
  return (
    <form action={action} className="w-full" data-mobile-primary-action={mobilePrimary || undefined}>
      <DocumentActionSubmitButton pendingLabel={pendingLabel} {...buttonProps}>
        {children}
      </DocumentActionSubmitButton>
    </form>
  );
}

export function DocumentActionLink({ href, children, mobilePrimary = false, ...buttonProps }: { href: string; children: ReactNode; mobilePrimary?: boolean } & ButtonProps) {
  return (
    <Button asChild {...buttonProps} data-mobile-primary-action={mobilePrimary || undefined} className={cn("w-full justify-center", buttonProps.className)}>
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
