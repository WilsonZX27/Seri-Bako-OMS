"use client";

import Link from "next/link";
import {
  Children,
  Fragment,
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type HeaderProps = {
  children: ReactNode;
  resultCount?: number;
  resetHref: string;
  filtered?: boolean;
  activeCount?: number;
  className?: string;
  phoneOnly?: boolean;
  phoneMode?: "drawer" | "inline";
  phonePrimary?: "inline" | "drawer";
};

function propsOf(child: ReactNode): Record<string, unknown> {
  return isValidElement(child) ? (child.props as Record<string, unknown>) : {};
}

function flattenChildren(children: ReactNode): ReactNode[] {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      return flattenChildren(propsOf(child).children as ReactNode);
    }
    return [child];
  });
}

function isFilterMore(child: ReactNode) {
  if (!isValidElement(child)) return false;
  const props = propsOf(child);
  const type = child.type as { displayName?: string; name?: string; type?: { displayName?: string; name?: string } };
  const names = [type.displayName, type.name, type.type?.displayName, type.type?.name];
  return names.includes("FilterBarMore")
    || Boolean(props["data-filter-more-wrapper"])
    // React can wrap the client component in a dev-only proxy, which drops
    // function displayName/name. These props are unique to FilterBarMore in
    // the shared filter contract and keep the mobile sheet flat in that case.
    || (typeof props.resetHref === "string" && typeof props.activeCount === "number" && props.children !== undefined && !props.name && !props.options && !props.type);
}

function isAction(child: ReactNode) {
  const props = propsOf(child);
  return props.type === "submit" || (props.asChild === true && props.variant === "secondary");
}

function isStatusTabs(child: ReactNode) {
  if (!isValidElement(child)) return false;
  const type = child.type as { displayName?: string; name?: string };
  return type.displayName === "StatusTabs" || type.name === "StatusTabs";
}

function isPrimaryControl(child: ReactNode) {
  const props = propsOf(child);
  if (props.type === "date" || props.type === "search" || props.type === "text") return true;
  if (props.options || Array.isArray(props.children)) return false;
  return true;
}

function isSearchControl(child: ReactNode) {
  const props = propsOf(child);
  if (props.type === "search") return true;
  if (props.type !== "text" && typeof props.type !== "undefined") return false;
  const searchable = [props.name, props.id, props.placeholder]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return searchable.includes("search") || searchable.includes("find");
}

function isHiddenControl(child: ReactNode) {
  return propsOf(child).type === "hidden";
}

function isQueryControl(child: ReactNode) {
  const props = propsOf(child);
  return isSearchControl(child) || props.type === "date" || props.name === "date";
}

function hiddenFilterValue(child: ReactNode) {
  if (!isValidElement(child)) return null;
  const props = propsOf(child);
  const name = typeof props.name === "string" ? props.name : isStatusTabs(child) ? "status" : null;
  if (!name || props.type === "checkbox" || props.type === "radio" || props.type === "file") return null;
  const value = typeof props.value === "string" || typeof props.value === "number"
    ? String(props.value)
    : typeof props.defaultValue === "string" || typeof props.defaultValue === "number"
      ? String(props.defaultValue)
      : typeof props.activeStatus === "string"
        ? props.activeStatus
      : "";
  return { name, value };
}

