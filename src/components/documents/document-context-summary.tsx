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

  useEffect(() => {
    function updateContext(event: Event) {
      const detail = (event as CustomEvent<DocumentContextDetail>).detail;
      if (detail.branch !== undefined) setBranch(detail.branch);
      if (detail.date !== undefined) setDate(detail.date);
    }
    window.addEventListener("sb:document-context", updateContext);
    return () => window.removeEventListener("sb:document-context", updateContext);
  }, []);

  return (
    <>
      <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-0.5 md:hidden">
        <StatusBadge status={status} />
        {date ? <time className="justify-self-end text-xs tabular-nums text-muted-foreground" dateTime={date}>{date}</time> : <span />}
        {branch ? <span className="col-span-2 truncate text-xs text-muted-foreground">{branch}</span> : null}
      </div>
      <div className="hidden min-w-0 items-center gap-3 md:flex">
        {title ? <span className="shrink-0 text-base font-semibold text-foreground">{title}</span> : null}
        {branch ? <span className="ml-auto flex min-w-0 items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{branch}</span></span> : null}
      </div>
    </>
  );
}
