"use client";

import Link from "next/link";
import { createContext, type ReactNode, useContext, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type ActionBarContextValue = {
  pending: boolean;
  setPending: (pending: boolean) => void;
};

const ActionBarContext = createContext<ActionBarContextValue | null>(null);

export function DocumentActionBar({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState(false);
  return (
    <ActionBarContext.Provider value={{ pending, setPending }}>
      <div className="flex flex-wrap gap-2">{children}</div>
    </ActionBarContext.Provider>
  );
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
  const actionBar = useContext(ActionBarContext);
  const pending = actionBar?.pending ?? false;

  return (
    <form action={action} onSubmit={() => actionBar?.setPending(true)}>
      <Button type="submit" {...buttonProps} disabled={pending || buttonProps.disabled}>
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
        {pending ? pendingLabel : children}
      </Button>
    </form>
  );
}

export function DocumentActionLink({ href, children, ...buttonProps }: { href: string; children: ReactNode } & ButtonProps) {
  const actionBar = useContext(ActionBarContext);
  return (
    <Button asChild aria-disabled={actionBar?.pending} tabIndex={actionBar?.pending ? -1 : undefined} {...buttonProps}>
      <Link href={actionBar?.pending ? "#" : href}>{children}</Link>
    </Button>
  );
}
