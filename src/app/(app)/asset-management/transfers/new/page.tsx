import { ChevronRight } from "lucide-react";
import { AssetOtherLocationForm } from "@/components/asset-other-location-form";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AssetTransferForm } from "@/components/asset-transfer-form";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { ConsoleSection } from "@/components/layout/right-console";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/ui/filter-bar";
import { PaginationControls } from "@/components/sortable-table";
import { getAssetWorkspace, getAssetDetail } from "@/server/queries/assets";
import { requirePermission } from "@/server/auth/permissions";
export default async function NewTransfer({searchParams}:{searchParams:Promise<{asset?:string;q?:string;page?:string}>}) {
  await requirePermission("assets.transfer");
  const actor=await requireActiveTenantActor();
  const query=await searchParams, page=Math.max(1,Number.parseInt(query.page ?? "1",10)||1);
  const detail=query.asset && /^[0-9a-f-]{36}$/i.test(query.asset) ? await getAssetDetail(query.asset) : null;
  const register=detail ? null : await getAssetWorkspace("assets",page,(query.q ?? "").slice(0,120));
  return <><PageHeader title="Select asset to transfer" description="Choose the asset, source location and destination."/><WorkspaceGrid rightRail={<ConsoleSection title="Create transfer" kind="action"><p>{detail ? "Enter the source, destination and quantity below." : "Choose an asset from the register to begin."}</p><p>Request → Approve → Dispatch → Receive</p>{actor.roleCode==="super_admin"?<AssetOtherLocationForm/>:null}<Link className="min-h-11 py-3 underline" href="/asset-management?view=transfers">Transfer history</Link></ConsoleSection>}>
    {detail ? <section className="sb-work-surface p-4"><h2 className="mb-4 text-base font-semibold">{detail.asset.asset_code} · {detail.asset.item_name}</h2><AssetTransferForm assetId={detail.asset.id} locations={detail.locations} holdings={detail.holdings} requestKey={randomUUID()}/></section> : <><FilterBar resetHref="/asset-management/transfers/new" resultCount={register?.total}><Input type="search" name="q" defaultValue={query.q} placeholder="Find asset" aria-label="Find asset to transfer"/></FilterBar><section className="sb-work-surface divide-y">{register?.assets.map(asset=><Link className="flex min-h-16 items-center gap-3 p-4 text-sm" key={asset.id} href={`?asset=${asset.id}`}><dl className="min-w-0 flex-1 space-y-2"><div><dt className="text-muted-foreground">Asset</dt><dd>{asset.item_name}</dd></div><div><dt className="text-muted-foreground">Code</dt><dd>{asset.asset_code}</dd></div></dl><ChevronRight className="size-4 shrink-0" aria-hidden="true"/></Link>)}{!register?.assets.length ? <p className="p-4 text-sm">No matching assets.</p> : null}</section>{register && register.total>50 ? <PaginationControls page={page} totalPages={Math.ceil(register.total / 50)} totalRows={register.total} searchParams={{q:query.q}} resetScrollOnPageChange /> : null}</>}
  </WorkspaceGrid></>;
}
