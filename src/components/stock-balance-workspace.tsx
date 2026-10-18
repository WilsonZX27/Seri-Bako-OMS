"use client";
import { containDialogTab, focusDialog } from "@/lib/dialog-focus";
import { hasActiveFilters } from "@/lib/table-state";
import { createPortal } from "react-dom";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/system-states";
import { SelectControl } from "@/components/ui/select-control";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { OperationalList, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatQuantityInput, getToday } from "@/lib/utils";
import { createPurchaseRequestsFromBasket } from "@/server/actions/procurement";
import { StockBalanceOperationalRows, StockBalanceTableRows, type StockBalanceRow } from "@/components/stock-balance-table";
import { ItemThumbnail } from "@/components/ui/item-thumbnail";
import { SelectNative } from "@/components/ui/select-native";
import { uomOptionsWithCurrent } from "@/lib/uom";

type BranchOption = { id: string; branch_name: string };
type BasketLine = StockBalanceRow & { qty: string; uom: string };

function rowKey(item: StockBalanceRow) {
  return `${item.item_id}-${item.branch_id ?? "all"}`;
}

function normalizeBranchId(branchId: string | null) {
  return branchId ?? "unassigned";
}

function groupBasketRows(rows: BasketLine[]) {
  const map = new Map<string, BasketLine[]>();
  rows.forEach((line) => {
    const key = normalizeBranchId(line.branch_id);
    const list = map.get(key) ?? [];
    list.push(line);
    map.set(key, list);
  });
  return map;
}

function groupBySupplier(rows: BasketLine[]) {
  const map = new Map<string, BasketLine[]>();
  rows.forEach((line) => {
    const key = line.supplier_id ?? "unassigned";
    map.set(key, [...(map.get(key) ?? []), line]);
  });
  return Array.from(map.entries()).sort(([, a], [, b]) => (a[0]?.supplier_name ?? "Unassigned").localeCompare(b[0]?.supplier_name ?? "Unassigned"));
}

