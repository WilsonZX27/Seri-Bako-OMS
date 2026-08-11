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
  branch: initialBranch,
  date: initialDate,
}: {
  title?: string | null;
  status: string;
  branch?: string | null;
  date?: string | null;
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
      <div data-document-context-summary data-compact={compact || undefined} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 md:hidden">
        <StatusBadge status={status} />
        {date ? <time className="justify-self-end text-xs tabular-nums text-muted-foreground" dateTime={date}>{date}</time> : <span />}
        {branch ? <span className={compact ? "col-span-2 truncate text-[11px] text-muted-foreground" : "col-span-2 truncate text-xs text-muted-foreground"}>{branch}</span> : null}
      </div>
      <div className="hidden min-w-0 items-center gap-3 md:flex">
        {title ? <span className="shrink-0 text-base font-semibold text-foreground">{title}</span> : null}
        {branch ? <span className="ml-auto flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{branch}</span></span> : null}
      </div>
    </>
  );
}
