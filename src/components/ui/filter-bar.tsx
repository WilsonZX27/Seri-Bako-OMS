"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode, ToggleEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";

export function FilterBar({
  children,
  resultCount,
  resetHref,
  filtered = false,
  activeCount = 0,
  className,
  phoneOnly = false,
  phoneMode = "drawer",
}: {
  children: ReactNode;
  resultCount?: number;
  resetHref: string;
  filtered?: boolean;
  activeCount?: number;
  className?: string;
  phoneOnly?: boolean;
  phoneMode?: "drawer" | "inline";
}) {
  return <UnifiedListHeader {...{ children, resultCount, resetHref, filtered, activeCount, className, phoneOnly, phoneMode }} />;
}

FilterBarMore.displayName = "FilterBarMore";

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
  const summaryRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>();
  const positionPanel = () => {
    const anchor = summaryRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(360, Math.max(280, window.innerWidth - 24));
    const left = Math.min(Math.max(12, anchor.right - width), Math.max(12, window.innerWidth - width - 12));
    const top = Math.min(anchor.bottom + 8, Math.max(12, window.innerHeight - 420));
    setPanelStyle({ position: "fixed", top, left, width });
  };
  const close = () => {
    if (detailsRef.current) detailsRef.current.open = false;
    setOpen(false);
    summaryRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    positionPanel();
    const onViewportChange = () => positionPanel();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.filterDialogOpen = "true";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && detailsRef.current?.open) close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.filterDialogOpen;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleToggle = (event: ToggleEvent<HTMLDetailsElement>) => {
    const nextOpen = event.currentTarget.open;
    setOpen(nextOpen);
    if (nextOpen) requestAnimationFrame(positionPanel);
  };

  return (
    <details ref={detailsRef} data-filter-more-wrapper className="sb-filter-more" onToggle={handleToggle}>
      <summary ref={summaryRef} onClick={() => { setOpen(true); window.setTimeout(positionPanel, 0); }}><SlidersHorizontal className="h-3.5 w-3.5" />More filters{activeCount ? <span className="sb-filter-more-count" aria-label={`${activeCount} active filters`}>{activeCount}</span> : null}</summary>
      <button type="button" className="sb-filter-more-backdrop" onClick={close} aria-label="Dismiss filters" />
      <div className="sb-filter-more-panel sb-filter-more-panel--anchored" style={panelStyle} role="dialog" aria-modal="true" aria-label="Filters">
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
