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
export function Table({ className, mobileHidden = false, compactUntil = "xl", stickyColumn = "first", ...props }: React.TableHTMLAttributes<HTMLTableElement> & { mobileHidden?: boolean; compactUntil?: "md" | "xl" | "2xl"; stickyColumn?: "none" | "first" | "second" | "third" }) {
  return (
    <div className={cn("sb-table-region sb-scrollbar-none", mobileHidden && (compactUntil === "2xl" ? "hidden 2xl:block" : compactUntil === "xl" ? "hidden xl:block" : "hidden md:block"))} data-sticky-column={stickyColumn} role="region" aria-label={props["aria-label"] ?? "Data table"} tabIndex={0}>
      <table data-ui-table="true" className={cn("w-full caption-bottom text-xs", className)} {...props} />
    </div>
  );
}

export function OperationalList({ children, ariaLabel, className, showUntil = "xl" }: { children: React.ReactNode; ariaLabel: string; className?: string; showUntil?: "md" | "xl" | "2xl" }) {
  return <div className={cn("divide-y divide-[var(--sb-border-soft)]", showUntil === "2xl" ? "2xl:hidden" : showUntil === "xl" ? "xl:hidden" : "md:hidden", className)} role="list" aria-label={ariaLabel}>{children}</div>;
}

export function OperationalListRow({ href, label, primary, status, statusMeta, secondary, detail, meta, leading, trailing }: {
  href?: string;
  label?: string;
  primary: React.ReactNode;
  status?: React.ReactNode;
  statusMeta?: React.ReactNode;
  secondary?: React.ReactNode;
  detail?: React.ReactNode;
  meta?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const lastTapAt = React.useRef(0);
  const handlePointerOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.detail === 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
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
  const className = "grid min-h-16 grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 px-3 py-2.5 hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]";
  const renderContent = (withTrailing: boolean) => <>
      <div className="min-w-0 self-center">
        <div className="text-[13px] font-medium leading-5">{primary}</div>
        {secondary ? <div className="mt-0.5 whitespace-normal break-words text-xs leading-4 text-[var(--sb-text-muted)]">{secondary}</div> : null}
        {detail ? <div className="mt-0.5 text-[11px] leading-4 text-[var(--sb-text-muted)]">{detail}</div> : null}
      </div>
      <div className="flex items-start justify-self-end gap-2 whitespace-nowrap">
        <div className="flex min-w-0 flex-col items-end gap-1">
          {status}
          {statusMeta ? <div className="text-right text-[11px] font-medium text-[var(--sb-text)]">{statusMeta}</div> : null}
          {meta ? <div className="text-right text-[11px] text-[var(--sb-text-muted)]">{meta}</div> : null}
        </div>
        {withTrailing ? (trailing ?? (href ? <ChevronRight className="mt-1 h-4 w-4 text-[var(--sb-text-soft)]" /> : null)) : null}
      </div>
    </>;
  if (!href) return <div aria-label={label} role="listitem" className={cn(className, leading && "relative pl-14")}>
    {leading ? <div className="absolute left-3 top-2.5">{leading}</div> : null}
    {renderContent(true)}
  </div>;
  // Do not nest a button/select inside an anchor. Besides being invalid HTML,
  // that makes a basket/action control navigate to the row destination on tap.
  if (trailing || leading) {
    return <div aria-label={label} role="listitem" className={cn(className, "relative", trailing && "pr-14", leading && "pl-14")}>
      <Link href={href} aria-label={label} className="contents" data-open-gesture="double-tap" onClick={handlePointerOpen}>{renderContent(false)}</Link>
      {leading ? <div className="absolute left-3 top-2.5">{leading}</div> : null}
      {trailing ? <div className="absolute right-3 top-2.5">{trailing}</div> : null}
    </div>;
  }
  return <Link href={href} aria-label={label} role="listitem" className={className} data-open-gesture="double-tap" onClick={handlePointerOpen}>{renderContent(true)}</Link>;
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
  const isActionColumn = typeof children === "string" && children.trim().toLowerCase() === "action";
  return (
    <th
      aria-label={ariaLabel ?? (isActionColumn ? "Actions" : undefined)}
      data-table-action-head={isActionColumn ? "true" : undefined}
      className={cn(
        "h-9 overflow-hidden align-middle text-[10px] font-medium text-[var(--sb-text-muted)]",
        !isActionColumn && "min-w-24 whitespace-nowrap px-3 text-left",
        className,
        isActionColumn && "!w-10 !min-w-10 !max-w-10 !px-0 text-center",
      )}
      {...props}
    >{isActionColumn ? <span className="sr-only">{children}</span> : children}</th>
  );
}

export function TableSelectionHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("h-9 w-10 min-w-10 max-w-10 overflow-hidden px-2 text-center align-middle", className)} {...props} />;
}

export function TableCell({ className, children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  const isActionCell = React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child) || !child.props || typeof child.props !== "object") return false;
    const childProps = child.props as { href?: unknown; label?: unknown };
    return typeof childProps.href === "string" && typeof childProps.label === "string";
  });
  return <td className={cn("px-3 py-2.5 align-middle", className, isActionCell && "w-10 min-w-10 max-w-10 p-0 text-center")} {...props}>{children}</td>;
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
