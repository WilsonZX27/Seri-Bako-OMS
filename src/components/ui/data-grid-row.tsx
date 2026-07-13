import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DataGridRow({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn("group border-b border-[var(--sb-border-soft)] transition-colors hover:bg-[var(--sb-surface-muted)]", className)}
      data-href={href}
    >
      {children}
    </tr>
  );
}
