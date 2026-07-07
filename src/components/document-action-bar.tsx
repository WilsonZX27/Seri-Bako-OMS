"use client";

import Link from "next/link";
import { type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function DocumentActionBar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

export function DocumentActionForm({
  action,
  children,
  pendingLabel = "Saving...",
  ...buttonProps
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  pendingLabel?: string;
} & ButtonProps) {
  return (
    <form action={action}>
      <DocumentActionSubmitButton pendingLabel={pendingLabel} {...buttonProps}>
        {children}
      </DocumentActionSubmitButton>
    </form>
  );
}

export function DocumentActionLink({ href, children, ...buttonProps }: { href: string; children: ReactNode } & ButtonProps) {
  return (
    <Button asChild {...buttonProps}>
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
    <Button type="submit" {...buttonProps} disabled={pending || buttonProps.disabled}>
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
      {pending ? pendingLabel : children}
    </Button>
  );
}
