import { AssetTransferTimeline } from "@/components/asset-transfer-timeline";
import { AssetTransferProgress } from "@/components/asset-transfer-progress";
import { PaginationControls } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { AssetTransferBatchDetail } from "@/components/asset-transfer-batch-detail";
import { notFound, redirect } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { AssetTransferAction } from "@/components/asset-transfer-form";
import { assetTransferActions } from "@/lib/asset-transfer";
import { getAssetTransferDetail, getAssetTransferBatchDetail } from "@/server/queries/assets";
import { getPermissionMap } from "@/server/auth/permissions";
import { formatDateTime, formatNumber } from "@/lib/utils";

export default async function TransferDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const parsed = Number(query.page ?? "1"), page = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1_000_000 ? parsed : 1;
  const batch = await getAssetTransferBatchDetail(id, page);
  if (batch) return <AssetTransferBatchDetail data={batch} permissions={await getPermissionMap(["assets.approve","assets.transfer"])} page={page}/>;
  const [data, permissions] = await Promise.all([getAssetTransferDetail(id,page),getPermissionMap(["assets.approve","assets.transfer"])]);
  if (!data) notFound();
  if (data.transfer.batch_id) {
    const complete = await getAssetTransferBatchDetail(data.transfer.batch_id, page);
    if (complete) redirect(`/asset-management/transfers/${data.transfer.batch_id}`);
    return <><PageHeader title="Asset transfer"/><EmptyState title="Complete transfer unavailable" description="This asset belongs to a multi-asset transfer. The complete document must be available before any action can continue."/><Link className="underline" href="/asset-management?view=transfers">Back to transfers</Link></>;
  }
  const transfer = data.transfer, locations = new Map(data.locations.map(location=>[location.id,location.display_name ?? location.source_name]));
  const access = { canApprove: permissions["assets.approve"], canTransfer: permissions["assets.transfer"], canAccessSource: locations.has(transfer.from_location_id ?? ""), canAccessDestination: locations.has(transfer.to_location_id ?? "") };
  const available = assetTransferActions(transfer.status ?? "", access);
  return <><PageHeader title="Asset transfer" description={transfer.source_id ?? `${data.asset.asset_code} · ${transfer.status}`}/><WorkspaceGrid hideMobileConsole mobileRailSummary="Document timeline" rightRail={<><div className="hidden md:block [&_form]:mt-0"><ConsoleSection title="Next action" kind="action"><AssetTransferAction key={`${transfer.status}:${data.history[0]?.id ?? id}`} transferId={id} status={transfer.status ?? ""} {...access} mobileDock/>{!available.length ? <p className="text-sm text-muted-foreground">No action is available for your role at this stage.</p> : null}</ConsoleSection></div><ConsoleSection title="Document timeline" className="max-md:rounded-none max-md:border-0 max-md:bg-transparent max-md:p-0 max-md:shadow-none max-md:[&>div:first-child]:hidden"><AssetTransferTimeline history={data.history}/>{data.total > 50 ? <PaginationControls page={page} totalPages={Math.max(1, Math.ceil(data.total / 50))} totalRows={data.total} searchParams={{}} /> : null}</ConsoleSection></>}>
    <AssetTransferProgress status={transfer.status ?? "unknown"}/>
    <section className="sb-work-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><Link className="min-w-0 break-words text-sm font-semibold underline" href={`/asset-management/assets/${transfer.asset_id}`}>{data.asset.item_name}</Link><StatusBadge status={transfer.status ?? "unknown"} className="!rounded-full"/></div>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><div className="min-w-0"><dt className="text-muted-foreground">From</dt><dd className="mt-1 break-words">{locations.get(transfer.from_location_id ?? "") ?? "Restricted location"}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">To</dt><dd className="mt-1 break-words">{locations.get(transfer.to_location_id ?? "") ?? "Restricted location"}</dd></div><div><dt className="text-muted-foreground">Quantity</dt><dd className="mt-1 tabular-nums">{transfer.quantity == null ? "Unknown" : formatNumber(transfer.quantity)}{transfer.status === "dispatched" ? " · In transit" : ""}</dd></div></dl>
      <dl className="mt-3 grid gap-3 text-xs xl:grid-cols-3"><div><dt>Reason</dt><dd className="whitespace-pre-wrap break-words">{transfer.reason || "—"}</dd></div><div><dt>Requested by</dt><dd>{transfer.author_name || "Unrecorded author"}</dd></div><div><dt>Requested at</dt><dd>{formatDateTime(transfer.created_at,"Date not recorded")}</dd></div></dl>
      {transfer.status === "dispatched" ? <p className="mt-2 text-xs text-warning">Destination stock increases after receipt is confirmed.</p> : null}
      <div className="md:hidden"><AssetTransferAction transferId={id} status={transfer.status ?? ""} {...access} mobileDock/></div>
      {!available.length && (transfer.status === "approved" || transfer.status === "dispatched") ? <p className="mt-3 text-xs text-muted-foreground">{transfer.status === "approved" ? "Awaiting dispatch confirmation by the source location." : "Awaiting receipt confirmation by the destination location."}</p> : null}
    </section>


  </WorkspaceGrid></>;
}
