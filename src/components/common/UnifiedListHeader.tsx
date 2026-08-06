"use client";

import Link from "next/link";
import {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderProps = {
  children: ReactNode;
  resultCount?: number;
  resetHref: string;
  filtered?: boolean;
  activeCount?: number;
  className?: string;
};

function propsOf(child: ReactNode): Record<string, unknown> {
  return isValidElement(child) ? (child.props as Record<string, unknown>) : {};
}

function isFilterMore(child: ReactNode) {
  if (!isValidElement(child)) return false;
  const type = child.type as { displayName?: string };
  return type.displayName === "FilterBarMore" || Boolean(propsOf(child)["data-filter-more-wrapper"]);
}

function isAction(child: ReactNode) {
  const props = propsOf(child);
  return props.type === "submit" || (props.asChild === true && props.variant === "secondary");
}

function isPrimaryControl(child: ReactNode) {
  const props = propsOf(child);
  if (props.type === "date" || props.type === "search" || props.type === "text") return true;
  if (props.options || Array.isArray(props.children)) return false;
  return true;
}

function SearchControl({ child }: { child: ReactElement }) {
  const props = propsOf(child);
  if (props.type === "date") {
    return <div className="unified-list-primary-control unified-list-date-control">{cloneElement(child as ReactElement<Record<string, unknown>>, { className: cn("unified-list-primary-input", props.className as string) })}</div>;
  }
  const initial = typeof props.defaultValue === "string" ? props.defaultValue : typeof props.value === "string" ? props.value : "";
  const [value, setValue] = useState(initial);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer) clearTimeout(timer); }, [timer]);

  const update = (next: string) => {
    setValue(next);
    if (timer) clearTimeout(timer);
    const form = document.getElementById("main-content")?.querySelector("form") as HTMLFormElement | null;
    setTimer(setTimeout(() => form?.requestSubmit(), 300));
  };

  const control = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ...props,
    value,
    type: "search",
    enterKeyHint: "search",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (typeof props.onChange === "function") props.onChange(event);
      update(event.target.value);
    },
    className: cn("unified-list-primary-input", props.className as string),
  });

  return (
    <div className="unified-list-primary-control">
      <Search aria-hidden="true" className="unified-list-search-icon" />
      {control}
      {value ? <button type="button" className="unified-list-clear" aria-label="Clear search" onClick={() => update("")}><X /></button> : null}
    </div>
  );
}

export function UnifiedListHeader({ children, resultCount, resetHref, filtered = false, activeCount = 0, className }: HeaderProps) {
  const [mobile, setMobile] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const all = Children.toArray(children);
  const primary = all.find((child) => !isAction(child) && !isFilterMore(child) && isPrimaryControl(child));
  const more = all.find(isFilterMore);
  const filters = useMemo(() => all.filter((child) => child !== primary && !isAction(child) && !isFilterMore(child)), [all, primary]);
  const nested = more && isValidElement(more) ? Children.toArray(propsOf(more).children as ReactNode) : [];
  const active = activeCount || (more && isValidElement(more) && typeof propsOf(more).activeCount === "number" ? propsOf(more).activeCount as number : 0);

  if (!mobile) return <form className={cn("sb-list-filters", className)} data-filtered={filtered || undefined} data-reset-href={resetHref}>{children}{typeof resultCount === "number" ? <div className="sb-filter-summary" aria-live="polite"><span>{resultCount} {resultCount === 1 ? "record" : "records"}</span></div> : null}</form>;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => { button.disabled = true; button.dataset.pending = "true"; });
  };
  return (
    <form className={cn("sb-list-filters unified-list-header", className)} data-filtered={filtered || undefined} data-reset-href={resetHref} onSubmit={submit}>
      <div className="unified-list-row">
        {primary && isValidElement(primary) ? <SearchControl child={primary} /> : <div className="unified-list-primary-control" />}
        <button type="button" className="unified-list-filter-trigger" onClick={() => setOpen(true)} aria-label={active ? `Filters, ${active} active` : "Filters"}><SlidersHorizontal /><span className="unified-list-filter-label">Filters</span>{active ? <span className="unified-list-filter-badge">{active}</span> : null}</button>
        {typeof resultCount === "number" ? <span className="unified-list-result" aria-live="polite">{resultCount}</span> : null}
      </div>
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Search</button>
      {open ? <>
        <button type="button" className="unified-list-backdrop" aria-label="Close filters" onClick={() => setOpen(false)} />
        <section className="unified-list-sheet" role="dialog" aria-modal="true" aria-label="Filters">
          <header className="unified-list-sheet-header"><h2>Filters</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close filters"><X /></button></header>
          <div className="unified-list-sheet-fields">{filters}{nested}</div>
          <footer className="unified-list-sheet-actions"><Button asChild type="button" variant="ghost"><Link href={resetHref}>Reset</Link></Button><Button type="submit" onClick={() => setOpen(false)}>Apply filters</Button></footer>
        </section>
      </> : null}
    </form>
  );
}
