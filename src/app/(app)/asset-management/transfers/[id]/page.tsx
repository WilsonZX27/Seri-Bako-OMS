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
  return <><PageHeader title="Asset transfer" description={transfer.source_id ?? `${data.asset.asset_code} · ${transfer.status}`}/><WorkspaceGrid hideMobileConsole rightRail={<ConsoleSection title="Next action" kind="action"><AssetTransferAction key={`${transfer.status}:${data.history[0]?.id ?? id}`} transferId={id} status={transfer.status ?? ""} {...access} showNote mobileDock/>{!available.length ? <p className="text-sm text-muted-foreground">No action is available for your role at this stage.</p> : null}</ConsoleSection>}>
    <section className="sb-work-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><Link className="min-w-0 break-words text-sm font-semibold underline" href={`/asset-management/assets/${transfer.asset_id}`}>{data.asset.item_name}</Link><StatusBadge status={transfer.status ?? "unknown"} className="!rounded-full"/></div>
      <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-3"><div className="min-w-0"><dt className="text-muted-foreground">From</dt><dd className="mt-1 break-words">{locations.get(transfer.from_location_id ?? "") ?? "Restricted location"}</dd></div><div className="min-w-0"><dt className="text-muted-foreground">To</dt><dd className="mt-1 break-words">{locations.get(transfer.to_location_id ?? "") ?? "Restricted location"}</dd></div><div><dt className="text-muted-foreground">Quantity</dt><dd className="mt-1 tabular-nums">{transfer.quantity == null ? "Unknown" : formatNumber(transfer.quantity)}{transfer.status === "dispatched" ? " · In transit" : ""}</dd></div></dl>
      <dl className="mt-3 grid gap-3 text-xs xl:grid-cols-3"><div><dt>Reason</dt><dd className="whitespace-pre-wrap break-words">{transfer.reason || "—"}</dd></div><div><dt>Requested by</dt><dd>{transfer.author_name || "Unrecorded author"}</dd></div><div><dt>Requested at</dt><dd>{formatDateTime(transfer.created_at,"Date not recorded")}</dd></div></dl>
      {transfer.status === "dispatched" ? <p className="mt-2 text-xs text-warning">Destination stock increases after receipt is confirmed.</p> : null}
      <div className="md:hidden"><AssetTransferAction transferId={id} status={transfer.status ?? ""} {...access} showNote mobileDock/></div>
      {!available.length && (transfer.status === "approved" || transfer.status === "dispatched") ? <p className="mt-3 text-xs text-muted-foreground">{transfer.status === "approved" ? "Awaiting dispatch confirmation by the source location." : "Awaiting receipt confirmation by the destination location."}</p> : null}
    </section>
    <section className="sb-work-surface px-4"><h2 className="flex items-center justify-between gap-3 py-3 text-sm font-semibold"><span>Action history</span><span className="text-xs font-normal tabular-nums text-muted-foreground">{data.total}</span></h2>{!data.history.length ? <p className="pb-3 text-sm text-muted-foreground">No status updates recorded.</p> : <ol className="divide-y">{data.history.map(update=><li key={update.id} className="min-w-0 py-3 text-xs"><p className="break-words font-medium">{String(update.source_data["Status Before"] ?? "Recorded update")} → {String(update.source_data["Status After"] ?? "Unrecorded status")}</p><p className="mt-1 break-words text-muted-foreground">{update.author_name || "Unrecorded author"} · {formatDateTime(update.created_at)}</p>{update.source_data.Comment ? <p className="mt-2 whitespace-pre-wrap break-words">{String(update.source_data.Comment)}</p> : null}<details className="mt-1"><summary className="min-h-11 cursor-pointer py-3">Complete update record</summary><dl className="grid gap-2 sm:grid-cols-2">{Object.entries(update.source_data).filter(([key,value])=>!key.startsWith("_") && value!==null && value!=="").map(([key,value])=><div key={key} className="min-w-0"><dt className="text-muted-foreground">{key}</dt><dd className="break-words">{String(value)}</dd></div>)}</dl></details></li>)}</ol>}</section>
    {data.total > 50 ? <PaginationControls page={page} totalPages={Math.max(1, Math.ceil(data.total / 50))} totalRows={data.total} searchParams={{}} /> : null}
  </WorkspaceGrid></>;
}
