import * as React from "react";
import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Technical tables keep their primary business identity visible while horizontally scrolling.
 * A leading checkbox is not an identity, so bulk-select tables opt into `second` explicitly.
 * The `third` anchor is used when a compact action column sits between the checkbox and identity.
 * Legacy contract: stickyColumn?: "none" | "first" | "second"
 */
export function Table({ className, mobileHidden = false, stickyColumn = "first", ...props }: React.TableHTMLAttributes<HTMLTableElement> & { mobileHidden?: boolean; stickyColumn?: "none" | "first" | "second" | "third" }) {
  return (
    <div className={cn("sb-table-region", mobileHidden && "hidden md:block")} data-sticky-column={stickyColumn} role="region" aria-label={props["aria-label"] ?? "Data table"} tabIndex={0}>
      <table className={cn("w-full caption-bottom text-xs", className)} {...props} />
    </div>
  );
}

export function OperationalList({ children, ariaLabel, className }: { children: React.ReactNode; ariaLabel: string; className?: string }) {
  return <div className={cn("divide-y divide-[var(--sb-border-soft)] md:hidden", className)} role="list" aria-label={ariaLabel}>{children}</div>;
}

export function OperationalListRow({ href, label, primary, status, secondary, meta, trailing }: {
  href: string;
  label: string;
  primary: React.ReactNode;
  status?: React.ReactNode;
  secondary?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <Link href={href} aria-label={label} role="listitem" className="grid min-h-16 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]">
      <div className="min-w-0 text-[13px] font-semibold leading-5">{primary}</div>
      <div className="flex items-start gap-1 whitespace-nowrap">{status}{trailing ?? <ChevronRight className="mt-1 h-4 w-4 text-[var(--sb-text-soft)]" />}</div>
      {secondary ? <div className="min-w-0 truncate text-xs text-[var(--sb-text-muted)]">{secondary}</div> : <span />}
      {meta ? <div className="whitespace-nowrap text-right text-[11px] text-[var(--sb-text-muted)]">{meta}</div> : null}
    </Link>
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

export function TableHead({ className, children, "aria-label": ariaLabel, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th aria-label={ariaLabel} className={cn("h-9 min-w-24 overflow-hidden px-3 text-left align-middle text-xs font-semibold text-[var(--sb-text-muted)]", className)} {...props}>{children}</th>
  );
}

export function TableSelectionHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-9 w-10 min-w-10 max-w-10 overflow-hidden px-2 text-center align-middle", className)} {...props} />;
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-2.5 align-middle", className)} {...props} />;
}

export function TableSelectionCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("w-10 min-w-10 max-w-10 px-2 py-2.5 text-center align-middle", className)} {...props} />;
}

export function TableActionLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} aria-label={label} className={cn("inline-flex h-12 w-full items-center justify-start pl-3 text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-green-700)] md:h-11 xl:h-8 [&>svg]:!h-3.5 [&>svg]:!w-3.5", className)}>
      {children}
    </a>
  );
}

/** Keeps multi-action rows inside the same compact, fixed Action column. */
export function TableActionMenu({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <details className="relative inline-flex text-left">
      <summary aria-label={label} className="inline-flex h-11 w-11 cursor-pointer list-none items-center justify-center text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-green-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)] [&::-webkit-details-marker]:hidden">
        <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
      </summary>
      <div role="menu" className="sb-popover-surface absolute left-0 top-[calc(100%+0.25rem)] z-[var(--sb-z-dialog)] min-w-28 p-1">
        {children}
      </div>
    </details>
  );
}
