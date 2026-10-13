import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AssetTransferForm } from "@/components/asset-transfer-form";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Input } from "@/components/ui/input";
import { FilterBar } from "@/components/ui/filter-bar";
import { PaginationControls } from "@/components/sortable-table";
import { getAssetWorkspace, getAssetDetail } from "@/server/queries/assets";
import { requirePermission } from "@/server/auth/permissions";
export default async function NewTransfer({searchParams}:{searchParams:Promise<{asset?:string;q?:string;page?:string}>}) {
  await requirePermission("assets.transfer");
  const query=await searchParams, page=Math.max(1,Number.parseInt(query.page ?? "1",10)||1);
  const detail=query.asset && /^[0-9a-f-]{36}$/i.test(query.asset) ? await getAssetDetail(query.asset) : null;
  const register=detail ? null : await getAssetWorkspace("assets",page,(query.q ?? "").slice(0,120));
  return <><PageHeader title="Create asset transfer" description="Choose the asset, source location and destination."/><WorkspaceGrid hideDesktopConsole hideMobileConsole>
    {detail ? <section className="sb-work-surface p-4"><h2 className="mb-4 text-base font-semibold">{detail.asset.asset_code} · {detail.asset.item_name}</h2><AssetTransferForm assetId={detail.asset.id} locations={detail.locations} holdings={detail.holdings} requestKey={randomUUID()}/></section> : <><FilterBar resetHref="/asset-management/transfers/new" resultCount={register?.total}><Input type="search" name="q" defaultValue={query.q} placeholder="Find asset" aria-label="Find asset to transfer"/></FilterBar><section className="sb-work-surface divide-y">{register?.assets.map(asset=><Link className="flex min-h-16 items-center gap-3 p-4 text-sm" key={asset.id} href={`?asset=${asset.id}`}><strong className="text-primary">{asset.asset_code}</strong><span>{asset.item_name}</span></Link>)}{!register?.assets.length ? <p className="p-4 text-sm">No matching assets.</p> : null}</section>{register && register.total>50 ? <PaginationControls page={page} totalPages={Math.ceil(register.total / 50)} totalRows={register.total} searchParams={{q:query.q}} resetScrollOnPageChange /> : null}</>}
  </WorkspaceGrid></>;
}
