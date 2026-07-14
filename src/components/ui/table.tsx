import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="sb-table-region" role="region" aria-label={props["aria-label"] ?? "Data table"} tabIndex={0}>
      <table className={cn("w-full caption-bottom text-xs", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b bg-[var(--sb-surface-muted)]", className)} {...props} />;
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn("border-b border-[var(--sb-border-soft)] transition-colors hover:bg-[var(--sb-surface-muted)]", className)} {...props} />;
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-9 min-w-24 overflow-hidden px-3 text-left align-middle text-xs font-semibold text-[var(--sb-text-muted)]", className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}

export function TableActionLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} aria-label={label} className={cn("inline-flex h-11 w-11 items-center justify-center text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-amber-700)] focus-visible:outline-none sm:h-8 sm:w-8", className)}>
      {children}
    </Link>
  );
}
