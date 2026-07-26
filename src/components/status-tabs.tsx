"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const tabs = [{ value: "all", label: "All" }, ...statuses.map((status) => typeof status === "string"
    ? { value: status, label: status.replaceAll("_", " ") }
    : status)];
  const selected = activeStatus || "all";

  useEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const frame = window.requestAnimationFrame(() => {
      activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);

  function hrefFor(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "all") params.delete("status");
    else params.set("status", value);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return (
    <nav aria-label="Filter by status" className="scrollbar-none flex min-h-11 gap-1 overflow-x-auto border-b border-[var(--sb-border-soft)] bg-white px-2 py-1.5">
      {tabs.map((tab) => {
        const active = selected === tab.value;
        return (
          <Link
            ref={active ? activeTabRef : undefined}
            key={tab.value}
            href={hrefFor(tab.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center justify-center rounded-[var(--sb-radius-control)] px-3 text-xs font-medium capitalize transition-colors",
              active
                ? "bg-[var(--sb-green-900)] text-white"
                : "text-[var(--sb-text-muted)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-text)]",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
