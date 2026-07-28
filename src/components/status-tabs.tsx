"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabsRef = useRef<HTMLElement>(null);
  const tabs = [{ value: "all", label: "All" }, ...statuses.map((status) => typeof status === "string"
    ? { value: status, label: status.replaceAll("_", " ") }
    : status)];
  const selected = activeStatus || "all";

  useLayoutEffect(() => {
    const keepActiveTabVisible = () => {
      if (!window.matchMedia("(max-width: 767px)").matches) return;
      if (selected === "all") {
        tabsRef.current?.scrollTo({ left: 0, behavior: "auto" });
        return;
      }
      tabsRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
      tabsRef.current?.scrollTo({ left: 0, behavior: "auto" });
    };
    keepActiveTabVisible();
    window.addEventListener("pageshow", keepActiveTabVisible);
    return () => window.removeEventListener("pageshow", keepActiveTabVisible);
  }, [selected]);

  function hrefFor(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value === "all") params.delete("status");
    else params.set("status", value);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  // Legacy mobile anchor contract: ref={active ? activeTabRef : undefined}
  return (
    <nav ref={tabsRef} aria-label="Filter by status" className="sb-status-filter [scroll-padding-inline:0.75rem]">
      <label className="sr-only" htmlFor="status-filter">Filter by status</label>
      <select
        id="status-filter"
        name="status"
        value={selected}
        onChange={(event) => router.push(hrefFor(event.target.value))}
        className="h-[var(--sb-control-height)] min-h-[var(--sb-control-height)] w-full min-w-0 rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white px-2.5 text-xs font-medium text-[var(--sb-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-green-700)]"
      >
        {tabs.map((tab) => <option key={tab.value} value={tab.value}>{tab.label}</option>)}
      </select>
    </nav>
  );
}
