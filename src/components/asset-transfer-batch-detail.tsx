import { AssetTransferTimeline } from "@/components/asset-transfer-timeline";
import { AssetTransferProgress } from "@/components/asset-transfer-progress";
import Link from "next/link";
import { AssetTransferAction } from "@/components/asset-transfer-form";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { assetTransferActions } from "@/lib/asset-transfer";
import { formatDateTime, formatDateOnly, formatNumber } from "@/lib/utils";
import type { getAssetTransferBatchDetail } from "@/server/queries/assets";

export function AssetTransferBatchDetail({ data, permissions, page }: { data: NonNullable<Awaited<ReturnType<typeof getAssetTransferBatchDetail>>>; permissions: Record<string, boolean>; page: number }) {
  const { transfer } = data;
  const locations = new Map(data.locations.map(location => [location.id, location.display_name ?? location.source_name]));
  const assets = new Map(data.assets.map(asset => [asset.id, asset]));
  const access = { canApprove: permissions["assets.approve"], canTransfer: permissions["assets.transfer"], canAccessSource: locations.has(transfer.from_location_id ?? ""), canAccessDestination: locations.has(transfer.to_location_id ?? "") };
  const available = assetTransferActions(transfer.status ?? "", access);
  const action = <AssetTransferAction key={`${transfer.status}:${data.history[0]?.id ?? transfer.id}`} transferId={transfer.id} status={transfer.status ?? ""} {...access} batch mobileDock/>;
  return <><PageHeader title="Asset transfer" description={`${data.lines.length} asset${data.lines.length === 1 ? "" : "s"}`}/><WorkspaceGrid hideMobileConsole mobileRailSummary="Document timeline" rightRail={<><div className="hidden md:block [&_form]:mt-0"><ConsoleSection title="Next action" kind="action">{action}{!available.length ? <p className="text-sm text-muted-foreground">No action is available for your role at this stage.</p> : null}</ConsoleSection></div><ConsoleSection title="Document timeline" className="max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none max-md:[&>div:first-child]:hidden"><AssetTransferTimeline history={data.history} groupBatchEvents/>{data.total > 50 ? <nav className="flex items-center justify-between gap-3 text-sm" aria-label="Transfer history pages">{page > 1 ? <Link className="min-h-11 py-3 underline" href={`?page=${page-1}`}>Previous</Link> : <span/>}<span>{page} / {Math.max(1,Math.ceil(data.total/50))}</span>{page*50 < data.total ? <Link className="min-h-11 py-3 underline" href={`?page=${page+1}`}>Next</Link> : <span/>}</nav> : null}</ConsoleSection></>}>
    <AssetTransferProgress status={transfer.status ?? "unknown"}/>
    <section className="sb-work-surface p-4"><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold">Request details</h2><StatusBadge status={transfer.status ?? "unknown"}/></div><dl className="mt-3 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3"><div><dt className="text-muted-foreground">From</dt><dd className="break-words">{transfer.from_location_name ?? locations.get(transfer.from_location_id ?? "") ?? "Restricted location"}</dd></div><div><dt className="text-muted-foreground">To</dt><dd className="break-words">{transfer.to_location_name ?? locations.get(transfer.to_location_id ?? "") ?? "Restricted location"}</dd></div><div><dt className="text-muted-foreground">Requested by</dt><dd>{transfer.author_name ?? "Unrecorded author"}</dd></div><div><dt className="text-muted-foreground">Requested at</dt><dd>{formatDateTime(transfer.created_at,"Date not recorded")}</dd></div><div><dt className="text-muted-foreground">Request date</dt><dd>{formatDateOnly(transfer.request_date)}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">Reason</dt><dd className="whitespace-pre-wrap break-words">{transfer.reason}</dd></div></dl>{transfer.status === "dispatched" ? <p className="mt-3 text-xs text-warning">Destination stock increases after receipt is confirmed.</p> : null}<div className="md:hidden">{action}</div></section>
    <section className="sb-work-surface overflow-hidden"><h2 className="flex items-center justify-between gap-3 border-b px-4 py-3 text-sm font-semibold"><span>Assets list</span><span className="text-sm font-semibold tabular-nums">{data.lines.length}</span></h2><ul className="divide-y">{data.lines.map(line => <li key={line.id} className="flex items-center justify-between gap-3 px-4 py-3 text-xs"><div className="min-w-0"><Link className="break-words underline" href={`/asset-management/assets/${line.asset_id}`}>{assets.get(line.asset_id ?? "")?.item_name ?? "Restricted asset"}</Link><p className="break-words text-muted-foreground">{assets.get(line.asset_id ?? "")?.asset_code}</p></div><span className="shrink-0 tabular-nums">{line.quantity == null ? "Unknown" : formatNumber(line.quantity)}</span></li>)}</ul></section>


  </WorkspaceGrid></>;
}