function SearchControl({ child, value, onChange }: { child: ReactElement; value: string; onChange: (value: string) => void }) {
  const props = propsOf(child);

  if (props.type === "date") {
    const visibleDate = value
      ? new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`))
      : "Any date";
    const control = cloneElement(child as ReactElement<Record<string, unknown>>, {
      ...props,
      defaultValue: undefined,
      value,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
        if (typeof props.onChange === "function") props.onChange(event);
        onChange(event.target.value);
      },
      className: cn("unified-list-primary-input", props.className as string),
    });

    return <div className="unified-list-primary-control unified-list-date-control" data-empty={!value || undefined}>
      <CalendarDays aria-hidden="true" className="unified-list-date-icon" />
      <span className="unified-list-date-placeholder" data-default-label="Any date" aria-hidden="true">{visibleDate}</span>
      {control}
    </div>;
  }

  const control = cloneElement(child as ReactElement<Record<string, unknown>>, {
    ...props,
    // The shared phone search owns the value. Keeping the source control's
    // defaultValue alongside it makes React treat the input as both controlled
    // and uncontrolled and emits a warning on every list route.
    defaultValue: undefined,
    value,
    type: "search",
    enterKeyHint: "search",
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (typeof props.onChange === "function") props.onChange(event);
      onChange(event.target.value);
    },
    className: cn("unified-list-primary-input", props.className as string),
  });

  return (
    <div className="unified-list-primary-control">
      <Search aria-hidden="true" className="unified-list-search-icon" />
      {control}
      {value ? <button type="button" className="unified-list-clear" aria-label="Clear search" onClick={() => onChange("")}><X /></button> : null}
    </div>
  );
}

export function UnifiedListHeader({ children, resultCount, resetHref, filtered = false, activeCount = 0, className, phoneOnly = false, phoneMode = "drawer", phonePrimary = "inline" }: HeaderProps) {
  // The first client render must match SSR exactly. Viewport detection belongs
  // in the effect below; reading matchMedia in the state initializer rendered
  // different desktop/mobile trees and caused hydration recovery on every
  // phone-sized list route.
  const [mobile, setMobile] = useState(phoneOnly);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (phoneOnly) return;
    const query = window.matchMedia("(max-width: 639px)");
    const sync = () => setMobile(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, [phoneOnly]);

  useEffect(() => {
    if (!mobile || !open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = filterTriggerRef.current;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.mobileSheetOpen = "true";
    const dialog = filterDialogRef.current;
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>("button, a, input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? []).filter((element) => !element.hasAttribute("disabled"));
    focusable()[0]?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusable();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.mobileSheetOpen;
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [mobile, open]);

  useEffect(() => {
    if (!mobile && open) setOpen(false);
  }, [mobile, open]);

  const all = flattenChildren(children);
  const candidates = all.filter((child) => !isAction(child) && !isFilterMore(child) && !isHiddenControl(child));
  const primary = candidates.find(isSearchControl) ?? candidates.find(isPrimaryControl);
  const more = all.find(isFilterMore);
  const filters = useMemo(() => all.filter((child) => child !== primary && !isAction(child) && !isFilterMore(child)), [all, primary]);
  const nested = more && isValidElement(more) ? flattenChildren(propsOf(more).children as ReactNode) : [];
  const contextualFilterCount = filters.length + nested.length;
  const resolvedPhoneMode = phoneMode;
  const primaryInDrawer = resolvedPhoneMode === "drawer" && phonePrimary === "drawer";
  const active = activeCount || (more && isValidElement(more) && typeof propsOf(more).activeCount === "number" ? propsOf(more).activeCount as number : 0);
  const primaryProps = primary && isValidElement(primary) ? propsOf(primary) : {};
  const initialSearchValue = typeof primaryProps.defaultValue === "string"
    ? primaryProps.defaultValue
    : typeof primaryProps.value === "string" ? primaryProps.value : "";
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const updateSearch = (next: string) => {
    setSearchValue(next);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => formRef.current?.requestSubmit(), 300);
  };

  if (!mobile) {
    const desktopActions = all.filter(isAction);
    const desktopHidden = all.filter(isHiddenControl);
    const desktopControls = all.filter((child) => !isAction(child) && !isHiddenControl(child));
    const tabletColumns = Math.min(Math.max(desktopControls.length, 1), 4);
    const tabletLayout = desktopControls.some(isQueryControl)
      ? "query"
      : desktopControls.length > 2
        ? "controls"
        : "compact";
    const actionNodes = desktopActions.map((child) => {
      if (!isValidElement(child)) return child;
      const props = propsOf(child);
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        className: cn("unified-list-action", props.className as string),
        "data-list-primary-action": true,
      });
    });
    return <form
      className={cn("sb-list-filters sb-list-query-card", className)}
      data-unified-list-desktop="true"
      data-tablet-query-layout={tabletLayout}
      data-filtered={filtered || undefined}
      data-reset-href={resetHref}
      style={{ "--sb-list-tablet-columns": tabletColumns } as CSSProperties}
    >
      {desktopControls}
      {desktopHidden}
      <div className="unified-list-desktop-actions">
        {actionNodes}
        {typeof resultCount === "number" ? <div className="sb-filter-summary" aria-live="polite"><span>{resultCount} {resultCount === 1 ? "record" : "records"}</span></div> : null}
      </div>
    </form>;
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => { button.disabled = true; button.dataset.pending = "true"; });
  };
  const filterControls = <>{primaryInDrawer ? primary : null}{filters}{nested}</>;
  const filterSheet = open && typeof document !== "undefined" ? createPortal(
    <div className="unified-list-layer">
      <button type="button" className="unified-list-backdrop" aria-label="Close filters" onClick={() => setOpen(false)} />
      <form ref={filterDialogRef} className="unified-list-sheet" role="dialog" aria-modal="true" aria-label="Filters" onSubmit={submit}>
        {primary && isValidElement(primary) ? (() => {
          const hidden = hiddenFilterValue(primary);
          return hidden ? <input type="hidden" name={hidden.name} value={searchValue || hidden.value} /> : null;
        })() : null}
        <header className="unified-list-sheet-header"><h2>Filters</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close filters"><X /></button></header>
        <div className="unified-list-sheet-fields">{filterControls}</div>
        <footer className="unified-list-sheet-actions"><Button asChild type="button" variant="ghost"><Link href={resetHref}>Reset</Link></Button><Button type="submit">Apply filters</Button></footer>
      </form>
    </div>,
    document.body,
  ) : null;
  return (
    <form ref={formRef} className={cn("unified-list-header sb-list-query-card", className)} data-filtered={filtered || undefined} data-reset-href={resetHref} onSubmit={submit}>
      <div className={cn("unified-list-row", primaryInDrawer && "unified-list-row--filter-only")}>
        {!primaryInDrawer && primary && isValidElement(primary) ? <SearchControl child={primary} value={searchValue} onChange={updateSearch} /> : null}
        {resolvedPhoneMode === "drawer" ? <button ref={filterTriggerRef} type="button" className="unified-list-filter-trigger" onClick={() => setOpen(true)} aria-label={active ? `Filter, ${active} active` : "Filter"} aria-haspopup="dialog" aria-expanded={open}><SlidersHorizontal /><span className="unified-list-filter-label">Filter{active ? ` (${active})` : ""}</span></button> : null}
        {resolvedPhoneMode === "inline" && contextualFilterCount === 1 ? <div className="unified-list-inline-control">{filterControls}</div> : null}
        {typeof resultCount === "number" ? <span className="unified-list-result" aria-live="polite">{resultCount} {resultCount === 1 ? "record" : "records"}</span> : null}
      </div>
      {resolvedPhoneMode === "inline" && contextualFilterCount > 1 ? <div className="unified-list-inline-fields">{filterControls}</div> : null}
      {resolvedPhoneMode === "drawer" && !open ? [...filters, ...nested].map((child, index) => {
        const hidden = hiddenFilterValue(child);
        return hidden ? <input key={`${hidden.name}-${index}`} type="hidden" name={hidden.name} value={hidden.value} /> : null;
      }) : null}
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Search</button>
      {filterSheet}
    </form>
  );
}
