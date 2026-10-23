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
  type FormEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { cn } from "@/lib/utils";
import { containDialogTab, focusDialog } from "@/lib/dialog-focus";
import styles from "./UnifiedListHeader.module.css";

type HeaderProps = {
  children: ReactNode;
  actions?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  resultCount?: number;
  resultLabel?: string;
  resetHref: string;
  filtered?: boolean;
  activeCount?: number;
  className?: string;
  phoneOnly?: boolean;
  phoneMode?: "drawer" | "inline";
  tabletMode?: "drawer" | "inline" | "auto";
  phonePrimary?: "inline" | "drawer";
  /** Opt-in persistent compact filters; other routes keep their existing layout. */
  compactPinnedFields?: string[];
  inlineFieldsShareQueryTracks?: boolean;
  /** Keep both responsive form trees in the SSR HTML so CSS selects the first visible frame. */
  stableResponsive?: boolean;
  /** Keep the compact Filter action understandable with a short visible label. */
  showFilterLabel?: boolean;
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
  return props.type === "submit"
    || props["data-list-action"] === "primary"
    || props["data-list-action"] === "secondary"
    || (props.asChild === true && (props.variant === "secondary" || props.variant === "outline"));
}

function isSearchSubmit(child: ReactNode) {
  const props = propsOf(child);
  return props.type === "submit" && typeof props.children === "string" && /^(search|filter)$/i.test(props.children.trim());
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

function SearchControl({ child, value, onChange, shared = false }: { child: ReactElement; value: string; onChange: (value: string) => void; shared?: boolean }) {
  const props = propsOf(child);

  if (props.type === "date") {
    return <Input {...props} type="date" defaultValue={undefined} value={value}
      onChange={(event) => {
        if (typeof props.onChange === "function") props.onChange(event);
        onChange(event.target.value);
      }} className={cn("unified-list-primary-control", props.className as string)} />;
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
    // Keep the complete search scope accessible without clipping long hints.
    placeholder: "Search",
    title: String(props["aria-label"] ?? props.placeholder ?? "Search"),
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      if (typeof props.onChange === "function") props.onChange(event);
      onChange(event.target.value);
    },
    className: cn(shared ? styles.searchInput : "unified-list-primary-input", props.className as string),
  });

  return (
    <div className={shared ? styles.primary : "unified-list-primary-control"} data-query-control data-search-control>
      <Search aria-hidden="true" className={shared ? styles.searchIcon : "unified-list-search-icon"} />
      {control}
      {value ? <button type="button" className={shared ? styles.clear : "unified-list-clear"} aria-label="Clear search" onClick={() => onChange("")}><X /></button> : null}
    </div>
  );
}

