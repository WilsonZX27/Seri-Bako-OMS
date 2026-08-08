"use client";

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
export function Table({ className, mobileHidden = false, compactUntil = "md", stickyColumn = "first", ...props }: React.TableHTMLAttributes<HTMLTableElement> & { mobileHidden?: boolean; compactUntil?: "md" | "xl"; stickyColumn?: "none" | "first" | "second" | "third" }) {
  const regionRef = React.useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = React.useState(false);

  const updateScrollState = React.useCallback(() => {
    setScrolled((regionRef.current?.scrollLeft ?? 0) > 2);
  }, []);

  React.useEffect(() => {
    updateScrollState();
    const region = regionRef.current;
    if (!region || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(region);
    return () => observer.disconnect();
  }, [updateScrollState]);

  return (
    <div ref={regionRef} onScroll={updateScrollState} className={cn("sb-table-region sb-scrollbar-none", mobileHidden && (compactUntil === "xl" ? "hidden xl:block" : "hidden md:block"))} data-sticky-column={stickyColumn} data-scrolled={scrolled ? "true" : "false"} role="region" aria-label={props["aria-label"] ?? "Data table"} tabIndex={0}>
      <table className={cn("w-full caption-bottom text-xs", className)} {...props} />
    </div>
  );
}

export function OperationalList({ children, ariaLabel, className, showUntil = "md" }: { children: React.ReactNode; ariaLabel: string; className?: string; showUntil?: "md" | "xl" }) {
  return <div className={cn("divide-y divide-[var(--sb-border-soft)]", showUntil === "xl" ? "xl:hidden" : "md:hidden", className)} role="list" aria-label={ariaLabel}>{children}</div>;
}

export function OperationalListRow({ href, label, primary, status, statusMeta, secondary, detail, meta, trailing }: {
  href?: string;
  label?: string;
  primary: React.ReactNode;
  status?: React.ReactNode;
  statusMeta?: React.ReactNode;
  secondary?: React.ReactNode;
  detail?: React.ReactNode;
  meta?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const lastTapAt = React.useRef(0);
  const handlePointerOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now();
    if (now - lastTapAt.current < 350) {
      lastTapAt.current = 0;
      return;
    }
    lastTapAt.current = now;
    event.preventDefault();
    window.setTimeout(() => {
      if (Date.now() - lastTapAt.current >= 350) lastTapAt.current = 0;
    }, 350);
  };
  const className = "grid min-h-16 grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-2.5 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]";
  const content = <>
      <div className="min-w-0 text-[13px] font-semibold leading-5">{primary}</div>
      <div className="flex items-start gap-2 whitespace-nowrap">
        <div className="flex min-w-0 flex-col items-end gap-1">
          {status}
          {statusMeta ? <div className="text-right text-[11px] font-semibold text-[var(--sb-text)]">{statusMeta}</div> : null}
        </div>
        {trailing ?? (href ? <ChevronRight className="mt-1 h-4 w-4 text-[var(--sb-text-soft)]" /> : null)}
      </div>
      {secondary ? <div className="min-w-0 whitespace-normal break-words text-xs leading-4 text-[var(--sb-text-muted)]">{secondary}</div> : <span />}
      {meta ? <div className="whitespace-nowrap text-right text-[11px] text-[var(--sb-text-muted)]">{meta}</div> : null}
      {detail ? <div className="col-span-2 min-w-0 text-[11px] leading-4 text-[var(--sb-text-muted)]">{detail}</div> : null}
    </>;
  return href
    ? <Link href={href} aria-label={label} role="listitem" className={className} data-open-gesture="double-tap" onClick={handlePointerOpen}>{content}</Link>
    : <div aria-label={label} role="listitem" className={className}>{content}</div>;
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
    <a href={href} aria-label={label} className={cn("mx-auto flex h-11 w-11 shrink-0 items-center justify-center text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-green-700)] xl:h-8 xl:w-8 [&>svg]:!h-3.5 [&>svg]:!w-3.5", className)}>
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
