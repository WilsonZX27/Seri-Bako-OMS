"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

type DocumentContextDetail = {
  branch?: string | null;
  date?: string | null;
};

export function DocumentContextSummary({
  title,
  status,
  statusLabel,
  branch: initialBranch,
  date: initialDate,
  mobileStatusOnly = false,
}: {
  title?: string | null;
  status: string;
  statusLabel?: string;
  branch?: string | null;
  date?: string | null;
  mobileStatusOnly?: boolean;
}) {
  const [branch, setBranch] = useState(initialBranch);
  const [date, setDate] = useState(initialDate);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    function updateContext(event: Event) {
      const detail = (event as CustomEvent<DocumentContextDetail>).detail;
      if (detail.branch !== undefined) setBranch(detail.branch);
      if (detail.date !== undefined) setDate(detail.date);
    }
    window.addEventListener("sb:document-context", updateContext);
    return () => window.removeEventListener("sb:document-context", updateContext);
  }, []);

  useEffect(() => {
    const sentinel = document.querySelector<HTMLElement>("[data-document-context-sentinel]");
    const header = document.querySelector<HTMLElement>("[data-document-workspace-header]");
    if (!sentinel || !header) return;
    const observer = new IntersectionObserver(([entry]) => {
      const next = !entry.isIntersecting;
      setCompact(next);
      header.dataset.contextCompact = next ? "true" : "false";
    }, { threshold: 0 });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div data-document-context-summary data-compact={compact || undefined} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 md:hidden">
        {mobileStatusOnly && title ? <span className="truncate text-sm font-semibold text-foreground">{title}</span> : <StatusBadge status={status} label={statusLabel} />}
        {mobileStatusOnly ? <StatusBadge status={status} label={statusLabel} /> : date ? <time className="justify-self-end text-xs tabular-nums text-muted-foreground" dateTime={date}>{date}</time> : <span />}
        {!mobileStatusOnly && branch ? <span className={compact ? "col-span-2 truncate text-[11px] text-muted-foreground" : "col-span-2 truncate text-xs text-muted-foreground"}>{branch}</span> : null}
      </div>
      <div className="hidden min-w-0 items-center gap-3 md:flex">
        {title ? <span className="sb-page-title shrink-0 text-foreground">{title}</span> : null}
        {branch ? <span className="ml-auto flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{branch}</span></span> : null}
      </div>
    </>
  );
}
