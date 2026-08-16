"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { SelectNative } from "@/components/ui/select-native";
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
import { uomOptionsWithCurrent } from "@/lib/uom";
import { createPurchaseRequestsFromBasket } from "@/server/actions/procurement";
import { StockBalanceOperationalRows, StockBalanceTableRows, type StockBalanceRow } from "@/components/stock-balance-table";
import { ItemThumbnail } from "@/components/ui/item-thumbnail";

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
  totalRows,
  totalPages,
  page,
  lowStock,
  negative,
  queryError,
  hasCreatePr,
}: {
  rows: StockBalanceRow[];
  totalValue: number;
  filters: Record<string, string | undefined>;
  branches: BranchOption[];
  totalRows: number;
  totalPages: number;
  page: number;
  lowStock: number;
  negative: number;
  queryError: string | null;
  hasCreatePr: boolean;
}) {
  const [basket, setBasket] = useState<Record<string, BasketLine>>({});
  const [basketStorageReady, setBasketStorageReady] = useState(false);
  const [basketOpen, setBasketOpen] = useState(false);
  const [requestedBranchId, setRequestedBranchId] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const branchNameById = useMemo(() => new Map<string, string>(branches.map((branch) => [branch.id, branch.branch_name])), [branches]);
  const basketStorageKey = useMemo(() => {
    const scope = branches.map((branch) => branch.id).sort().join(".") || "unassigned";
    return `seri-bako:stock-balance-pr-basket:v1:${scope}`;
  }, [branches]);

  useEffect(() => {
    setBasketStorageReady(false);
    try {
      const raw = window.localStorage.getItem(basketStorageKey);
      if (!raw) {
        setBasket({});
      } else {
        const parsed = JSON.parse(raw) as Record<string, BasketLine>;
        const restored = Object.fromEntries(Object.entries(parsed).filter(([key, line]) => (
          Boolean(key) && Boolean(line) && typeof line.item_id === "string" && typeof line.item_name === "string"
          && typeof line.qty === "string" && typeof line.uom === "string"
        )).slice(0, 500));
        setBasket(restored);
      }
    } catch {
      setBasket({});
    } finally {
      setBasketStorageReady(true);
    }
  }, [basketStorageKey]);

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
  const createBranchId = useMemo(() => {
    if (requestedBranchId && requestedBranchId !== "unassigned" && basketByBranch.has(requestedBranchId)) return requestedBranchId;
    return "";
  }, [requestedBranchId, basketByBranch]);
  const createRows = useMemo(() => (createBranchId ? basketByBranch.get(createBranchId) ?? [] : []), [createBranchId, basketByBranch]);
  const supplierGroups = useMemo(() => groupBySupplier(createRows), [createRows]);
  const basketPayload = useMemo(() => supplierGroups.filter(([supplierId]) => supplierId !== "unassigned").map(([supplierId, lines]) => ({
    supplier_id: supplierId,
    lines: lines.map((line) => ({ item_id: line.item_id, qty: line.qty, uom: line.uom, estimated_unit_cost: line.average_cost })),
  })), [supplierGroups]);
  const canCreatePr = hasCreatePr && createRows.length > 0 && createRows.every((line) => Boolean(line.supplier_id));

  const inBasket = useMemo(() => new Set(Object.keys(basket)), [basket]);
  const selectableBranchSet = useMemo(() => new Set(selectableBranchIds), [selectableBranchIds]);

  useEffect(() => {
    if (selectableBranchIds.length === 1) {
      setRequestedBranchId(selectableBranchIds[0]);
      return;
    }
    if (!selectableBranchSet.has(requestedBranchId)) {
      setRequestedBranchId("");
    }
    if (selectableBranchIds.length === 0) {
      setRequestedBranchId("");
    }
  }, [selectableBranchIds, selectableBranchSet, requestedBranchId]);

  useEffect(() => {
    if (!basketOpen) return;
    const root = document.documentElement;
    const previousOverflow = document.body.style.overflow;
    root.dataset.mobileSheetOpen = "true";
    document.body.style.overflow = "hidden";
    return () => {
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

  function updateUom(key: string, nextUom: string) {
    setBasket((current) => {
      const existing = current[key];
      if (!existing) return current;
      return { ...current, [key]: { ...existing, uom: nextUom } };
    });
  }

  function toggleBasket(row: StockBalanceRow) {
    const key = rowKey(row);
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
                <div className="flex justify-between"><span className="text-muted-foreground">Rows Shown</span><strong>{queryError ? "—" : totalRows}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{queryError ? "—" : lowStock}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Negative</span><strong>{queryError ? "—" : negative}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><strong>Branch</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Inventory Value</span>
                <strong>{queryError ? "—" : formatCurrency(totalValue)}</strong>
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
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-xs font-semibold text-[var(--sb-text-muted)]">{basketRows.length} item{basketRows.length === 1 ? "" : "s"}</p>
                        <p className="truncate text-[10px] text-[var(--sb-text-muted)]">{basketStorageReady ? "Saved on this device" : "Restoring..."}</p>
                      </div>
                      {createRows.length > 0 && createRows.some((line) => !line.supplier_id) ? (
                        <p className="mt-1 text-xs text-destructive">Some selected items have no supplier mapping. Map them before creating PRs.</p>
                      ) : null}
                      {supplierGroups.length > 1 ? <p className="mt-1 text-xs text-muted-foreground">Different suppliers will be split into {supplierGroups.length} separate PRs.</p> : null}
                    </div>
                    {selectableBranchIds.length > 1 ? (
                      <div>
                        <label className="text-xs font-semibold text-[var(--sb-text-muted)]" htmlFor="pr-branch-select">
                          Prepare PR for branch
                            </label>
                            <SelectNative
                              id="pr-branch-select"
                              value={requestedBranchId}
                              className="mt-2 w-full"
                              onChange={(event) => setRequestedBranchId(event.target.value)}
                            >
                              <option value="">Select branch</option>
                          {selectableBranchIds.map((branchId) => {
                                const branchName = branchNameById.get(branchId) ?? "Unknown branch";
                                return <option key={branchId} value={branchId}>{branchName}</option>;
                              })}
                        </SelectNative>
                      </div>
                    ) : null}
                    {selectableBranchIds.length > 1 && !createBranchId ? (
                      <p className="rounded-md border border-dashed px-2 py-1 text-xs text-muted-foreground">Select a branch above to include rows in this PR.</p>
                    ) : null}
                    <div className="max-h-80 divide-y divide-[var(--sb-border-soft)] overflow-y-auto border-y border-[var(--sb-border-soft)]">
                      {Array.from(basketByBranch.entries()).map(([branchId, lines]) => {
                        const branchName = branchId === "unassigned" ? "Unassigned branch" : branchNameById.get(branchId) ?? "Unknown branch";
                        const isCreateBranch = branchId === createBranchId;
                        return (
                          <div key={branchId} className="space-y-2 py-2.5 first:pt-0 last:pb-0">
                            <p className="text-xs font-semibold text-[var(--sb-text-muted)]">{branchName}</p>
                            {(isCreateBranch ? groupBySupplier(lines) : [["preview", lines]] as const).map(([supplierId, supplierLines]) => (
                              <div key={`${branchId}-${supplierId}`} className="space-y-1.5">
                                {isCreateBranch ? <p className="border-b border-[var(--sb-border-soft)] pb-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--sb-text-muted)]">{supplierLines[0]?.supplier_name ?? "Unassigned supplier"}</p> : null}
                                {supplierLines.map((line) => {
                              const key = rowKey(line);
                              return (
                                <div key={key} className="space-y-1 border-b border-[var(--sb-border-soft)] py-1.5 last:border-0">
                                  <p className="truncate text-[13px] font-semibold leading-4">{line.item_name}</p>
                                  <p className="truncate text-[10px] leading-4 text-[var(--sb-text-muted)]">{line.item_code} · {line.supplier_name ?? "Supplier mapping missing"}</p>
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
                                        <SelectNative aria-label={`UOM for ${line.item_name}`} value={line.uom} onChange={(event) => updateUom(key, event.target.value)} className="h-8 w-14 shrink-0 px-1 text-[10px]">
                                          {uomOptionsWithCurrent(line.uom).map((uom) => <option key={uom} value={uom}>{uom}</option>)}
                                        </SelectNative>
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
                                  ) : (
                                    <p className="text-[11px] text-muted-foreground">
                                      Select this branch above to include the row in Create PR.
                                    </p>
                                  )}
                                </div>
                              );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {!basketRows.length ? <p className="text-xs text-muted-foreground">Add items from the table to the basket to create a PR.</p> : null}
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
        tabletRailWidth="half"
      >
        <div className="space-y-3">
          <FilterBar resultCount={totalRows} resetHref="/stock-balance" filtered={Boolean(filters.search || filters.branch_id || filters.status)} className="sb-list-filters--balanced">
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
            <input type="hidden" name="view" value="branch" />
            {Boolean(filters.search || filters.branch_id || filters.status) ? <Button asChild variant="secondary"><Link href="/stock-balance">Reset</Link></Button> : <Button type="submit" variant="secondary">Search</Button>}
          </FilterBar>
          <div className="sb-list-content-card overflow-hidden">
          <Table mobileHidden aria-label="Stock balances" stickyColumn="second">
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">Action</TableHead>
                <SortableHead label="Item Code" column="item_code" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <SortableHead label="Item Name" column="item_name" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Available</TableHead>
                <TableHead className="text-right">Reserved</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">Avg Cost</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead>Last Movement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            {queryError ? (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={11}>
                    <ErrorState title="库存暂时无法加载" description={queryError} />
                  </TableCell>
                </TableRow>
              </TableBody>
            ) : rows.length ? (
              <StockBalanceTableRows rows={rows} inBasket={inBasket} onToggleBasket={toggleBasket} />
            ) : (
              <TableBody>
                <TableRow>
                  <TableCell colSpan={11}>
                    <EmptyState title="No stock balances yet" description="Balances appear after posted stock movements." />
                  </TableCell>
                </TableRow>
              </TableBody>
            )}
          </Table>
          {queryError ? null : (
            <OperationalList ariaLabel="Stock balances">
              {rows.length ? <StockBalanceOperationalRows rows={rows} inBasket={inBasket} onToggleBasket={toggleBasket} /> : null}
              {!rows.length ? (
                <EmptyState title="No stock balances yet" description="Balances appear after posted stock movements." />
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
        {basketRows.length ? <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--sb-warning)] px-1 text-[10px] font-bold text-white">{basketRows.length}</span> : null}
      </button> : null}
      {basketOpen ? <div className="fixed inset-0 z-[var(--sb-z-dialog)] xl:hidden">
        <button type="button" className="sb-dialog-backdrop absolute inset-0 h-full w-full" onClick={() => setBasketOpen(false)} aria-label="Close PR basket" />
        <section className="sb-pr-basket-sheet sb-popover-surface absolute inset-x-0 bottom-0 flex max-h-[82dvh] flex-col overflow-hidden" role="dialog" aria-modal="true" aria-label="PR basket">
          <header className="flex min-h-14 items-center justify-between border-b border-[var(--sb-border-soft)] px-4">
            <div className="min-w-0"><h2 className="text-base font-semibold text-[var(--sb-green-950)]">PR basket</h2><p className="text-xs text-[var(--sb-text-muted)]">{basketRows.length} selected item{basketRows.length === 1 ? "" : "s"} · {basketStorageReady ? "saved on this device" : "restoring…"}</p></div>
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
              {selectableBranchIds.length > 1 ? (
                <div className="mb-3">
                  <label className="text-xs font-semibold text-[var(--sb-text-muted)]" htmlFor="mobile-pr-branch-select">Prepare PR for branch</label>
                  <SelectNative id="mobile-pr-branch-select" value={requestedBranchId} className="mt-1.5 w-full" onChange={(event) => setRequestedBranchId(event.target.value)}>
                    <option value="">Select branch</option>
                    {selectableBranchIds.map((branchId) => <option key={branchId} value={branchId}>{branchNameById.get(branchId) ?? "Unknown branch"}</option>)}
                  </SelectNative>
                </div>
              ) : null}
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
                      <SelectNative aria-label={`UOM for ${line.item_name}`} value={line.uom} onChange={(event) => updateUom(key, event.target.value)} className="h-10 w-20 shrink-0 px-2 text-xs">
                        {uomOptionsWithCurrent(line.uom).map((uom) => <option key={uom} value={uom}>{uom}</option>)}
                      </SelectNative>
                    </div> : <p className="text-xs text-[var(--sb-text-muted)]">Select {line.branch_name ?? "this branch"} above to include this item.</p>}
                  </article>
                );
              }) : <p className="py-10 text-center text-sm text-[var(--sb-text-muted)]">Add an item from Stock Balance to prepare a PR.</p>}
            </div>
            <footer className="border-t border-[var(--sb-border-soft)] bg-[var(--sb-surface)] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-3px_8px_rgb(6_44_31_/_0.10)]">
              {createRows.some((line) => !line.supplier_id) ? <p className="mb-2 text-xs text-[var(--sb-danger)]">Supplier mapping is required before these items can become a PR.</p> : null}
              <SubmitButton type="submit" disabled={!canCreatePr} className="min-h-12 w-full" pendingLabel="Creating PR...">Create PR</SubmitButton>
            </footer>
          </form>
        </section>
      </div> : null}
    </>
  );
}
