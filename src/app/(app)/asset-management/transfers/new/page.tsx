import { todayInKualaLumpur } from "@/lib/business-date";
import { AssetTransferBatchForm } from "@/components/asset-transfer-batch-form";
import { SelectControl } from "@/components/ui/select-control";
import { Button } from "@/components/ui/button";
import { assetTransferPickerHref } from "@/lib/asset-transfer";
import { ChevronRight } from "lucide-react";
import { AssetOtherLocationForm } from "@/components/asset-other-location-form";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AssetTransferForm } from "@/components/asset-transfer-form";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { ConsoleSection } from "@/components/layout/right-console";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/sortable-table";
import { getAssetWorkspace, getAssetDetail, getAssetTransferRequestOptions } from "@/server/queries/assets";
import { requirePermission } from "@/server/auth/permissions";
export default async function NewTransfer({searchParams}:{searchParams:Promise<{asset?:string;q?:string;page?:string;from?:string}>}) {
  await requirePermission("assets.transfer");
  const actor=await requireActiveTenantActor();
  const query=await searchParams, page=Math.max(1,Number.parseInt(query.page ?? "1",10)||1);
  const batchOptions = await getAssetTransferRequestOptions(query.from ?? "");
  if (batchOptions) return <DocumentWorkspace breadcrumbs={[{label:"Asset Management",href:"/asset-management"},{label:"Transfers",href:"/asset-management?view=transfers"}]} documentNo="New Asset Transfer" title="Create asset transfer" sidePanel={<ConsoleSection title="Transfer history"><Link className="min-h-11 py-3 underline" href="/asset-management?view=transfers">Open transfer register</Link></ConsoleSection>} status="request" currentStatus="request" workflowSteps={[{key:"request",label:"Request"},{key:"approved",label:"Approve"},{key:"dispatched",label:"Dispatch"},{key:"received",label:"Receive"}]}>
    <form method="get" className="sb-work-surface flex flex-wrap items-end gap-3 p-4"><label className="grid min-w-0 flex-1 gap-1 text-xs">Source location<SelectControl name="from" required defaultValue={query.from ?? ""} ariaLabel={"Source location"} options={[({value: "", label: "Choose source", disabled: true}), ...(batchOptions.locations.map(location=>({value: String((location.id) ?? ""), label: String((location.display_name ?? location.source_name) ?? "")})))]}/></label><Button type="submit">Load assets</Button></form>
    {query.from ? <AssetTransferBatchForm key={query.from} source={query.from} locations={batchOptions.locations} choices={batchOptions.choices} requestKey={randomUUID()} today={todayInKualaLumpur()}/> : <p className="text-sm text-muted-foreground">Choose the source location to add assets to this request.</p>}
  </DocumentWorkspace>;
  const detail=query.asset && /^[0-9a-f-]{36}$/i.test(query.asset) ? await getAssetDetail(query.asset) : null;
  const register=detail || !(query.q ?? "").trim() ? null : await getAssetWorkspace("assets",page,(query.q ?? "").slice(0,120));
  return <DocumentWorkspace breadcrumbs={[{label:"Asset Management",href:"/asset-management"},{label:"Transfers",href:"/asset-management?view=transfers"}]} documentNo="New Asset Transfer" title="Asset transfer" status="request" currentStatus="request" workflowSteps={[{key:"request",label:"Request"},{key:"approved",label:"Approve"},{key:"dispatched",label:"Dispatch"},{key:"received",label:"Receive"}]} mobilePrimaryAction={detail ? <div data-transfer-request-slot/> : <Button disabled className="h-12 w-full">Request transfer</Button>} sidePanel={<><ConsoleSection title="Actions">{detail ? <div data-transfer-request-slot/> : <Button disabled className="h-12 w-full md:h-11 xl:h-9">Request transfer</Button>}</ConsoleSection><ConsoleSection title="Transfer history"><Link className="min-h-11 py-3 underline" href="/asset-management?view=transfers">Open transfer register</Link></ConsoleSection></>}>
    <section className="sb-work-surface overflow-hidden"><h2 className="border-b px-4 py-3 text-sm font-semibold">Request details</h2><div className="p-4">{detail ? <AssetTransferForm assetId={detail.asset.id} locations={detail.locations} holdings={detail.holdings} requestKey={randomUUID()}/> : <fieldset disabled className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs">From<SelectControl disabled ariaLabel="From" options={[{value:"",label:"Select an asset first"}]}/></label><label className="grid gap-1 text-xs">To<SelectControl disabled ariaLabel="To" options={[{value:"",label:"Select an asset first"}]}/></label><label className="grid gap-1 text-xs">Quantity<Input disabled type="number"/></label><label className="grid gap-1 text-xs">Reason<Input disabled/></label></fieldset>}</div></section>
    <section className="sb-work-surface overflow-hidden" aria-label="Requested assets"><h2 className="border-b px-4 py-3 text-sm font-semibold">Requested assets</h2>
      {detail ? <div className="flex min-w-0 items-center gap-3 px-4 py-3"><span className="min-w-0 flex-1"><span className="block break-words font-medium">{detail.asset.item_name}</span><span className="mt-1 block text-xs text-muted-foreground">{detail.asset.asset_code}</span></span><Button asChild variant="outline"><Link href={assetTransferPickerHref({ q: query.q, page })}>Change asset</Link></Button></div> : <>
        <form method="get" className="flex items-end gap-2 p-4"><label className="grid min-w-0 flex-1 gap-2 text-xs">Asset<Input type="search" name="q" defaultValue={query.q} placeholder="Search asset name or ID" aria-label="Find asset to transfer"/></label><Button type="submit">Search</Button></form>
        {register ? <div className="max-h-80 divide-y overflow-y-auto">{register.assets.map(asset=><Link className="flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted" key={asset.id} href={assetTransferPickerHref({ q: query.q, page }, asset.id)}><span className="min-w-0 flex-1"><span className="block break-words font-medium">{asset.item_name}</span><span className="mt-1 block text-xs text-muted-foreground">{asset.asset_code}</span></span><ChevronRight className="size-4 shrink-0" aria-hidden="true"/></Link>)}{!register.assets.length ? <p className="px-4 pb-4 text-sm text-muted-foreground">No matching assets.</p> : null}</div> : null}
        {register && register.total>50 ? <PaginationControls page={page} totalPages={Math.ceil(register.total / 50)} totalRows={register.total} searchParams={{q:query.q}} resetScrollOnPageChange /> : null}
      </>}
    </section>

    {actor.roleCode==="super_admin" ? <AssetOtherLocationForm/> : null}
  </DocumentWorkspace>;
}
