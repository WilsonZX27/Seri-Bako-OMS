"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterBar({
  children,
  resultCount,
  resetHref,
  filtered = false,
  className,
}: {
  children: ReactNode;
  resultCount?: number;
  resetHref: string;
  filtered?: boolean;
  className?: string;
}) {
  return (
    <form className={cn("sb-list-filters", className)}>
      {children}
      {typeof resultCount === "number" ? <div className="sb-filter-summary" aria-live="polite">
        <span>{resultCount} {resultCount === 1 ? "record" : "records"}</span>
        {filtered ? <Button asChild variant="ghost" size="sm"><Link href={resetHref}>Reset</Link></Button> : null}
      </div> : null}
    </form>
  );
}

export function FilterBarMore({
  children,
  activeCount = 0,
  resetHref,
}: {
  children: ReactNode;
  activeCount?: number;
  resetHref: string;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
  };

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) detailsRef.current.open = false;
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <details ref={detailsRef} className="sb-filter-more">
      <summary><SlidersHorizontal className="h-3.5 w-3.5" />More filters{activeCount ? <span className="sb-filter-more-count" aria-label={`${activeCount} active filters`}>{activeCount}</span> : null}</summary>
      <button type="button" className="sb-filter-more-backdrop" onClick={close} aria-label="Close filters" />
      <div className="sb-filter-more-panel">
        <div className="sb-filter-more-header">
          <div><h2>Filters</h2>{activeCount ? <p>{activeCount} active</p> : null}</div>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close filters"><X className="h-4 w-4" /></Button>
        </div>
        <div className="sb-filter-more-fields">{children}</div>
        <p className="sb-filter-more-help">Changes take effect after you select Apply.</p>
        <div className="sb-filter-more-actions">
          <Button asChild type="button" variant="ghost"><Link href={resetHref}>Reset</Link></Button>
          <Button type="submit">Apply</Button>
        </div>
      </div>
    </details>
  );
}
