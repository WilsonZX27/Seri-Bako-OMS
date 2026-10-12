import { addDays } from "@/lib/production-planning/forecast";
import { randomUUID } from "node:crypto";
import { AssetChecklistForm } from "@/components/asset-checklist-form";
import { hasPermission } from "@/server/auth/permissions";
import { todayInKualaLumpur } from "@/lib/business-date";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getAssetLocation, getAssetInspection } from "@/server/queries/assets";
import { formatNumber } from "@/lib/utils";
export default async function AssetLocationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; check?: string; date?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const query = await searchParams, page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const canCheck = await hasPermission("assets.check");
  const data = canCheck && query.check === "1" ? await getAssetInspection(id) : await getAssetLocation(id, page);
  if (!data) notFound();
  const date = query.date ?? todayInKualaLumpur();
  try { addDays(date, 0); } catch { notFound(); }
  const inspecting = canCheck && query.check === "1" && date <= todayInKualaLumpur();
  const assets = new Map(data.assets.map(a => [a.id, a]));
  return <><PageHeader title={data.location.source_name} description={`${data.total} asset IDs held at this location.`} /><WorkspaceGrid>{canCheck && !inspecting ? <Link className="min-h-11 py-3 text-sm underline" href={`?page=${page}&check=1&date=${date}`}>Inspect assets</Link> : null}{inspecting ? <AssetChecklistForm locationId={id} locationName={data.location.source_name} assets={data.assets} holdings={data.holdings} date={date} today={todayInKualaLumpur()} submissionId={randomUUID()}/> : null}{!inspecting ? <section className="sb-work-surface divide-y">{data.holdings.map(h => <Link href={`/asset-management/assets/${h.asset_id}`} className="flex min-h-16 items-center justify-between gap-4 p-3" key={h.asset_id}><span className="min-w-0"><strong className="block break-words text-sm">{assets.get(h.asset_id)?.item_name ?? "Unavailable asset"}</strong><span className="text-xs text-muted-foreground">{assets.get(h.asset_id)?.asset_code}</span></span><span className={h.quantity === null ? "text-warning text-sm" : "tabular-nums text-sm"}>{h.quantity === null ? "Unknown quantity" : formatNumber(h.quantity)}</span></Link>)}</section> : null}{!inspecting && data.total > 50 ? <nav className="flex justify-between py-3 text-sm" aria-label="Location asset pages">{page > 1 ? <Link href={`?page=${page - 1}&date=${date}${query.check === "1" ? "&check=1" : ""}`} className="min-h-11 py-3 underline">Previous</Link> : <span />}<span>{page}</span>{page * 50 < data.total ? <Link href={`?page=${page + 1}&date=${date}${query.check === "1" ? "&check=1" : ""}`} className="min-h-11 py-3 underline">Next</Link> : <span />}</nav> : null}</WorkspaceGrid></>;
}
