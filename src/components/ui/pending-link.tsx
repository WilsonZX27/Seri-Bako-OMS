"use client";

import { useRouter } from "next/navigation";
import { useTransition, type AnchorHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PendingLink({ href, children, pendingLabel = "Opening...", className, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: ReactNode; pendingLabel?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <a
    {...props}
    href={href}
    aria-busy={pending || undefined}
    aria-disabled={pending || undefined}
    className={cn(className, pending && "pointer-events-none opacity-70")}
    onClick={(event) => {
      props.onClick?.(event);
      if (event.defaultPrevented || pending || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      startTransition(() => router.push(href));
    }}
  >{pending ? pendingLabel : children}</a>;
}
