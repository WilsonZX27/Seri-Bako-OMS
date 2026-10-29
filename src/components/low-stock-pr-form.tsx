"use client";

import { getReplenishmentDecision } from "@/lib/replenishment-decision";
import { Badge } from "@/components/ui/badge";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { PackageOpen, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Field } from "@/components/ui/field";
import { SelectControl } from "@/components/ui/select-control";
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
  stock_status: "out_of_stock" | "low_stock" | "sufficient";
  current_stock: number;
  safety_stock: number;
};

type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type StoredBasketLine = { item: LowStockItem; qty: string; uom: string };

function validStoredLine(value: unknown, branchId: string): value is StoredBasketLine {
  if (!value || typeof value !== "object") return false;
  const line = value as Partial<StoredBasketLine>;
  const item = line.item;
  return Boolean(item && item.branch_id === branchId && typeof item.item_id === "string"
    && typeof item.item_code === "string" && typeof item.item_name === "string"
    && (item.supplier_id === null || typeof item.supplier_id === "string")
    && (item.supplier_name === null || typeof item.supplier_name === "string")
    && (item.base_unit === null || typeof item.base_unit === "string")
    && (item.purchase_unit === null || typeof item.purchase_unit === "string")
    && ["out_of_stock", "low_stock", "sufficient"].includes(item.stock_status ?? "")
    && Number.isFinite(item.suggested_reorder_qty) && Number.isFinite(item.current_stock)
    && Number.isFinite(item.safety_stock) && Number.isFinite(item.cost)
    && typeof line.qty === "string" && Number.isFinite(Number(line.qty)) && Number(line.qty) > 0
    && typeof line.uom === "string" && line.uom.length > 0);
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

export function LowStockPrForm({ items, branches, defaultBranchId, basketOwnerId, disabled, summary }: {
  items: LowStockItem[];
  branches: BranchOption[];
  defaultBranchId?: string;
  basketOwnerId: string;
  disabled: boolean;
  summary?: ReactNode;
}) {
  const [selectedBranchId, setSelectedBranchId] = useState(defaultBranchId ?? "all");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [retainedItems, setRetainedItems] = useState<LowStockItem[]>([]);
  const [hydratedBasketKey, setHydratedBasketKey] = useState<string | null>(null);
  const basketStorageKey = useMemo(() => `seri-bako:low-stock-pr-basket:v1:${basketOwnerId}:${branches.map((branch) => branch.id).sort().join(".") || "unassigned"}`, [basketOwnerId, branches]);
  const basketItems = useMemo(() => {
    const byKey = new Map(items.map((item) => [rowKey(item), item]));
    for (const item of retainedItems) {
      const key = rowKey(item);
      if (selected[key] && !byKey.has(key)) byKey.set(key, item);
    }
    return Array.from(byKey.values());
  }, [items, retainedItems, selected]);
  const visibleItems = useMemo(() => {
    if (selectedBranchId === "all") return basketItems;
    return basketItems.filter((item) => item.branch_id === selectedBranchId);
  }, [basketItems, selectedBranchId]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [uoms, setUoms] = useState<Record<string, string>>({});
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const branchSelected = selectedBranchId !== "all";
  const basketReady = hydratedBasketKey === basketStorageKey;

  const selectedCount = visibleItems.filter((item) => selected[rowKey(item)]).length;
  const selectedLabel = selectedCount ? `${selectedCount} selected` : "No items selected";
  const selectedItems = useMemo(() => visibleItems.filter((item) => selected[rowKey(item)]), [selected, visibleItems]);
  const allVisibleSelected = branchSelected && visibleItems.length > 0 && visibleItems.every((item) => picked[rowKey(item)]);
  const someVisibleSelected = branchSelected && visibleItems.some((item) => picked[rowKey(item)]);
  const selectAllDesktopRef = useRef<HTMLInputElement>(null);
  const selectAllMobileRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (hydratedBasketKey !== basketStorageKey || !selectedItems.length) return;
    setRetainedItems((current) => {
      const byKey = new Map(current.map((item) => [rowKey(item), item]));
      let changed = false;
      for (const item of selectedItems) {
        if (!byKey.has(rowKey(item))) {
          byKey.set(rowKey(item), item);
          changed = true;
        }
      }
      return changed ? Array.from(byKey.values()) : current;
    });
  }, [basketStorageKey, hydratedBasketKey, selectedItems]);

  useEffect(() => {
    if (hydratedBasketKey === basketStorageKey) return;
    if (disabled) {
      setHydratedBasketKey(basketStorageKey);
      return;
    }
    setSelectedBranchId(defaultBranchId ?? "all");
    setRetainedItems([]);
    setSelected({});
    setQuantities({});
    setUoms({});
    try {
      const raw = window.localStorage.getItem(basketStorageKey);
      const stored = raw ? JSON.parse(raw) as { branchId?: unknown; lines?: unknown } : null;
      const branchId = typeof stored?.branchId === "string" && branches.some((branch) => branch.id === stored.branchId)
        ? stored.branchId : null;
      if (branchId) {
        const lines = (Array.isArray(stored?.lines) ? stored.lines : [])
          .filter((line): line is StoredBasketLine => validStoredLine(line, branchId))
          .slice(0, 100);
        setPicked({});
        setSelectedBranchId(branchId);
        setRetainedItems(lines.map((line) => line.item));
        setSelected(Object.fromEntries(lines.map((line) => [rowKey(line.item), true])));
        setQuantities(Object.fromEntries(lines.map((line) => [rowKey(line.item), line.qty])));
        setUoms(Object.fromEntries(lines.map((line) => [rowKey(line.item), line.uom])));
      }
    } catch {
      // A stale or unavailable browser basket does not block the current list.
    } finally {
      setHydratedBasketKey(basketStorageKey);
    }
  }, [basketStorageKey, branches, defaultBranchId, disabled, hydratedBasketKey]);

  useEffect(() => {
    if (hydratedBasketKey !== basketStorageKey || disabled) return;
    try {
      if (selectedBranchId === "all") {
        window.localStorage.removeItem(basketStorageKey);
        return;
      }
      const lines = selectedItems.map((item) => ({
        item, qty: quantities[rowKey(item)] ?? String(item.suggested_reorder_qty),
        uom: uoms[rowKey(item)] ?? item.purchase_unit ?? item.base_unit ?? "PCS",
      }));
      window.localStorage.setItem(basketStorageKey, JSON.stringify({ branchId: selectedBranchId, lines }));
    } catch {
      // Selection remains usable until this page is refreshed.
    }
  }, [basketStorageKey, hydratedBasketKey, disabled, quantities, selectedBranchId, selectedItems, uoms]);

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
    setPicked({});
    setSelectedBranchId(branchId);
    setSelected({});
    setQuantities({});
    setUoms({});
  }

  useEffect(() => {
    for (const input of [selectAllDesktopRef.current, selectAllMobileRef.current]) {
      if (input) input.indeterminate = someVisibleSelected && !allVisibleSelected;
    }
  }, [allVisibleSelected, someVisibleSelected]);

  function toggleAllVisible() {
    if (!branchSelected) return;
    setPicked(current => ({...current,...Object.fromEntries(visibleItems.map(item=>[rowKey(item),!allVisibleSelected]))}));
  }
  const decisionByKey = new Map(visibleItems.map(item=>[rowKey(item),getReplenishmentDecision({currentStock:item.current_stock,safetyStock:item.safety_stock,suggestedReorderQty:item.suggested_reorder_qty,stockStatus:item.stock_status,supplierId:item.supplier_id,supplierName:item.supplier_name,baseUnit:item.base_unit})]));
  const pickedItems=visibleItems.filter(item=>picked[rowKey(item)]);
  const basket=<>
    <ConsoleSection title="PR basket"><p className="text-xs text-muted-foreground" aria-live="polite">{selectedLabel}</p>
      <ul className="divide-y">{selectedItems.map(item=>{const key=rowKey(item);return <li key={key} className="flex items-start gap-2 py-3"><div className="min-w-0 flex-1"><p className="break-words text-xs font-semibold">{item.item_name}</p><p className="mt-1 text-xs text-muted-foreground">{quantities[key]??item.suggested_reorder_qty} {uoms[key]??item.purchase_unit??item.base_unit} · {item.supplier_name??"Supplier missing"}</p></div><Button type="button" variant="ghost" size="icon" aria-label={`Remove ${item.item_code} from basket`} onClick={()=>toggleItem(key)}><X className="size-4" aria-hidden="true"/></Button></li>;})}</ul>
      {!selectedItems.length?<p className="text-xs text-muted-foreground">Select items and add them to the basket.</p>:null}
      {hasMissingSupplier?<p role="status" className="text-xs text-destructive">Choose a supplier before creating these requests.</p>:null}
      <SubmitButton size="lg" data-mobile-primary-action type="submit" form="low-stock-pr-create" disabled={!basketReady||disabled||!canCreatePr||selectedItems.some(item=>!Number.isFinite(Number(quantities[rowKey(item)]??item.suggested_reorder_qty))||Number(quantities[rowKey(item)]??item.suggested_reorder_qty)<=0)} className="w-full" pendingLabel="Creating PR..."><PackageOpen className="size-4" aria-hidden="true"/>Create draft PR{supplierGroups.length>1?`s (${supplierGroups.length})`:""}</SubmitButton>
      <p className="text-xs text-muted-foreground">A separate draft is created for each supplier.</p>
    </ConsoleSection>{summary}
  </>;
  return <WorkspaceGrid tabletRailMode="split" tabletRailBreakpoint="lg" tabletRailWidth="half" hideMobileConsole mobileRailSummary={`PR basket · ${selectedCount}`} rightRail={basket}>
    <section className="sb-work-surface overflow-hidden" data-low-stock-pr-setup aria-busy={!basketReady}>
      <fieldset disabled={!basketReady||disabled} className="min-w-0" aria-label="Purchase request basket preparation">
      <header className="grid items-end gap-3 border-b p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Field label="Request branch"><SelectControl value={selectedBranchId} onValueChange={selectBranch} ariaLabel="Request branch" options={[{value:"all",label:"Choose a branch"},...branches.map(branch=>({value:branch.id,label:branch.branch_name}))]}/></Field>
        <Button type="button" disabled={disabled||!pickedItems.length} onClick={()=>{setSelected(current=>({...current,...Object.fromEntries(pickedItems.map(item=>[rowKey(item),true]))}));setPicked({});}}>Add selected to basket ({pickedItems.length})</Button>
      </header>
      <p id="low-stock-branch-guidance" className="px-3 py-2 text-xs text-muted-foreground">{branchSelected?"Select items below. Changing the branch clears this basket.":"Choose one branch before selecting items."}</p>
      {disabled?<p role="status" className="p-3 text-xs text-muted-foreground">You have read-only access.</p>:null}
      <form id="low-stock-pr-create" action={createPurchaseRequestsFromBasket}>
        <input type="hidden" name="idempotency_key" value={idempotencyKey}/><input type="hidden" name="request_no" value=""/><input type="hidden" name="request_date" value={getToday()}/><input type="hidden" name="required_date" value=""/><input type="hidden" name="priority" value="normal"/><input type="hidden" name="branch_id" value={selectedBranchId==="all"?"":selectedBranchId}/><input type="hidden" name="supplier_groups" value={JSON.stringify(basketPayload)}/>
        <div className="hidden overflow-x-auto md:block"><table className="w-full text-xs"><thead className="bg-[var(--sb-surface-muted)] text-left"><tr><th className="p-3"><input ref={selectAllDesktopRef} type="checkbox" aria-label="Select all visible low-stock items" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={disabled||!branchSelected||!visibleItems.length}/></th><th className="p-3 font-medium">Item</th><th className="p-3 font-medium">Decision</th><th className="p-3 text-right font-medium">Current</th><th className="p-3 text-right font-medium">Safety</th><th className="p-3 text-right font-medium">Suggested</th><th className="p-3 font-medium">Qty for PR</th><th className="p-3 font-medium">UOM</th></tr></thead><tbody>{visibleItems.map(item=>{const key=rowKey(item);return <tr key={key} className="border-t border-[var(--sb-border-soft)]" data-low-stock-pr-line data-selected={picked[key]||selected[key]?"true":"false"}><td className="p-3"><input type="checkbox" aria-label={`Select ${item.item_code}`} checked={!!picked[key]} disabled={disabled||!branchSelected} onChange={()=>setPicked(current=>({...current,[key]:!current[key]}))}/></td><th scope="row" className="min-w-40 p-3 text-left font-medium">{item.item_name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{item.item_code} · {item.supplier_name??"Supplier missing"}</span></th><td className="p-3"><Badge variant={decisionByKey.get(key)?.blocked?"danger":"secondary"} title={decisionByKey.get(key)?.reason} data-low-stock-decision={decisionByKey.get(key)?.decision}>{decisionByKey.get(key)?.label}</Badge></td><td className="p-3 text-right tabular-nums">{item.current_stock} {item.base_unit}</td><td className="p-3 text-right tabular-nums">{item.safety_stock}</td><td className="p-3 text-right tabular-nums">{item.suggested_reorder_qty}</td><td className="p-3"><QuantityStepper value={quantities[key]??String(item.suggested_reorder_qty)} label={`Quantity for ${item.item_name}`} uom={null} step={0.0001} buttonStep={1} density="dense" onChange={value=>setItemQty(key,value)}/></td><td className="p-3"><SelectControl ariaLabel={`Purchase UOM for ${item.item_name}`} value={uoms[key]??item.purchase_unit??item.base_unit??"PCS"} onValueChange={value=>setItemUom(key,value)} className="min-w-20" options={uomOptionsWithCurrent(item.purchase_unit||item.base_unit).map(unit=>({value:unit,label:unit}))}/></td></tr>;})}</tbody></table></div>
        <div className="divide-y md:hidden" data-low-stock-pr-lines><label className="flex min-h-11 items-center gap-3 px-3 text-xs"><input ref={selectAllMobileRef} type="checkbox" aria-label="Select all visible low-stock items" checked={allVisibleSelected} onChange={toggleAllVisible} disabled={disabled||!branchSelected||!visibleItems.length}/>Select all visible</label>{visibleItems.map(item=>{const key=rowKey(item);return <div key={key} className="space-y-3 p-3" data-low-stock-pr-line><label className="flex min-h-11 items-start gap-3 text-xs"><input type="checkbox" aria-label={`Select ${item.item_code}`} checked={!!picked[key]} disabled={disabled||!branchSelected} onChange={()=>setPicked(current=>({...current,[key]:!current[key]}))}/><span><strong>{item.item_name}</strong><span className="mt-1 block text-muted-foreground">{item.item_code} · {item.supplier_name??"Supplier missing"}</span></span></label><p className="text-xs text-muted-foreground">Current {item.current_stock} {item.base_unit} · Safety {item.safety_stock} · Suggested {item.suggested_reorder_qty}</p><p className="text-xs" data-low-stock-decision={decisionByKey.get(key)?.decision}><strong>{decisionByKey.get(key)?.label}</strong><span className="ml-2 text-muted-foreground">{decisionByKey.get(key)?.reason}</span></p><div className="grid grid-cols-2 items-center gap-2"><QuantityStepper className="w-full" label={`Quantity for ${item.item_name}`} value={quantities[key]??String(item.suggested_reorder_qty)} uom={null} step={0.0001} buttonStep={1} onChange={value=>setItemQty(key,value)}/><SelectControl ariaLabel={`Purchase UOM for ${item.item_name}`} value={uoms[key]??item.purchase_unit??item.base_unit??"PCS"} onValueChange={value=>setItemUom(key,value)} options={uomOptionsWithCurrent(item.purchase_unit||item.base_unit).map(unit=>({value:unit,label:unit}))}/></div></div>;})}</div>
        {!visibleItems.length?<p className="p-4 text-xs text-muted-foreground">No items match this branch.</p>:null}
      </form>
      </fieldset>
    </section>
  </WorkspaceGrid>;
}
