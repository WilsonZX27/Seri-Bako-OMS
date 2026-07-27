"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectControl } from "@/components/ui/select-control";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { OperationalList, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatQuantityInput, getToday } from "@/lib/utils";
import { createPurchaseRequestsFromBasket } from "@/server/actions/procurement";
import { StockBalanceOperationalRows, StockBalanceTableRows, type StockBalanceRow } from "@/components/stock-balance-table";

type BranchOption = { id: string; branch_name: string };
type BasketLine = StockBalanceRow & { qty: string };

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
  hasCreatePr: boolean;
}) {
  const [basket, setBasket] = useState<Record<string, BasketLine>>({});
  const [requestedBranchId, setRequestedBranchId] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const branchNameById = useMemo(() => new Map<string, string>(branches.map((branch) => [branch.id, branch.branch_name])), [branches]);

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
    lines: lines.map((line) => ({ item_id: line.item_id, qty: line.qty, uom: line.base_unit, estimated_unit_cost: line.average_cost })),
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

  function updateQty(key: string, nextQty: string) {
    setBasket((current) => {
      const existing = current[key];
      if (!existing) return current;
      return { ...current, [key]: { ...existing, qty: nextQty } };
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
        [key]: { ...row, qty: formatQuantityInput(1) },
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
                <div className="flex justify-between"><span className="text-muted-foreground">Rows Shown</span><strong>{totalRows}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Low Stock</span><strong>{lowStock}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Negative</span><strong>{negative}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Scope</span><strong>Branch</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="flex justify-between gap-3 text-xs">
                <span className="text-muted-foreground">Inventory Value</span>
                <strong>{formatCurrency(totalValue)}</strong>
              </div>
            </ConsoleSection>
            <ConsoleSection title="PR Preparation">
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
                      <p className="text-xs font-semibold text-[var(--sb-text-muted)]">Selected items</p>
                      <p className="text-sm">{basketRows.length} item{basketRows.length === 1 ? "" : "s"} in basket</p>
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
                    <div className="max-h-80 space-y-2 overflow-auto rounded border p-2">
                      {Array.from(basketByBranch.entries()).map(([branchId, lines]) => {
                        const branchName = branchId === "unassigned" ? "Unassigned branch" : branchNameById.get(branchId) ?? "Unknown branch";
                        const isCreateBranch = branchId === createBranchId;
                        return (
                          <div key={branchId} className="space-y-2 rounded bg-[var(--sb-surface-muted)] p-2">
                            <p className="text-xs font-semibold text-[var(--sb-text-muted)]">{branchName}</p>
                            {(isCreateBranch ? groupBySupplier(lines) : [["preview", lines]] as const).map(([supplierId, supplierLines]) => (
                              <div key={`${branchId}-${supplierId}`} className="space-y-1">
                                {isCreateBranch ? <p className="border-b px-1 pb-1 text-xs font-semibold">{supplierLines[0]?.supplier_name ?? "Unassigned supplier"}</p> : null}
                                {supplierLines.map((line) => {
                              const key = rowKey(line);
                              return (
                                <div key={key} className="space-y-1 rounded bg-background p-2">
                                  <p className="font-medium">{line.item_name}</p>
                                  <p className="text-xs text-muted-foreground">{line.item_code}</p>
                                  {isCreateBranch ? (
                                    <>
                                      <div className="flex items-center gap-2">
                                        <Input
                                          type="number"
                                          min="0"
                                          step="0.01"
                                          required
                                          value={line.qty}
                                          onChange={(event) => updateQty(key, event.target.value)}
                                          name="line_qty"
                                          className="h-8"
                                        />
                                        <span className="text-xs text-muted-foreground">{line.base_unit}</span>
                                      </div>
                                      <div className="grid gap-2 text-xs">
                                        <input type="hidden" name="line_item_id" value={line.item_id} />
                                        <input type="hidden" name="line_branch_id" value={line.branch_id ?? ""} />
                                        <input type="hidden" name="line_uom" value={line.base_unit} />
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
                <Button type="submit" disabled={!canCreatePr} className="w-full">
                  Create PR
                </Button>
              </form>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <FilterBar resultCount={totalRows} resetHref="/stock-balance" filtered={Boolean(filters.search || filters.branch_id || filters.status)}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search item, branch, status" className="md:max-w-sm" />
            <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" className="md:max-w-xs" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <SelectControl
              name="status"
              defaultValue={filters.status ?? "all"}
              ariaLabel="Status"
              className="md:max-w-44"
              options={[
                { value: "all", label: "All statuses" },
                { value: "ok", label: "Sufficient" },
                { value: "low_stock", label: "Reorder Needed" },
                { value: "negative", label: "Out of Stock" },
              ]}
            />
            <input type="hidden" name="view" value="branch" />
            <Button type="submit" variant="secondary">Search</Button>
          </FilterBar>
          <Table mobileHidden aria-label="Stock balances">
            <TableHeader>
              <TableRow>
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
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            {rows.length ? (
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
          <OperationalList ariaLabel="Stock balances">
            {rows.length ? <StockBalanceOperationalRows rows={rows} inBasket={inBasket} onToggleBasket={toggleBasket} /> : null}
            {!rows.length ? (
              <EmptyState title="No stock balances yet" description="Balances appear after posted stock movements." />
            ) : null}
          </OperationalList>
          <div className="pb-4">
            <PaginationControls page={page} totalPages={totalPages} totalRows={totalRows} searchParams={filters} />
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
