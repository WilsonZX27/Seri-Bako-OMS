import { todayInKualaLumpur } from "@/lib/business-date";
import { AssetTransferBatchForm } from "@/components/asset-transfer-batch-form";
import { SelectNative } from "@/components/ui/select-native";
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
import { FilterBar } from "@/components/ui/filter-bar";
import { PaginationControls } from "@/components/sortable-table";
import { getAssetWorkspace, getAssetDetail, getAssetTransferRequestOptions } from "@/server/queries/assets";
import { requirePermission } from "@/server/auth/permissions";
export default async function NewTransfer({searchParams}:{searchParams:Promise<{asset?:string;q?:string;page?:string;from?:string}>}) {
  await requirePermission("assets.transfer");
  const actor=await requireActiveTenantActor();
  const query=await searchParams, page=Math.max(1,Number.parseInt(query.page ?? "1",10)||1);
  const batchOptions = await getAssetTransferRequestOptions(query.from ?? "");
  if (batchOptions) return <DocumentWorkspace breadcrumbs={[{label:"Asset Management",href:"/asset-management"},{label:"Transfers",href:"/asset-management?view=transfers"}]} documentNo="New Asset Transfer" title="Create asset transfer" sidePanel={<ConsoleSection title="Transfer history"><Link className="min-h-11 py-3 underline" href="/asset-management?view=transfers">Open transfer register</Link></ConsoleSection>} status="request" currentStatus="request" workflowSteps={[{key:"request",label:"Request"},{key:"approved",label:"Approve"},{key:"dispatched",label:"Dispatch"},{key:"received",label:"Receive"}]}>
    <form method="get" className="sb-work-surface flex flex-wrap items-end gap-3 p-4"><label className="grid min-w-0 flex-1 gap-1 text-xs">Source location<SelectNative name="from" required defaultValue={query.from ?? ""}><option value="" disabled>Choose source</option>{batchOptions.locations.map(location=><option key={location.id} value={location.id}>{location.display_name ?? location.source_name}</option>)}</SelectNative></label><Button type="submit">Load assets</Button></form>
    {query.from ? <AssetTransferBatchForm key={query.from} source={query.from} locations={batchOptions.locations} choices={batchOptions.choices} requestKey={randomUUID()} today={todayInKualaLumpur()}/> : <p className="text-sm text-muted-foreground">Choose the source location to add assets to this request.</p>}
  </DocumentWorkspace>;
  const detail=query.asset && /^[0-9a-f-]{36}$/i.test(query.asset) ? await getAssetDetail(query.asset) : null;
  const register=detail ? null : await getAssetWorkspace("assets",page,(query.q ?? "").slice(0,120));
  return <><DocumentWorkspace breadcrumbs={[{label:"Asset Management",href:"/asset-management"},{label:"Transfers"}]} documentNo="New Asset Transfer" title={detail ? "Create asset transfer" : "Select asset to transfer"} status="request" currentStatus="request" workflowSteps={[{key:"request",label:"Request"},{key:"approved",label:"Approve"},{key:"dispatched",label:"Dispatch"},{key:"received",label:"Receive"}]} mobilePrimaryAction={detail ? <div data-transfer-request-slot/> : undefined} sidePanel={<><ConsoleSection title="Next action" kind="action">{detail ? <div data-transfer-request-slot/> : <p>Choose an asset from the register to begin.</p>}</ConsoleSection><ConsoleSection title="Transfer options">{actor.roleCode==="super_admin"?<AssetOtherLocationForm/>:null}<Link className="min-h-11 py-3 underline" href="/asset-management?view=transfers">Transfer history</Link></ConsoleSection></>}>
    {detail ? <><section className="sb-work-surface p-4"><h2 className="mb-4 text-base font-semibold">Request details</h2><AssetTransferForm assetId={detail.asset.id} locations={detail.locations} holdings={detail.holdings} requestKey={randomUUID()}/></section><section className="sb-work-surface overflow-hidden"><h2 className="border-b px-4 py-3 text-base font-semibold">Assets list</h2><div className="flex min-h-16 items-center gap-3 px-4 py-3"><span className="min-w-0 flex-1"><span className="block font-medium">{detail.asset.item_name}</span><span className="mt-1 block text-xs text-muted-foreground">{detail.asset.asset_code}</span></span><Link className="shrink-0 rounded-md border px-3 py-2 text-sm" href={assetTransferPickerHref({ q: query.q, page })}>Change asset</Link></div></section></> : <><FilterBar resetHref="/asset-management/transfers/new" resultCount={register?.total} phoneMode="inline"><Input type="search" name="q" defaultValue={query.q} placeholder="Find asset" aria-label="Find asset to transfer"/></FilterBar><section className="sb-work-surface overflow-hidden"><h2 className="border-b px-4 py-3 text-base font-semibold">Assets list</h2><div className="divide-y">{register?.assets.map(asset=><Link className="flex min-h-16 items-center gap-3 px-4 py-2.5 text-sm" key={asset.id} href={assetTransferPickerHref({ q: query.q, page }, asset.id)}><span className="min-w-0 flex-1"><span className="block break-words font-medium leading-5">{asset.item_name}</span><span className="mt-1 block break-words text-xs text-muted-foreground">{asset.asset_code}</span></span><ChevronRight className="size-4 shrink-0" aria-hidden="true"/></Link>)}{!register?.assets.length ? <p className="p-4 text-sm">No matching assets.</p> : null}</div></section>{register && register.total>50 ? <PaginationControls page={page} totalPages={Math.ceil(register.total / 50)} totalRows={register.total} searchParams={{q:query.q}} resetScrollOnPageChange /> : null}</>}
  </DocumentWorkspace></>;
}
