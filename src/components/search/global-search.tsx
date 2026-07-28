"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ModalShell } from "@/components/ui/modal-shell";
import { searchableNavItems } from "@/components/layout/nav-items";

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export function GlobalSearch({
  permissionMap,
  mobile = false,
  open,
  onOpenChange,
  hideTrigger = false,
  triggerLabel,
  triggerClassName,
}: {
  permissionMap: Record<string, boolean>;
  mobile?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  triggerLabel?: string;
  triggerClassName?: string;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const isOpen = open ?? uncontrolledOpen;

  const setSearchOpen = useCallback((next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  }, [onOpenChange]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const matchesContext = window.matchMedia(mobile ? "(max-width: 767px)" : "(min-width: 768px)").matches;
      if (!matchesContext) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobile, setSearchOpen]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const handle = window.setTimeout(async () => {
      if (!query.trim()) {
        if (active) setResults([]);
        return;
      }
      const term = query.trim().toLowerCase();
      const navResults = searchableNavItems
        .filter((item) => !("permission" in item) || !item.permission || permissionMap[item.permission])
        .filter((item) => `${item.label} ${item.group} ${(item.keywords ?? []).join(" ")}`.toLowerCase().includes(term))
        .slice(0, 8)
        .map((item) => ({ type: "navigation", title: item.label, subtitle: item.group, href: item.href }));
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search request failed.");
        const payload = (await response.json()) as { results?: SearchResult[] };
        if (active) setResults([...navResults, ...(payload.results ?? [])]);
      } catch (error) {
        // A cancelled request is expected while the user is typing. For any
        // transient API failure, preserve permission-filtered navigation so
        // global search never becomes a dead end or emits an unhandled error.
        if (active && !(error instanceof DOMException && error.name === "AbortError")) setResults(navResults);
      }
    }, 180);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [permissionMap, query]);

  return (
    <>
      {!hideTrigger ? <Button ref={triggerRef} type="button" variant={triggerLabel ? "outline" : "ghost"} size={triggerLabel ? "default" : "icon"} className={cn(triggerClassName, triggerLabel && "justify-start gap-3")} onClick={() => setSearchOpen(true)} aria-label="Open global search">
          <Search className="h-5 w-5" />
          {triggerLabel ? <span>{triggerLabel}</span> : null}
        </Button> : null}
      <ModalShell open={isOpen} onClose={() => setSearchOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={inputRef} className="max-w-2xl overflow-hidden p-0">
            <h2 id={titleId} className="sr-only">Global search</h2>
            <div className="flex items-center gap-3 border-b p-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item code, supplier, document no..." className="border-0 shadow-none focus-visible:ring-0" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setSearchOpen(false)} aria-label="Close search">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.map((result) => (
                <Link key={`${result.type}-${result.href}`} href={result.href} onClick={() => setSearchOpen(false)} className="flex items-center justify-between rounded-[2px] px-3 py-2 hover:bg-secondary">
                  <div>
                    <p className="text-sm font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                  </div>
                  <span className="rounded-[2px] bg-secondary px-2 py-1 text-xs text-muted-foreground">{result.type}</span>
                </Link>
              ))}
              {query && !results.length ? <p className="p-6 text-center text-sm text-muted-foreground">No results found.</p> : null}
              {!query ? <p className="p-6 text-center text-sm text-muted-foreground">Type to search across Seri Bako OMS.</p> : null}
            </div>
      </ModalShell>
    </>
  );
}
