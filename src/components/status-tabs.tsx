"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { SelectControl } from "@/components/ui/select-control";

type StatusTab = string | { value: string; label: string };

export function StatusTabs({ statuses, activeStatus }: { statuses: StatusTab[]; activeStatus?: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabsRef = useRef<HTMLElement>(null);
  const tabs = [{ value: "all", label: "All statuses" }, ...statuses.map((status) => typeof status === "string"
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

  return (
    <nav ref={tabsRef} aria-label="Filter by status" className="sb-status-filter [scroll-padding-inline:0.75rem]">
      <SelectControl
        ariaLabel="Filter by status"
        value={selected}
        onValueChange={(value) => router.push(hrefFor(value))}
        options={tabs}
        className="sb-status-filter-control min-h-[var(--sb-control-height)] w-full text-xs font-medium"
      />
    </nav>
  );
}
