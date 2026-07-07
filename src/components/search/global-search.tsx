"use client";

import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchableNavItems } from "@/components/layout/nav-items";

type SearchResult = {
  type: string;
  title: string;
  subtitle: string;
  href: string;
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as { results: SearchResult[] };
      const term = query.trim().toLowerCase();
      const navResults = searchableNavItems
        .filter((item) => `${item.label} ${item.group} ${(item.keywords ?? []).join(" ")}`.toLowerCase().includes(term))
        .slice(0, 8)
        .map((item) => ({ type: "navigation", title: item.label, subtitle: item.group, href: item.href }));
      setResults([...navResults, ...payload.results]);
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query]);

  return (
    <>
      <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(true)} aria-label="Open global search">
        <Search className="h-4 w-4" />
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50">
          <button type="button" className="absolute inset-0 bg-slate-950/45" aria-label="Close search" onClick={() => setOpen(false)} />
          <div className="relative mx-auto mt-20 w-[min(42rem,92vw)] overflow-hidden rounded-lg border bg-card shadow-xl">
            <div className="flex items-center gap-3 border-b p-3">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search item code, supplier, document no..." className="border-0 shadow-none focus-visible:ring-0" />
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close search">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.map((result) => (
                <Link key={`${result.type}-${result.href}`} href={result.href} onClick={() => setOpen(false)} className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-secondary">
                  <div>
                    <p className="text-sm font-medium">{result.title}</p>
                    <p className="text-xs text-muted-foreground">{result.subtitle}</p>
                  </div>
                  <span className="rounded-md bg-secondary px-2 py-1 text-xs text-muted-foreground">{result.type}</span>
                </Link>
              ))}
              {query && !results.length ? <p className="p-6 text-center text-sm text-muted-foreground">No results found.</p> : null}
              {!query ? <p className="p-6 text-center text-sm text-muted-foreground">Type to search across Seri Bako OMS.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
