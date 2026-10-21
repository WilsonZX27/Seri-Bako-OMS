"use client";

import Link from "next/link";
import type { CSSProperties, MouseEvent, ReactNode, FormEventHandler } from "react";
import { useEffect, useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { containDialogTab, focusDialog } from "@/lib/dialog-focus";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";

export function FilterBar({
  children,
  actions,
  onSubmit,
  resultCount,
  resultLabel,
  resetHref,
  filtered = false,
  activeCount = 0,
  className,
  phoneOnly = false,
  phoneMode = "drawer",
  tabletMode = "drawer",
  phonePrimary = "inline",
  compactPinnedFields,
  stableResponsive,
}: {
  children: ReactNode;
  actions?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  resultCount?: number;
  resultLabel?: string;
  resetHref: string;
  filtered?: boolean;
  activeCount?: number;
  className?: string;
  phoneOnly?: boolean;
  phoneMode?: "drawer" | "inline";
  tabletMode?: "drawer" | "inline" | "auto";
  phonePrimary?: "inline" | "drawer";
  compactPinnedFields?: string[];
  stableResponsive?: boolean;
}) {
  return <UnifiedListHeader {...{ children, actions, onSubmit, resultCount, resultLabel, resetHref, filtered, activeCount, className, phoneOnly, phoneMode, tabletMode, phonePrimary, compactPinnedFields, stableResponsive }} />;
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
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>();
  const positionPanel = () => {
    if (window.innerWidth < 1280) {
      setPanelStyle(undefined);
      return;
    }
    const anchor = summaryRef.current?.getBoundingClientRect();
    if (!anchor) return;
    const width = Math.min(360, Math.max(280, window.innerWidth - 24));
    // Keep the sheet anchored to the trigger's leading edge whenever possible.
    // Aligning by `anchor.right - width` makes a wide panel appear detached on
    // tablet when the trigger sits near the left side of a split workspace.
    const left = Math.min(Math.max(12, anchor.left), Math.max(12, window.innerWidth - width - 12));
    const top = Math.min(anchor.bottom + 8, Math.max(12, window.innerHeight - 420));
    setPanelStyle({ position: "fixed", top, left, width });
  };
  const close = (restoreFocus = true) => {
    setOpen(false);
    detailsRef.current?.removeAttribute("open");
    if (restoreFocus) summaryRef.current?.focus();
  };

  useEffect(() => {
    const closeForSelect = () => close(false);
    document.addEventListener("sb:close-filter-more", closeForSelect);
    return () => document.removeEventListener("sb:close-filter-more", closeForSelect);
  }, []);

  useEffect(() => {
    if (!open) return;
    positionPanel();
    const panel = panelRef.current;
    if (panel) focusDialog(panel);
    const onViewportChange = () => positionPanel();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.filterDialogOpen = "true";
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape" && detailsRef.current?.open) close();
      if (panel && !document.querySelector('[role="listbox"]')) containDialogTab(event, panel);
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (target instanceof Element && target.closest('[role="listbox"], [data-radix-popper-content-wrapper]')) return;
      if (target instanceof Node && detailsRef.current && !detailsRef.current.contains(target)) close(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.filterDialogOpen;
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  const handleSummaryClick = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (open) {
      close();
    } else {
      setOpen(true);
      document.dispatchEvent(new CustomEvent("sb:close-select-controls"));
      requestAnimationFrame(positionPanel);
    }
  };

  return (
    <details ref={detailsRef} open={open} data-filter-more-wrapper className="sb-filter-more">
      <summary ref={summaryRef} onClick={handleSummaryClick}><SlidersHorizontal className="h-3.5 w-3.5" />Filter{activeCount ? <span className="sb-filter-more-count" aria-label={`${activeCount} active filters`}>{activeCount}</span> : null}</summary>
      <button type="button" className="sb-filter-more-backdrop" onClick={() => close()} aria-label="Dismiss filters" />
      <div ref={panelRef} tabIndex={-1} className="sb-filter-more-panel sb-filter-more-panel--anchored" style={panelStyle} role="dialog" aria-modal="true" aria-label="Filters">
        <div className="sb-filter-more-header">
          <div><h2>Filters</h2>{activeCount ? <p>{activeCount} active</p> : null}</div>
          <Button type="button" variant="ghost" size="icon" onClick={() => close()} aria-label="Close filters"><X className="h-4 w-4" /></Button>
        </div>
        <div className="sb-filter-more-fields">{children}</div>
        <div className="sb-filter-more-actions">
          <Button asChild type="button" variant="ghost"><Link href={resetHref}>Reset</Link></Button>
          <Button type="submit">Apply</Button>
        </div>
      </div>
    </details>
  );
}
