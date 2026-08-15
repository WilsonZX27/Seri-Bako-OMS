"use client";

import { Fragment, useMemo, useState } from "react";
import { PackageOpen, ShoppingBasket, X } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { SelectNative } from "@/components/ui/select-native";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { getToday } from "@/lib/utils";
import { uomOptionsWithCurrent } from "@/lib/uom";
import { createPurchaseRequestsFromBasket } from "@/server/actions/procurement";

type LowStockItem = {
  branch_id: string | null;
  branch_name: string | null;
  item_id: string;
  item_code: string;
  item_name: string;
  suggested_reorder_qty: number;
  base_unit: string | null;
  purchase_unit: string | null;
  supplier_id: string | null;
  supplier_name: string | null;
  cost: number;
  stock_status: string;
  current_stock: number;
  safety_stock: number;
};

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function rowKey(item: LowStockItem) {
  return `${item.branch_id ?? "all"}|${item.item_id}`;
}

function groupBySupplier(items: LowStockItem[]) {
  const groups = new Map<string, LowStockItem[]>();
  for (const item of items) {
    const key = item.supplier_id ?? "unassigned";
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  return Array.from(groups.entries()).sort(([, left], [, right]) =>
    (left[0]?.supplier_name ?? "Supplier mapping missing").localeCompare(right[0]?.supplier_name ?? "Supplier mapping missing"),
  );
}

export function LowStockPrForm({ items, branches, defaultBranchId, disabled }: {
  items: LowStockItem[];
  branches: BranchOption[];
  defaultBranchId?: string;
  disabled: boolean;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId ?? "all");
  const visibleItems = useMemo(() => {
    if (selectedBranchId === "all") return items;
    return items.filter((item) => item.branch_id === selectedBranchId);
  }, [items, selectedBranchId]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [uoms, setUoms] = useState<Record<string, string>>({});
  const [basketOpen, setBasketOpen] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const selectedCount = visibleItems.filter((item) => selected[rowKey(item)]).length;
  const selectedTotal = selectedCount === 0
    ? "0"
    : visibleItems
      .filter((item) => selected[rowKey(item)])
      .reduce((sum, item) => {
        const key = rowKey(item);
        return sum + Math.max(0, numberValue(quantities[key] ?? String(item.suggested_reorder_qty)));
      }, 0)
      .toFixed(2);
  const selectedItems = useMemo(() => visibleItems.filter((item) => selected[rowKey(item)]), [selected, visibleItems]);
  const supplierGroups = useMemo(() => groupBySupplier(selectedItems), [selectedItems]);
  const basketPayload = useMemo(() => supplierGroups
    .filter(([supplierId]) => supplierId !== "unassigned")
    .map(([supplierId, lines]) => ({
      supplier_id: supplierId,
      lines: lines.map((item) => {
        const key = rowKey(item);
        return {
          item_id: item.item_id,
          qty: quantities[key] ?? String(item.suggested_reorder_qty),
          uom: uoms[key] ?? item.purchase_unit ?? item.base_unit ?? "pcs",
          estimated_unit_cost: item.cost ?? 0,
        };
      }),
    })), [quantities, supplierGroups, uoms]);
  const hasMissingSupplier = selectedItems.some((item) => !item.supplier_id);
  const canCreatePr = selectedCount > 0 && selectedBranchId !== "all" && !hasMissingSupplier;

  function toggleItem(key: string) {
    const wasSelected = Boolean(selected[key]);
    setSelected((current) => ({ ...current, [key]: !current[key] }));
    if (wasSelected) {
      setQuantities((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  function setItemQty(key: string, value: string) {
    setQuantities((current) => ({ ...current, [key]: value }));
  }

  function setItemUom(key: string, value: string) {
    setUoms((current) => ({ ...current, [key]: value }));
  }

  function selectBranch(branchId: string) {
    setSelectedBranchId(branchId);
    setSelected({});
    setQuantities({});
    setUoms({});
  }

  const branchSelected = selectedBranchId !== "all";

  return (
    <>
      <button type="button" className="fixed bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] right-4 z-[var(--sb-z-sticky)] inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--sb-green-900)] text-white shadow-[0_3px_8px_rgb(6_44_31_/_0.22)] md:hidden" onClick={() => setBasketOpen(true)} aria-label={`Open PR basket, ${selectedCount} selected`}>
        <ShoppingBasket className="h-5 w-5" />
        {selectedCount ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-white px-1 text-center text-[11px] font-bold leading-5 text-[var(--sb-green-900)]">{selectedCount}</span> : null}
      </button>
      {basketOpen ? <button type="button" className="fixed inset-0 z-[100] bg-black/45 md:hidden" aria-label="Close PR basket" onClick={() => setBasketOpen(false)} /> : null}
      <Card className={`sb-procurement-basket max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-[101] max-md:max-h-[84dvh] max-md:overflow-hidden max-md:rounded-b-none max-md:rounded-t-[var(--sb-panel-radius)] ${basketOpen ? "max-md:block" : "max-md:hidden"}`} data-low-stock-pr-setup>
      <CardContent className="space-y-4 p-4 max-md:max-h-[84dvh] max-md:overflow-y-auto max-md:pb-[calc(env(safe-area-inset-bottom)+1rem)] md:p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--sb-border-soft)] pb-4 md:flex-row md:items-end md:justify-between">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-text-muted)]">Procurement queue</p>
            <p className="mt-1 text-base font-semibold tracking-[-0.01em]">PR basket</p>
            <p className="text-xs text-muted-foreground">Add low-stock items, adjust quantities, then create ordinary draft PRs.</p>
            </div>
            <button type="button" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border md:hidden" onClick={() => setBasketOpen(false)} aria-label="Close PR basket"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex items-baseline gap-2 text-xs text-muted-foreground md:text-right">
            <strong className="text-sm text-foreground">{selectedCount}</strong> selected
            <span aria-hidden="true">·</span>
            <span>Suggested total {selectedTotal}</span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Branch">
            <SelectNative
              value={selectedBranchId}
              onChange={(event) => selectBranch(event.target.value)}
              aria-describedby="low-stock-branch-guidance"
            >
              <option value="all">Choose a branch</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
            </SelectNative>
          </Field>
        </div>

        <p id="low-stock-branch-guidance" className="text-xs text-muted-foreground">
          {branchSelected ? "Selections apply only to this branch. Changing branch clears the basket." : "Choose one branch before selecting items for a purchase request."}
        </p>

        {disabled ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            You do not have permission to create purchase requests.
          </div>
        ) : (
          <form action={createPurchaseRequestsFromBasket} className="space-y-3">
            <input type="hidden" name="idempotency_key" value={idempotencyKey} />
            <input type="hidden" name="request_no" value="" />
            <input type="hidden" name="request_date" value={getToday()} />
            <input type="hidden" name="required_date" value="" />
            <input type="hidden" name="priority" value="normal" />
            <input type="hidden" name="branch_id" value={selectedBranchId === "all" ? "" : selectedBranchId} />
            <input type="hidden" name="supplier_groups" value={JSON.stringify(basketPayload)} />

            <div className="hidden overflow-x-auto rounded-[var(--sb-radius-card)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface)] md:block">
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/40 text-left text-xs">
                    <th className="px-3 py-2 font-medium w-10" />
                    <th className="px-3 py-2 font-medium">Item</th>
                    <th className="px-3 py-2 font-medium">Current</th>
                    <th className="px-3 py-2 font-medium">Suggested</th>
                    <th className="px-3 py-2 font-medium text-right">Qty for PR</th>
                  </tr>
                </thead>
                <tbody>
                  {groupBySupplier(visibleItems).map(([supplierId, supplierItems]) => (
                    <Fragment key={`supplier-group-${supplierId}`}>
                    <tr className="bg-secondary/30">
                      <td colSpan={5} className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)]">
                        {supplierItems[0]?.supplier_name ?? "Supplier mapping missing"}
                      </td>
                    </tr>
                    {supplierItems.map((item) => {
                    const key = rowKey(item);
                    const isSelected = Boolean(selected[key]);
                    const requestedQty = quantities[key] ?? String(item.suggested_reorder_qty);
                    return (
                      <tr key={key} className="border-b last:border-0" data-low-stock-pr-line data-selected={isSelected ? "true" : "false"}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.item_code}`}
                            checked={isSelected}
                            onChange={() => toggleItem(key)}
                            disabled={!branchSelected}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium leading-tight">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{item.item_code} {item.branch_name ? `• ${item.branch_name}` : ""}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{item.current_stock}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{item.suggested_reorder_qty} {item.purchase_unit || item.base_unit}</td>
                        <td className="px-3 py-2">
                          {branchSelected ? <div className="flex items-center justify-end gap-1.5">
                            <QuantityStepper
                              value={requestedQty}
                              uom={null}
                              step={0.0001}
                              label={`Quantity for ${item.item_name}`}
                              onChange={(value) => {
                                setItemQty(key, value);
                                if (!isSelected) setSelected((current) => ({ ...current, [key]: true }));
                              }}
                              className="min-h-10 [&_button]:min-h-10 [&_button]:w-8 [&_input]:min-h-10 [&_input]:w-14"
                            />
                            <SelectNative aria-label={`Purchase UOM for ${item.item_name}`} value={uoms[key] ?? item.purchase_unit ?? item.base_unit ?? "PCS"} onChange={(event) => setItemUom(key, event.target.value)} className="h-10 w-20 px-1.5 text-xs">
                              {uomOptionsWithCurrent(item.purchase_unit || item.base_unit).map((uom) => <option key={uom} value={uom}>{uom}</option>)}
                            </SelectNative>
                          </div> : <span className="text-xs text-muted-foreground">Choose branch</span>}
                        </td>
                      </tr>
                    );
                    })}
                    </Fragment>
                  ))}
                  {!visibleItems.length ? (
                    <tr>
                      <td className="px-3 py-4 text-center text-sm text-muted-foreground" colSpan={5}>
                        No items match this branch filter.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[var(--sb-border-soft)] border-y border-[var(--sb-border-soft)] md:hidden" data-low-stock-pr-lines>
              {groupBySupplier(visibleItems).map(([supplierId, supplierItems]) => <div key={`mobile-supplier-group-${supplierId}`}>
                <div className="bg-secondary/30 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)]">
                  {supplierItems[0]?.supplier_name ?? "Supplier mapping missing"}
                </div>
                {supplierItems.map((item) => {
                const key = rowKey(item);
                const isSelected = Boolean(selected[key]);
                const requestedQty = quantities[key] ?? String(item.suggested_reorder_qty);
                return (
                  <div key={key} className="p-3 first:pt-2 last:pb-2" data-low-stock-pr-line data-selected={isSelected ? "true" : "false"}>
                    <span className="flex items-start gap-3">
                      <input type="checkbox" aria-label={`Select ${item.item_code}`} checked={isSelected} onChange={() => toggleItem(key)} disabled={!branchSelected} className="mt-1 h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-tight">{item.item_name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{item.item_code} {item.branch_name ? `- ${item.branch_name}` : ""}</span>
                      </span>
                    </span>
                    <span className="mt-3 grid grid-cols-2 gap-3">
                      <span className="text-xs text-muted-foreground">Current <strong className="block text-sm text-foreground">{item.current_stock} {item.base_unit}</strong></span>
                      <span className="text-xs text-muted-foreground">Suggested <strong className="block text-sm text-foreground">{item.suggested_reorder_qty} {item.purchase_unit || item.base_unit}</strong></span>
                      {isSelected ? <span className="col-span-2" data-low-stock-pr-quantity><Field label="Qty for PR"><div className="flex items-center gap-1.5"><QuantityStepper value={requestedQty} uom={null} step={0.0001} label={`Quantity for ${item.item_name}`} onChange={(value) => setItemQty(key, value)} className="min-w-0 flex-1 [&_button]:w-9 [&_input]:w-14" /><SelectNative aria-label={`Purchase UOM for ${item.item_name}`} value={uoms[key] ?? item.purchase_unit ?? item.base_unit ?? "PCS"} onChange={(event) => setItemUom(key, event.target.value)} className="h-11 w-20 px-1.5 text-xs">{uomOptionsWithCurrent(item.purchase_unit || item.base_unit).map((uom) => <option key={uom} value={uom}>{uom}</option>)}</SelectNative></div></Field></span> : null}
                    </span>
                  </div>
                );
                })}
              </div>)}
              {!visibleItems.length ? <p className="px-3 py-4 text-center text-sm text-muted-foreground">No items match this branch filter.</p> : null}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <div>
                <p>Only checked rows will be included. Each supplier becomes a separate draft PR.</p>
                {hasMissingSupplier ? <p className="mt-1 font-medium text-destructive">Supplier mapping is required before these items can become a PR.</p> : null}
              </div>
              <p aria-live="polite">{selectedCount} selected</p>
            </div>
            <div className="flex justify-end border-t border-[var(--sb-border-soft)] pt-3">
              <SubmitButton type="submit" disabled={!canCreatePr} className="min-h-11 w-full md:w-auto md:min-w-56" pendingLabel="Creating PR...">
                <PackageOpen className="h-4 w-4" />
                Create PR{supplierGroups.length > 1 ? `s (${supplierGroups.length} suppliers)` : ""}
              </SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
    </>
  );
}
