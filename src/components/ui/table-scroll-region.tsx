"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function TableScrollRegion({ children, label, className }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const check = () => setOverflowing(element.scrollWidth > element.clientWidth + 1);
    const observer = new ResizeObserver(check);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);
    check();
    return () => observer.disconnect();
  }, []);
  return <div className={cn("min-w-0", className)}>
    {overflowing ? <p className="flex items-center gap-2 border-b border-[var(--sb-border-soft)] px-3 py-2 text-xs text-muted-foreground"><ArrowLeftRight className="h-4 w-4 shrink-0" aria-hidden="true" />Scroll or swipe to see all columns</p> : null}
    <div ref={ref} role="region" aria-label={label} tabIndex={overflowing ? 0 : undefined} className="overflow-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]">{children}</div>
  </div>;
}
