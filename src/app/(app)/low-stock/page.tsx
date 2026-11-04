import { uomOptionsWithCurrent } from "@/lib/uom";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { ConsoleSection } from "@/components/layout/right-console";
import { SelectControl } from "@/components/ui/select-control";
import { hasActiveFilters } from "@/lib/table-state";
import { getReplenishmentDecision } from "@/lib/replenishment-decision";
import { hasPermission } from "@/server/auth/permissions";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { getBranchesForSelect } from "@/server/queries/common";
import { getLowStockResult } from "@/server/queries/inventory";
import { LowStockPrForm } from "@/components/low-stock-pr-form";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";

export default async function LowStockPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [lowStockResult, branches, canCreatePr, actor] = await Promise.all([
    getLowStockResult(filters),
    getBranchesForSelect(),
    hasPermission("purchase_request.create"),
    requireActiveTenantActor(),
  ]);
  const { rows: items, count, unavailable } = lowStockResult;
  const out = items.filter((item) => item.stock_status === "out_of_stock").length;
  const low = items.filter((item) => item.stock_status === "low_stock").length;
  const decisions = items.map((item) => getReplenishmentDecision({
    currentStock: Number(item.current_qty ?? item.current_stock ?? 0),
    safetyStock: Number(item.safety_stock ?? 0),
    suggestedReorderQty: Number(item.suggested_reorder_qty ?? 0),
    stockStatus: item.stock_status,
    supplierId: item.supplier_id,
    supplierName: item.supplier_name,
    baseUnit: item.base_unit,
  }));
  const buyNow = decisions.filter((decision) => decision.decision === "buy_now").length;
  const supplierFixes = decisions.filter((decision) => decision.decision === "fix_supplier").length;
  const filtered = hasActiveFilters(filters);

  const summary=<ConsoleSection title="Low Stock Summary"><dl className="space-y-2 text-xs">{[["Rows",unavailable?"Unavailable":count],["Out of stock",out],["Low stock",low],["Buy now",buyNow],["Supplier fixes",supplierFixes]].map(([label,value])=><div key={String(label)} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-semibold">{unavailable?"Unavailable":value}</dd></div>)}</dl></ConsoleSection>;
  return <><PageHeader title="Low Stock" description="Review stock and prepare purchase requests."/>
    <div className="p-3"><UnifiedListHeader autoSubmit={false} className="sb-low-stock-query" resultCount={unavailable?undefined:count??undefined} resetHref="/low-stock" filtered={filtered}>
      <Input name="search" defaultValue={filters.search??""} placeholder="Search item, branch, supplier"/>
      <SelectControl name="branch_id" defaultValue={filters.branch_id??"all"} ariaLabel="Branch" options={[{value:"all",label:"All branches"},...branches.map(branch=>({value:branch.id,label:branch.branch_name}))]}/>
      <SelectControl name="status" defaultValue={filters.status??"all"} ariaLabel="Stock status" options={[{value:"all",label:"All statuses"},{value:"low_stock",label:"Low Stock"},{value:"out_of_stock",label:"Out of Stock"}]}/>
      <input type="hidden" name="below_qty" value={filters.below_qty??""}/>
      <input type="hidden" name="quantity_uom" value={filters.quantity_uom??"KG"}/>
    </UnifiedListHeader>
    <form method="get" action="/low-stock" className="sb-work-surface mt-3 p-3" aria-label="Quantity threshold">
      <input type="hidden" name="search" value={filters.search??""}/>
      <input type="hidden" name="branch_id" value={filters.branch_id??"all"}/>
      <input type="hidden" name="status" value={filters.status??"all"}/>
      <h2 className="mb-3 text-xs font-medium">Quantity threshold</h2>
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(5rem,.6fr)_auto] items-end gap-2 sm:max-w-lg">
        <Field label="Current quantity below"><Input name="below_qty" type="number" min="0" step="any" defaultValue={filters.below_qty??""} placeholder="No limit" aria-label="Current quantity below"/></Field>
        <Field label="Base UOM"><SelectControl name="quantity_uom" defaultValue={filters.quantity_uom??"KG"} ariaLabel="Threshold base UOM" options={uomOptionsWithCurrent(filters.quantity_uom??"KG").map(unit=>({value:unit,label:unit}))}/></Field>
        <Button type="submit">Apply</Button>
      </div>
    </form></div>
    {unavailable?<p role="status" className="sb-work-surface m-3 p-3 text-sm">Stock data is unavailable. Retry before preparing a request.</p>:<LowStockPrForm items={items} branches={branches} defaultBranchId={filters.branch_id} basketOwnerId={actor.staffId} disabled={!canCreatePr} summary={summary}/>}
  </>;
}
