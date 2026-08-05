"use client";

import { useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { SelectNative } from "@/components/ui/select-native";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { getToday } from "@/lib/utils";
import { createPurchaseRequest } from "@/server/actions/procurement";

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

  return (
    <Card className="sb-procurement-basket" data-low-stock-pr-setup>
      <CardContent className="space-y-4 p-4 md:p-5">
        <div className="flex flex-col gap-3 border-b border-[var(--sb-border-soft)] pb-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--sb-text-muted)]">Procurement queue</p>
            <p className="mt-1 text-base font-semibold tracking-[-0.01em]">PR basket</p>
            <p className="text-xs text-muted-foreground">Add low-stock items, adjust quantities, then create ordinary draft PRs.</p>
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
              onChange={(event) => setSelectedBranchId(event.target.value)}
            >
              <option value="all">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
            </SelectNative>
          </Field>
        </div>

        {disabled ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            You do not have permission to create purchase requests.
          </div>
        ) : (
          <form action={createPurchaseRequest} className="space-y-3">
            <input type="hidden" name="idempotency_key" value={crypto.randomUUID()} />
            <input type="hidden" name="request_no" value="" />
            <input type="hidden" name="request_date" value={getToday()} />
            <input type="hidden" name="required_date" value="" />
            <input type="hidden" name="priority" value="normal" />
            <input type="hidden" name="branch_id" value={selectedBranchId === "all" ? "" : selectedBranchId} />

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
                  {visibleItems.map((item) => {
                    const key = rowKey(item);
                    const isSelected = Boolean(selected[key]);
                    const requestedQty = quantities[key] ?? String(item.suggested_reorder_qty);
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${item.item_code}`}
                            checked={isSelected}
                            onChange={() => toggleItem(key)}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium leading-tight">{item.item_name}</p>
                          <p className="text-xs text-muted-foreground">{item.item_code} {item.branch_name ? `• ${item.branch_name}` : ""}</p>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{item.current_stock}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{item.suggested_reorder_qty} {item.purchase_unit || item.base_unit}</td>
                        <td className="px-3 py-2">
                          <QuantityStepper
                            value={requestedQty}
                            uom={item.purchase_unit || item.base_unit}
                            step={0.0001}
                            label={`Quantity for ${item.item_name}`}
                            onChange={(value) => {
                              setItemQty(key, value);
                              if (!isSelected) setSelected((current) => ({ ...current, [key]: true }));
                            }}
                          />
                          {isSelected ? (
                            <>
                              <input type="hidden" name="line_item_id" value={item.item_id} />
                              <input type="hidden" name="line_uom" value={item.purchase_unit ?? item.base_unit ?? "pcs"} />
                              <input type="hidden" name="line_suggested_supplier_id" value={item.supplier_id ?? ""} />
                              <input type="hidden" name="line_estimated_unit_cost" value={String(item.cost ?? 0)} />
                              <input type="hidden" name="line_remarks" value="" />
                              <input type="hidden" name="line_reason" value="" />
                              <input type="hidden" name="line_qty" value={requestedQty} />
                            </>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
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
              {visibleItems.map((item) => {
                const key = rowKey(item);
                const isSelected = Boolean(selected[key]);
                const requestedQty = quantities[key] ?? String(item.suggested_reorder_qty);
                return (
                  <div key={key} className="p-3 first:pt-2 last:pb-2">
                    <span className="flex items-start gap-3">
                      <input type="checkbox" aria-label={`Select ${item.item_code}`} checked={isSelected} onChange={() => toggleItem(key)} className="mt-1 h-4 w-4 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-tight">{item.item_name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{item.item_code} {item.branch_name ? `- ${item.branch_name}` : ""}</span>
                      </span>
                    </span>
                    <span className="mt-3 grid grid-cols-2 gap-3">
                      <span className="text-xs text-muted-foreground">Current <strong className="block text-sm text-foreground">{item.current_stock} {item.base_unit}</strong></span>
                      <span className="text-xs text-muted-foreground">Suggested <strong className="block text-sm text-foreground">{item.suggested_reorder_qty} {item.purchase_unit || item.base_unit}</strong></span>
                      <Field label="Qty for PR" className="col-span-2">
                        <QuantityStepper value={requestedQty} uom={item.purchase_unit || item.base_unit} step={0.0001} label={`Quantity for ${item.item_name}`} onChange={(value) => {
                          setItemQty(key, value);
                          if (!isSelected) setSelected((current) => ({ ...current, [key]: true }));
                        }} />
                      </Field>
                    </span>
                    {isSelected ? <>
                      <input type="hidden" name="line_item_id" value={item.item_id} />
                      <input type="hidden" name="line_uom" value={item.purchase_unit ?? item.base_unit ?? "pcs"} />
                      <input type="hidden" name="line_suggested_supplier_id" value={item.supplier_id ?? ""} />
                      <input type="hidden" name="line_estimated_unit_cost" value={String(item.cost ?? 0)} />
                      <input type="hidden" name="line_remarks" value="" />
                      <input type="hidden" name="line_reason" value="" />
                      <input type="hidden" name="line_qty" value={requestedQty} />
                    </> : null}
                  </div>
                );
              })}
              {!visibleItems.length ? <p className="px-3 py-4 text-center text-sm text-muted-foreground">No items match this branch filter.</p> : null}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>Only rows checked will be included in the draft PR.</p>
              <p>{selectedCount} selected</p>
            </div>
            <div className="flex justify-end border-t border-[var(--sb-border-soft)] pt-3">
              <SubmitButton type="submit" disabled={!selectedCount || selectedBranchId === "all"} className="min-h-11 w-full md:w-auto md:min-w-56" pendingLabel="Creating...">
                <PackageOpen className="h-4 w-4" />
                Create PR from selected
              </SubmitButton>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
