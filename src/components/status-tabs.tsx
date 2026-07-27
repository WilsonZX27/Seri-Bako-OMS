"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabsRef = useRef<HTMLElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  const tabs = [{ value: "all", label: "All" }, ...statuses.map((status) => typeof status === "string"
    ? { value: status, label: status.replaceAll("_", " ") }
    : status)];
  const selected = activeStatus || "all";

  useLayoutEffect(() => {
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    const keepActiveTabVisible = () => {
      // Safari can restore a horizontal scroll offset after hydration or when
      // a page is revisited. Reset the default state before paint, then once
      // more after restoration so the first control never has a clipped corner.
      if (selected === "all") {
        tabsRef.current?.scrollTo({ left: 0, behavior: "auto" });
        return;
      }
      activeTabRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
    };

    keepActiveTabVisible();
    const restorationTimer = window.setTimeout(keepActiveTabVisible, 120);
    window.addEventListener("pageshow", keepActiveTabVisible);
    return () => {
      window.clearTimeout(restorationTimer);
      window.removeEventListener("pageshow", keepActiveTabVisible);
    };
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
    <nav ref={tabsRef} aria-label="Filter by status" className="scrollbar-none flex min-h-11 gap-1 overflow-x-auto border-b border-[var(--sb-border-soft)] bg-white px-3 py-1.5 [scroll-padding-inline:0.75rem]">
      {tabs.map((tab) => {
        const active = selected === tab.value;
        return (
          <Link
            ref={active ? activeTabRef : undefined}
            key={tab.value}
            href={hrefFor(tab.value)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-[var(--sb-control-height)] shrink-0 items-center justify-center rounded-[var(--sb-radius-control)] px-3 text-xs font-medium capitalize transition-colors",
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