export function UnifiedListHeader({ children, actions, onSubmit, resultCount, resultLabel, resetHref, filtered = false, activeCount = 0, className, phoneOnly = false, phoneMode = "drawer", tabletMode = "drawer", phonePrimary = "inline", compactPinnedFields = [], inlineFieldsShareQueryTracks = false, stableResponsive = false, showFilterLabel = false }: HeaderProps) {
  // The first client render must match SSR exactly. Viewport detection belongs
  // in the effect below; reading matchMedia in the state initializer rendered
  // different desktop/mobile trees and caused hydration recovery on every
  // phone-sized list route.
  const [mobile, setMobile] = useState(phoneOnly);
  const [tablet, setTablet] = useState(false);
  const [open, setOpen] = useState(false);
  const desktopFormRef = useRef<HTMLFormElement>(null);
  const mobileFormRef = useRef<HTMLFormElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterDialogRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (phoneOnly) return;
    const query = window.matchMedia("(max-width: 1279px)");
    const tabletQuery = window.matchMedia("(min-width: 640px) and (max-width: 1279px)");
    const sync = () => setMobile(query.matches);
    const syncTablet = () => setTablet(tabletQuery.matches);
    sync();
    syncTablet();
    query.addEventListener("change", sync);
    tabletQuery.addEventListener("change", syncTablet);
    return () => { query.removeEventListener("change", sync); tabletQuery.removeEventListener("change", syncTablet); };
  }, [phoneOnly]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const trigger = filterTriggerRef.current;
    document.body.style.overflow = "hidden";
    document.documentElement.dataset.mobileSheetOpen = "true";
    const dialog = filterDialogRef.current;
    if (dialog) focusDialog(dialog);

    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (dialog) containDialogTab(event, dialog);
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      delete document.documentElement.dataset.mobileSheetOpen;
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => trigger?.focus());
    };
  }, [open]);

  const all = flattenChildren(children);
  const candidates = all.filter((child) => !isAction(child) && !isFilterMore(child) && !isHiddenControl(child));
  const primary = candidates.find(isSearchControl) ?? candidates.find(isPrimaryControl);
  const hasTextSearch = Boolean(primary && isValidElement(primary) && isSearchControl(primary));
  // Compact layouts own this row. Desktop retains its existing inline controls.
  const sharedSearchRow = mobile && hasTextSearch && !phoneOnly && actions === undefined;
  const more = all.find(isFilterMore);
  const filters = useMemo(() => all.filter((child) => child !== primary && !isAction(child) && !isFilterMore(child)), [all, primary]);
  const nested = more && isValidElement(more) ? flattenChildren(propsOf(more).children as ReactNode) : [];
  const contextualFilterCount = filters.filter(child => !isHiddenControl(child)).length + nested.filter(child => !isHiddenControl(child)).length;
  const resolvedPhoneMode = phoneMode;
  const resolvedTabletMode = tabletMode === "auto" ? (contextualFilterCount <= 3 ? "inline" : "drawer") : tabletMode;
  const compactDrawer = sharedSearchRow || (tablet ? resolvedTabletMode === "drawer" : resolvedPhoneMode === "drawer");
  const compactInline = !sharedSearchRow && (tablet ? resolvedTabletMode === "inline" : resolvedPhoneMode === "inline");
  const primaryInDrawer = !sharedSearchRow && (tablet ? resolvedTabletMode === "drawer" : resolvedPhoneMode === "drawer") && phonePrimary === "drawer";
  const activeValues = new Map([...filters, ...nested].map(hiddenFilterValue).filter((field): field is { name: string; value: string } => Boolean(field)).map((field) => [field.name, field.value]));
  const active = Math.max(activeCount, [...activeValues.values()].filter(value => value !== "" && value !== "all").length, more && isValidElement(more) && typeof propsOf(more).activeCount === "number" ? propsOf(more).activeCount as number : 0);
  const primaryProps = primary && isValidElement(primary) ? propsOf(primary) : {};
  const initialSearchValue = typeof primaryProps.defaultValue === "string"
    ? primaryProps.defaultValue
    : typeof primaryProps.value === "string" ? primaryProps.value : "";
  const [searchValue, setSearchValue] = useState(initialSearchValue);
  const [pinnedValues, setPinnedValues] = useState<Record<string, string>>({});
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const updateSearch = (next: string) => {
    setSearchValue(next);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };

  const queueQuery = () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      const compact = sharedSearchRow || (stableResponsive && !phoneOnly ? window.matchMedia("(max-width: 1279px)").matches : mobile);
      (compact ? mobileFormRef : desktopFormRef).current?.requestSubmit();
    }, 300);
  };
  const cancelDebounceOnEnter = (event: ReactKeyboardEvent<HTMLFormElement>) => {
    if (event.key === "Enter" && searchTimerRef.current) clearTimeout(searchTimerRef.current);
  };
  const queryControl = (child: ReactNode, index: number): ReactNode => {
    if (!isValidElement(child)) return child;
    const props = propsOf(child);
    if (isSearchControl(child)) return <SearchControl key={child.key ?? index} child={child} value={searchValue} onChange={updateSearch} />;
    if (props.options && props.name) return cloneElement(child as ReactElement<Record<string, unknown>>, {
      key: child.key ?? index,
      ...(typeof props.onValueChange !== "function" && props.value !== undefined ? { value: undefined, defaultValue: props.value } : {}),
      onValueChange: (value: string) => {
        if (typeof props.onValueChange === "function") props.onValueChange(value);
        queueQuery();
      },
    });
    if (props.children && isFilterMore(child)) return cloneElement(child as ReactElement<Record<string, unknown>>, { children: flattenChildren(props.children as ReactNode).map(queryControl) });
    return cloneElement(child as ReactElement<Record<string, unknown>>, { key: child.key ?? index, "data-query-control": isQueryControl(child) || undefined });
  };

  if (actions !== undefined) return <form ref={desktopFormRef} className={cn("sb-list-query-card sb-query-explicit",className)} method="get" onSubmit={onSubmit}>
    <div className="sb-query-fields">{children}</div>
    <div className="sb-query-actions">{typeof resultCount==="number"?<span className="sb-query-result" aria-live="polite">{resultCount} {resultLabel??"records"}</span>:null}{actions}</div>
  </form>;

  const renderBoth = stableResponsive && !phoneOnly && !sharedSearchRow;
  const desktopForm = !sharedSearchRow && (!mobile || renderBoth) ? (() => {
    const availableActions = all.filter(isAction);
    const resetAction = availableActions.find((child) => propsOf(child)["data-list-action"] === "secondary");
    const desktopActions = availableActions.filter((child) => propsOf(child)["data-list-action"] !== "secondary");
    if (filtered && resetAction) desktopActions.push(resetAction);
    const showSearchAction = hasTextSearch && !all.some(isSearchSubmit);
    const desktopHidden = all.filter(isHiddenControl);
    const desktopControls = all.filter((child) => !isAction(child) && !isHiddenControl(child));
    // Tablet has one shared grammar: a query owns two filter tracks, each
    // secondary filter owns one, and the right-aligned command group (submit
    // plus count) owns two. Counting only secondary filters is important here;
    // counting every child made routes with a search field reserve an empty
    // track and pushed the command group away from the filters.
    const filterCount = desktopControls.filter((child) => !isQueryControl(child)).length;
    const hasCommandGroup = desktopActions.length > 0 || showSearchAction || typeof resultCount === "number";
    const commandTrackCount = Math.max(2, desktopActions.length + Number(showSearchAction) + (typeof resultCount === "number" ? 1 : 0));
    const tabletColumns = Math.min(Math.max(2 + filterCount + (hasCommandGroup ? commandTrackCount : 0), 4), 8);
    const tabletLayout = desktopControls.some(isQueryControl)
      ? "query"
      : desktopControls.length > 2
        ? "controls"
        : "compact";
    const actionNodes = desktopActions.map((child, index) => {
      if (!isValidElement(child)) return child;
      const props = propsOf(child);
      return cloneElement(child as ReactElement<Record<string, unknown>>, {
        ...(props["data-list-action"] === "secondary" ? { variant: "ghost" } : {}),
        className: cn("unified-list-action", props["data-list-action"] === "secondary" && "!w-auto !min-w-0 !border-transparent !bg-transparent !px-2", hasTextSearch && isSearchSubmit(child) && "unified-list-search-submit", props.className as string),
        "data-list-primary-action": !showSearchAction && index === 0 ? true : undefined,
        "data-list-secondary-action": showSearchAction || index > 0 ? true : undefined,
        ...(hasTextSearch && isSearchSubmit(child) ? { title: "Search", "aria-label": "Search", children: <><Search className="size-4 shrink-0" aria-hidden="true"/><span className="sr-only">Search</span></> } : {}),
      });
    });
    return <form
      ref={desktopFormRef}
      method="get"
      onSubmit={onSubmit}
      onChange={(event) => {
        if ((event.target as HTMLElement).closest?.("[data-search-control]")) return;
        queueQuery();
      }}
      onKeyDown={cancelDebounceOnEnter}
      className={cn("sb-list-filters sb-list-query-card", renderBoth && "sb-stable-desktop-form", className)}
      data-unified-list-desktop="true"
      data-tablet-query-layout={tabletLayout}
      data-filtered={filtered || undefined}
      data-reset-href={resetHref}
      style={{ "--sb-list-tablet-columns": tabletColumns } as CSSProperties}
    >
      {desktopControls.map(queryControl)}
      {desktopHidden}
      <div
        className="unified-list-desktop-actions"
        style={{ gridColumn: `-${commandTrackCount + 1} / -1` }}
      >
        {showSearchAction ? <Button type="submit" title="Search" aria-label="Search" className="unified-list-action unified-list-search-submit" data-list-primary-action="true" onClick={() => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }}><Search className="size-4 shrink-0" aria-hidden="true"/><span className="sr-only">Search</span></Button> : null}
        {actionNodes}
        {typeof resultCount === "number" ? <div className="sb-filter-summary" aria-live="polite"><span className="sb-filter-summary-count">{resultCount}</span><span className="sb-filter-summary-label">{resultLabel ?? (resultCount === 1 ? "record" : "records")}</span></div> : null}
      </div>
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Apply query</button>
    </form>;
  })() : null;
  if (!renderBoth && !mobile && !sharedSearchRow) return desktopForm;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    onSubmit?.(event);
    if (event.defaultPrevented) return;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((button) => { button.disabled = true; button.dataset.pending = "true"; });
  };
  const editableFilter = (child: ReactNode, index: number) => {
    if (!isValidElement(child)) return child;
    const props = propsOf(child);
    if (isStatusTabs(child)) {
      const statuses = (props.statuses ?? []) as Array<string | { value: string; label: string }>;
      return <SelectControl key={child.key ?? index} name={String(props.name ?? "status")} defaultValue={String(props.activeStatus || props.defaultStatus || "all")} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, ...statuses.map(status => typeof status === "string" ? { value: status, label: status.replaceAll("_", " ") } : status)]} />;
    }
    return props.options && props.name && props.value !== undefined && typeof props.onValueChange !== "function"
      ? cloneElement(child as ReactElement<Record<string, unknown>>, { key: child.key ?? index, value: undefined, defaultValue: props.value })
      : child;
  };
  const pinnedFilters = filters.filter(child => compactPinnedFields.includes(String(propsOf(child).name)));
  const drawerCandidates = filters.filter(child => !compactPinnedFields.includes(String(propsOf(child).name)));
  const visibleFilterNames = new Set([...drawerCandidates, ...nested].filter(child => !isHiddenControl(child)).map(child => hiddenFilterValue(child)?.name).filter(Boolean));
  const drawerFilters = drawerCandidates.filter(child => !isHiddenControl(child) || !visibleFilterNames.has(String(propsOf(child).name)));
  const filterControls = <>{primaryInDrawer ? primary : null}{drawerFilters.map(editableFilter)}{nested.map(editableFilter)}</>;
  const filterSheet = open && typeof document !== "undefined" ? createPortal(
    <div className={styles.layer}>
      <button type="button" className={styles.backdrop} aria-label="Close filters" onClick={() => setOpen(false)} />
      <form ref={filterDialogRef} tabIndex={-1} className={styles.sheet} role="dialog" aria-modal="true" aria-label="Filters" onSubmit={submit}>
        {!primaryInDrawer && primary && isValidElement(primary) ? (() => {
          const hidden = hiddenFilterValue(primary);
          return hidden ? <input type="hidden" name={hidden.name} value={searchValue} /> : null;
        })() : null}
        {pinnedFilters.map(child => { const field = hiddenFilterValue(child); return field ? <input key={field.name} type="hidden" name={field.name} value={pinnedValues[field.name] ?? field.value} /> : null; })}
        <header className={styles.sheetHeader}><h2>Filters</h2><button type="button" onClick={() => setOpen(false)} aria-label="Close filters"><X /></button></header>
        <div className={styles.sheetFields}>{filterControls}</div>
        <footer className={styles.sheetActions}><Button asChild type="button" variant="ghost"><Link href={resetHref}>Reset</Link></Button><Button type="submit">Apply filters</Button></footer>
      </form>
    </div>,
    document.body,
  ) : null;
  const showMobileSearchAction = hasTextSearch && !primaryInDrawer;
  const showMobileDateAction = primaryProps.type === "date" && !primaryInDrawer && contextualFilterCount === 0;
  const mobileForm = (
    <form ref={mobileFormRef} className={cn(sharedSearchRow ? styles.card : "unified-list-header sb-list-query-card", renderBoth && "sb-stable-mobile-form", className)} data-shared-search-row={sharedSearchRow || undefined} data-tablet-mode={resolvedTabletMode} data-inline-field-count={contextualFilterCount} data-filtered={filtered || undefined} data-reset-href={resetHref} onSubmit={submit} onKeyDown={cancelDebounceOnEnter}>
      {(!primaryInDrawer && primary || resolvedPhoneMode === "drawer" || contextualFilterCount === 1 || typeof resultCount === "number") ? <div className={sharedSearchRow ? styles.row : cn("unified-list-row", (primaryInDrawer || !primary) && "unified-list-row--filter-only")}>
        {!primaryInDrawer && primary && isValidElement(primary) ? <SearchControl shared={sharedSearchRow} child={primary} value={searchValue} onChange={(value) => { updateSearch(value); if (compactPinnedFields.length && primaryProps.type === "date") queueQuery(); }} /> : null}
        {pinnedFilters.map((child, index) => {
          const field = hiddenFilterValue(child);
          if (!field || !isValidElement(child)) return null;
          return <div className="unified-list-pinned-control" key={field.name}>{cloneElement(child as ReactElement<Record<string, unknown>>, {
            key: index, defaultValue: undefined, value: pinnedValues[field.name] ?? field.value,
            onValueChange: (value: string) => { setPinnedValues(current => ({ ...current, [field.name]: value })); queueQuery(); },
          })}</div>;
        })}
        {compactDrawer && !showMobileDateAction ? <button ref={filterTriggerRef} type="button" className={sharedSearchRow ? cn(styles.filterTrigger, showFilterLabel && styles.filterTriggerLabel) : "unified-list-filter-trigger"} onClick={() => setOpen(true)} disabled={contextualFilterCount === 0 && !primaryInDrawer} aria-label={active ? `Filter, ${active} active` : "Filter"} aria-haspopup="dialog" aria-expanded={open}><SlidersHorizontal /><span className={sharedSearchRow ? (showFilterLabel ? styles.filterLabel : "sr-only") : "unified-list-filter-label"}>Filter</span>{active ? <span className={sharedSearchRow ? styles.badge : "unified-list-filter-badge"} aria-hidden="true">{active}</span> : null}</button> : null}
        {showMobileSearchAction ? <Button type="submit" size="icon" variant="default" className={sharedSearchRow ? styles.searchSubmit : "unified-list-search-submit"} aria-label="Search" title="Search" onClick={() => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); }}><Search className="size-4 shrink-0" aria-hidden="true"/></Button> : null}
        {showMobileDateAction ? <Button type="submit" className="unified-list-date-submit">View</Button> : null}
        {compactInline && contextualFilterCount === 1 ? <div className="unified-list-inline-control">{filterControls}</div> : null}
        {typeof resultCount === "number" ? <span className={sharedSearchRow ? styles.result : "unified-list-result"} aria-live="polite"><strong>{resultCount}</strong><span>{resultLabel ?? (resultCount === 1 ? "record" : "records")}</span></span> : null}
        {inlineFieldsShareQueryTracks && compactInline && contextualFilterCount > 1 ? <div className="unified-list-inline-fields" data-share-query-tracks>{filterControls}</div> : null}
      </div> : null}
      {resolvedPhoneMode === "inline" ? all.filter(isHiddenControl) : null}
      {compactInline && contextualFilterCount > 1 && !inlineFieldsShareQueryTracks ? <div className="unified-list-inline-fields">{filterControls}</div> : null}
      {compactDrawer && !open ? [...drawerFilters, ...nested].map((child, index) => {
        const hidden = hiddenFilterValue(child);
        return hidden ? <input key={`${hidden.name}-${index}`} type="hidden" name={hidden.name} value={hidden.value} /> : null;
      }) : null}
      <button type="submit" className="sr-only" tabIndex={-1} aria-hidden="true">Search</button>
      {filterSheet}
    </form>
  );
  return renderBoth ? <>{desktopForm}{mobileForm}</> : mobileForm;
}
