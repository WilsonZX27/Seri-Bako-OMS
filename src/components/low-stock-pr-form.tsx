"use client";

import { useMemo, useState } from "react";
import { PackageOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold">Create PR from selected items</p>
            <p className="text-xs text-muted-foreground">Select one or more low-stock rows and open a draft PR in one step.</p>
          </div>
          <div className="text-xs text-muted-foreground">
            {selectedCount} item{selectedCount === 1 ? "" : "s"} selected | Suggested total qty {selectedTotal}
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
            <input type="hidden" name="request_date" value={today()} />
            <input type="hidden" name="required_date" value="" />
            <input type="hidden" name="priority" value="normal" />
            <input type="hidden" name="branch_id" value={selectedBranchId === "all" ? "" : selectedBranchId} />

            <div className="overflow-x-auto rounded-md border">
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
                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={requestedQty}
                            onChange={(event) => {
                              setItemQty(key, event.target.value);
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

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <p>Only rows checked will be included in the draft PR.</p>
              <p>{selectedCount} selected</p>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={!selectedCount || selectedBranchId === "all"} className="w-full md:w-auto">
                <PackageOpen className="h-4 w-4" />
                Create PR from selected
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