export function StockBalanceWorkspace({
  rows,
  totalValue,
  filters,
  branches,
  suppliers = [],
  totalRows,
  summaryTotal,
  totalPages,
  page,
  lowStock,
  negative,
  queryError,
  hasCreatePr,
}: {
  rows: StockBalanceRow[];
  totalValue: number | null;
  filters: Record<string, string | undefined>;
  branches: BranchOption[];
  suppliers?: Array<{ id: string; name: string }>;
  totalRows: number;
  summaryTotal: number | null;
  totalPages: number;
  page: number;
  lowStock: number | null;
  negative: number | null;
  queryError: string | null;
  hasCreatePr: boolean;
}) {
  const [basket, setBasket] = useState<Record<string, BasketLine>>({});
  const [basketStorageReady, setBasketStorageReady] = useState(false);
  const basketDialogRef = useRef<HTMLElement>(null);
  const [basketOpen, setBasketOpen] = useState(Boolean(filters.error));
  const [branchConflict, setBranchConflict] = useState<{ current: string; attempted: string } | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const branchNameById = useMemo(() => new Map<string, string>(branches.map((branch) => [branch.id, branch.branch_name])), [branches]);
  const basketStorageKey = useMemo(() => {
    const scope = branches.map((branch) => branch.id).sort().join(".") || "unassigned";
    return `seri-bako:stock-balance-pr-basket:v2:${scope}`;
  }, [branches]);

  useEffect(() => {
    setBasketStorageReady(false);
    try {
      const raw = window.localStorage.getItem(basketStorageKey);
      if (!raw) {
        setBasket({});
      } else {
        const parsed = JSON.parse(raw) as Record<string, BasketLine>;
        const accessibleBranchIds = new Set(branches.map((branch) => branch.id));
        const restored = Object.fromEntries(Object.entries(parsed).filter(([key, line]) => (
          Boolean(key) && Boolean(line) && typeof line.item_id === "string" && typeof line.item_name === "string"
          && typeof line.qty === "string" && typeof line.uom === "string" && Boolean(line.branch_id) && accessibleBranchIds.has(line.branch_id as string)
        )).map(([key, line]) => [key, { ...line, uom: line.uom || line.purchase_unit || line.base_unit, item_status: line.item_status === "active" ? "active" : "unknown" }]).slice(0, 500)) as Record<string, BasketLine>;
        const firstBranch = Object.values(restored)[0]?.branch_id;
        setBasket(Object.fromEntries(Object.entries(restored).filter(([, line]) => line.branch_id === firstBranch)));
      }
    } catch {
      setBasket({});
    } finally {
      setBasketStorageReady(true);
    }
  }, [basketStorageKey, branches]);

  useEffect(() => {
    if (!basketStorageReady) return;
    try {
      if (Object.keys(basket).length) window.localStorage.setItem(basketStorageKey, JSON.stringify(basket));
      else window.localStorage.removeItem(basketStorageKey);
    } catch {
      // Basket state remains usable for this session when storage is unavailable.
    }
  }, [basket, basketStorageKey, basketStorageReady]);

  const basketRows = useMemo(() => Object.values(basket), [basket]);
  const basketByBranch = useMemo(() => groupBasketRows(basketRows), [basketRows]);
  const selectableBranchIds = useMemo(() => Array.from(basketByBranch.keys()).filter((branchId) => branchId !== "unassigned"), [basketByBranch]);
  const createBranchId = selectableBranchIds.length === 1 ? selectableBranchIds[0] : "";
  const createRows = useMemo(() => (createBranchId ? basketByBranch.get(createBranchId) ?? [] : []), [createBranchId, basketByBranch]);
  const supplierGroups = useMemo(() => groupBySupplier(createRows), [createRows]);
  const basketPayload = useMemo(() => supplierGroups.map(([supplierId, lines]) => ({
    supplier_id: supplierId === "unassigned" ? null : supplierId,
    lines: lines.map((line) => ({ item_id: line.item_id, qty: line.qty, uom: line.uom, estimated_unit_cost: line.average_cost })),
  })), [supplierGroups]);
  const inactiveRows = useMemo(() => createRows.filter((line) => line.item_status !== "active"), [createRows]);
  const canCreatePr = hasCreatePr && createRows.length > 0 && inactiveRows.length === 0;

  const inBasket = useMemo(() => new Set(Object.keys(basket)), [basket]);
  useEffect(() => {
    if (!basketOpen) return;
    const root = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement as HTMLElement | null;
    const dialog = basketDialogRef.current;
    if (dialog) focusDialog(dialog);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || document.querySelector('[role="listbox"]')) return;
      if (event.key === "Escape") { event.preventDefault(); setBasketOpen(false); }
      if (dialog) containDialogTab(event, dialog);
    };
    document.addEventListener("keydown", onKeyDown);
    root.dataset.mobileSheetOpen = "true";
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      requestAnimationFrame(() => previousFocus?.focus());
      delete root.dataset.mobileSheetOpen;
      document.body.style.overflow = previousOverflow;
    };
  }, [basketOpen]);

  function updateQty(key: string, nextQty: string) {
    setBasket((current) => {
      const existing = current[key];
      if (!existing) return current;
      return { ...current, [key]: { ...existing, qty: nextQty } };
    });
  }

  function updateUom(key: string, uom: string) {
    setBasket((current) => current[key] ? { ...current, [key]: { ...current[key], uom } } : current);
  }

  function toggleBasket(row: StockBalanceRow) {
    if (row.item_status !== "active") return;
    const key = rowKey(row);
    const lockedBranchId = basketRows[0]?.branch_id ?? null;
    if (!basket[key] && lockedBranchId && row.branch_id !== lockedBranchId) {
      setBranchConflict({ current: branchNameById.get(lockedBranchId) ?? "Current branch", attempted: row.branch_name ?? "Another branch" });
      return;
    }
    setBasket((current) => {
      if (current[key]) {
        const next = { ...current };
        delete next[key];
        return next;
      }
      return {
        ...current,
        [key]: { ...row, qty: formatQuantityInput(1), uom: row.purchase_unit || row.base_unit },
      };
    });
  }

  return (
    <>
      <PageHeader title="Stock Balance" description="Calculated from posted Movement Ledger transactions. No direct balance edits." />
      <WorkspaceGrid
        className={hasCreatePr ? "pb-24 xl:pb-0" : undefined}
        hideMobileConsole
        rightRail={
          <>
            <ConsoleSection title="Actions">
              <Button asChild size="sm" className="w-full" data-mobile-primary-action>
                <Link href="/stock-transactions">Open Movement Ledger</Link>
              </Button>
            </ConsoleSection>
            <ConsoleSection title="Stock Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Rows</span><strong>{queryError || summaryTotal === null ? "—" : summaryTotal}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{queryError || lowStock === null ? "—" : lowStock}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Negative</span><strong>{queryError || negative === null ? "—" : negative}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><strong>Branch</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Inventory Value</span>
                <strong>{queryError || totalValue === null ? "—" : formatCurrency(totalValue)}</strong>
              </div>
            </ConsoleSection>
            <ConsoleSection title="PR basket">
              <form action={createPurchaseRequestsFromBasket} className="space-y-3">
                <input type="hidden" name="idempotency_key" value={idempotencyKey} />
                <input type="hidden" name="request_no" value="" />
                <input type="hidden" name="request_date" value={getToday()} />
                <input type="hidden" name="required_date" value="" />
                <input type="hidden" name="priority" value="normal" />
                <input type="hidden" name="branch_id" value={createBranchId} />
                <input type="hidden" name="supplier_groups" value={JSON.stringify(basketPayload)} />

                {hasCreatePr ? (
                  <>
                    <div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div><dt className="text-[10px] text-muted-foreground">Location</dt><dd className="truncate font-semibold">{createBranchId ? branchNameById.get(createBranchId) ?? "Unknown" : "Select"}</dd></div>
                        <div><dt className="text-[10px] text-muted-foreground">PR groups</dt><dd className="font-semibold tabular-nums">{supplierGroups.length || "—"}</dd></div>
                        <div><dt className="text-[10px] text-muted-foreground">Items</dt><dd className="font-semibold tabular-nums">{basketRows.length}</dd></div>
                      </dl>
                      {createRows.length > 0 && createRows.some((line) => !line.supplier_id) ? (
                        <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Items without a supplier will be placed in a separate Draft PR for Purchasing to map.</p>
                      ) : null}
                      {inactiveRows.length ? <p className="mt-1 text-xs text-destructive">Some selected items are no longer active. Remove them and add the current active item from Stock Balance before creating a PR.</p> : null}
                    </div>
                    <div className="max-h-80 divide-y divide-[var(--sb-border-soft)] overflow-y-auto border-y border-[var(--sb-border-soft)]">
                      {Array.from(basketByBranch.entries()).map(([branchId, lines]) => {
                        const isCreateBranch = branchId === createBranchId;
                        return (
                          <div key={branchId} className="space-y-2 py-2.5 first:pt-0 last:pb-0">
                            {(isCreateBranch ? groupBySupplier(lines) : [["preview", lines]] as const).map(([supplierId, supplierLines]) => (
                              <div key={`${branchId}-${supplierId}`} className="space-y-1.5">
                                {isCreateBranch ? <p className="flex items-center justify-between gap-2 rounded-[var(--sb-control-radius)] bg-[var(--sb-surface-muted)] px-2 py-1.5 text-[11px] font-semibold text-[var(--sb-text)]"><span className="truncate uppercase tracking-wide">{supplierLines[0]?.supplier_name ?? "Unassigned supplier"}</span><span className="shrink-0 tabular-nums text-[var(--sb-text-muted)]">{supplierLines.length} item{supplierLines.length === 1 ? "" : "s"}</span></p> : null}
                                {supplierLines.map((line, lineIndex) => {
                              const key = rowKey(line);
                              return (
                                <div key={key} className="space-y-1 border-b border-[var(--sb-border-soft)] py-1.5 last:border-0">
                                  <p className="truncate text-[13px] font-semibold leading-4"><span className="mr-1.5 text-[10px] tabular-nums text-[var(--sb-text-muted)]">{lineIndex + 1}.</span>{line.item_name}</p>
                                  <p className="truncate text-[10px] leading-4 text-[var(--sb-text-muted)]">{line.item_code}{isCreateBranch ? "" : ` · ${line.supplier_name ?? "Supplier mapping missing"}`}</p>
                                  {isCreateBranch ? (
                                    <>
                                      <div className="flex items-center justify-between gap-2">
                                        <QuantityStepper
                                          value={line.qty}
                                          uom={null}
                                          step={0.01}
                                          density="dense"
                                          label={`Quantity for ${line.item_name}`}
                                          onChange={(value) => updateQty(key, value)}
                                          className="min-w-0 flex-1"
                                        />
                                        <SelectNative className="h-8 w-20 shrink-0 px-2 text-[10px] font-semibold" aria-label={`Purchase UOM for ${line.item_name}`} value={line.uom} onChange={(event) => updateUom(key, event.target.value)}>{uomOptionsWithCurrent(line.purchase_unit || line.base_unit).map((uom) => <option key={uom} value={uom}>{uom}</option>)}</SelectNative>
                                        <button
                                          type="button"
                                          className="inline-flex h-8 w-7 shrink-0 items-center justify-center text-[var(--sb-danger)] hover:bg-[var(--sb-danger-soft)]"
                                          onClick={() => toggleBasket(line)}
                                          aria-label={`Remove ${line.item_name} from PR basket`}
                                        >
                                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                      </div>
                                      <div className="grid gap-2 text-xs">
                                        <input type="hidden" name="line_item_id" value={line.item_id} />
                                        <input type="hidden" name="line_branch_id" value={line.branch_id ?? ""} />
                                        <input type="hidden" name="line_uom" value={line.uom} />
                                        <input type="hidden" name="line_estimated_unit_cost" value="0" />
                                        <input type="hidden" name="line_suggested_supplier_id" value="" />
                                        <input type="hidden" name="line_reason" value="" />
                                        <input type="hidden" name="line_remarks" value="" />
                                      </div>
                                    </>
                                  ) : null}
                                </div>
                              );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {!basketRows.length ? <p className="py-3 text-xs text-muted-foreground">Add items from the table to the basket to create a PR.</p> : null}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">You do not have permission to create purchase requests.</p>
                )}
                <SubmitButton type="submit" disabled={!canCreatePr} className="w-full" pendingLabel="Creating...">
                  Create PR
                </SubmitButton>
              </form>
            </ConsoleSection>
          </>
        }
        tabletRailMode="split"
        tabletRailBreakpoint="md"
        tabletRailWidth="compact"
      >
        <div className="space-y-3">
          <FilterBar resultCount={totalRows} resetHref="/stock-balance" filtered={Boolean(filters.search || filters.branch_id || filters.status || filters.supplier_id)} className="sb-list-filters--balanced">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, branch, status" />
            <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <SelectControl
              name="status"
              defaultValue={filters.status ?? "all"}
              ariaLabel="Status"
              options={[
                { value: "all", label: "All statuses" },
                { value: "ok", label: "Sufficient" },
                { value: "low_stock", label: "Reorder Needed" },
                { value: "negative", label: "Out of Stock" },
              ]}
            />
            <SelectControl name="supplier_id" defaultValue={filters.supplier_id ?? "all"} ariaLabel="Default supplier" options={[{ value: "all", label: "All default suppliers" }, ...suppliers.map(supplier => ({ value: supplier.id, label: supplier.name }))]} />
            <input type="hidden" name="view" value="branch" />
            {Boolean(filters.search || filters.branch_id || filters.status || filters.supplier_id) ? <Button asChild variant="secondary"><Link href="/stock-balance">Reset</Link></Button> : null}
          </FilterBar>
          <div className="sb-list-content-card overflow-hidden">
          <Table mobileHidden className="sb-stock-balance-table" aria-label="Stock balances" stickyColumn="second">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Action</TableHead>
                <SortableHead label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead>Branch</TableHead>
                <TableHead className="text-right" title="Available / Reserved">Available / Reserved</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right" title="Avg Cost / Value">Avg Cost / Value</TableHead>
                <TableHead title="Last Movement">Last Movement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            {queryError ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={9}>
                    <ErrorState title="库存暂时无法加载" description={queryError} />
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : rows.length ? (
              <StockBalanceTableRows rows={rows} inBasket={inBasket} onToggleBasket={toggleBasket} />
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={9}>
                    <EmptyState title={hasActiveFilters(filters) ? "No balances match these filters" : "No stock balances yet"} description={hasActiveFilters(filters) ? "Reset the filters or search for another item." : "Balances appear after posted stock movements."} action={hasActiveFilters(filters) ? { href: "/stock-balance", label: "Reset filters" } : undefined} />
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
          {queryError ? null : (
            <OperationalList ariaLabel="Stock balances">
              {rows.length ? <StockBalanceOperationalRows rows={rows} inBasket={inBasket} onToggleBasket={toggleBasket} /> : null}
              {!rows.length ? (
                <EmptyState title={hasActiveFilters(filters) ? "No balances match these filters" : "No stock balances yet"} description={hasActiveFilters(filters) ? "Reset the filters or search for another item." : "Balances appear after posted stock movements."} action={hasActiveFilters(filters) ? { href: "/stock-balance", label: "Reset filters" } : undefined} />
              ) : null}
            </OperationalList>
          )}
          <div className="pb-4">
            <PaginationControls page={page} totalPages={totalPages} totalRows={totalRows} searchParams={filters} />
          </div>
          </div>
        </div>
      </WorkspaceGrid>
      {hasCreatePr ? <button
        type="button"
        onClick={() => setBasketOpen(true)}
        className="fixed bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--sb-z-sticky)] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-green-900)] text-white shadow-[0_3px_8px_rgb(6_44_31_/_0.22)] xl:hidden"
        aria-label={`Open PR basket${basketRows.length ? `, ${basketRows.length} selected` : ""}`}
      >
        <ShoppingCart className="h-5 w-5" aria-hidden="true" />
        {basketRows.length ? <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sb-surface-raised)] px-1 text-[10px] font-bold text-[var(--sb-green-900)] shadow-[0_1px_4px_rgb(6_44_31_/_0.18)]">{basketRows.length}</span> : null}
      </button> : null}
      {basketOpen ? createPortal(<div className="fixed inset-0 z-[var(--sb-z-dialog)] xl:hidden">
        <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={() => setBasketOpen(false)} aria-label="Close PR basket" />
        <section ref={basketDialogRef} tabIndex={-1} className="sb-pr-basket-sheet sb-popover-surface absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="PR basket">
          <header className="flex min-h-14 items-center justify-between border-b border-[var(--sb-border-soft)] px-4">
            <div className="min-w-0"><h2 className="text-base font-semibold text-[var(--sb-green-950)]">PR basket</h2><p className="text-xs text-[var(--sb-text-muted)]">{createBranchId ? branchNameById.get(createBranchId) ?? "Unknown location" : "Select location"} · {supplierGroups.length || 0} PR group{supplierGroups.length === 1 ? "" : "s"} · {basketRows.length} item{basketRows.length === 1 ? "" : "s"}</p></div>
            <Button type="button" variant="ghost" size="icon" onClick={() => setBasketOpen(false)} aria-label="Close PR basket"><X className="h-5 w-5" /></Button>
          </header>
          <form action={createPurchaseRequestsFromBasket} className="flex min-h-0 flex-1 flex-col">
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />
            <input type="hidden" name="request_no" value="" />
            <input type="hidden" name="request_date" value={getToday()} />
            <input type="hidden" name="required_date" value="" />
            <input type="hidden" name="priority" value="normal" />
            <input type="hidden" name="branch_id" value={createBranchId} />
            <input type="hidden" name="supplier_groups" value={JSON.stringify(basketPayload)} />
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
              {basketRows.length ? basketRows.map((line) => {
                const key = rowKey(line);
                const activeBranch = normalizeBranchId(line.branch_id) === createBranchId;
                return (
                  <article key={key} className="border-b border-[var(--sb-border-soft)] py-1.5 first:pt-0 last:border-0">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5"><ItemThumbnail src={line.image_url} alt={line.item_name} /><div className="min-w-0"><h3 className="truncate text-[13px] font-semibold leading-4 text-[var(--sb-green-950)]">{line.item_name}</h3><p className="truncate text-[10px] leading-4 text-[var(--sb-text-muted)]">{line.item_code} · {line.supplier_name ?? "Supplier mapping missing"}</p></div></div>
                      <button type="button" className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--sb-danger)] active:bg-[var(--sb-danger-soft)]" onClick={() => toggleBasket(line)} aria-label={`Remove ${line.item_name} from PR basket`}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></button>
                    </div>
                    {activeBranch ? <div className="flex min-w-0 items-stretch gap-1.5">
                      <QuantityStepper value={line.qty} uom={null} step={0.01} density="compact" label={`Quantity for ${line.item_name}`} onChange={(value) => updateQty(key, value)} className="min-w-0 flex-1" />
                      <SelectNative className="h-10 w-24 shrink-0 px-2 text-xs font-semibold" aria-label={`Purchase UOM for ${line.item_name}`} value={line.uom} onChange={(event) => updateUom(key, event.target.value)}>{uomOptionsWithCurrent(line.purchase_unit || line.base_unit).map((uom) => <option key={uom} value={uom}>{uom}</option>)}</SelectNative>
                    </div> : null}
                  </article>
                );
              }) : <p className="py-10 text-center text-sm text-[var(--sb-text-muted)]">Add an item from Stock Balance to prepare a PR.</p>}
            </div>
            <footer className="border-t border-[var(--sb-border-soft)] bg-[var(--sb-surface)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-3px_8px_rgb(6_44_31_/_0.10)]">
              {filters.error ? <p className="mb-2 rounded-[var(--sb-control-radius)] bg-[var(--sb-danger-soft)] px-2.5 py-2 text-xs text-[var(--sb-danger)]">The PR was not created. Review the supplier status below; your basket has been kept.</p> : null}
              {createRows.some((line) => !line.supplier_id) ? <p className="mb-2 text-[10px] leading-4 text-[var(--sb-text-muted)]">Unmapped items will stay together in a Draft PR until Purchasing assigns a supplier.</p> : null}
              {inactiveRows.length ? <p className="mb-2 text-xs text-[var(--sb-danger)]">Some selected items are no longer active. Remove and re-add them from the current Stock Balance list.</p> : null}
              <SubmitButton type="submit" disabled={!canCreatePr} className="min-h-12 w-full" pendingLabel="Creating PR...">Create PR</SubmitButton>
            </footer>
          </form>
        </section>
      </div>, document.body) : null}
      <ModalShell open={Boolean(branchConflict)} onClose={() => setBranchConflict(null)} titleId="stock-branch-conflict-title" className="max-w-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--sb-warning)]" />
          <div><h2 id="stock-branch-conflict-title" className="font-semibold">One branch per PR basket</h2><p className="mt-1 text-sm text-muted-foreground">This basket already contains items from {branchConflict?.current}. Remove them before adding an item from {branchConflict?.attempted}.</p></div>
        </div>
        <Button type="button" className="mt-4 w-full" onClick={() => setBranchConflict(null)}>Keep current basket</Button>
      </ModalShell>
    </>
  );
}
