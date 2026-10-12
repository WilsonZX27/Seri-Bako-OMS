import { AssetMasterHistoryList } from "@/components/asset-master-history-list";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getAssetMasterHistory } from "@/server/queries/assets";

export default async function MasterHistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const query = await searchParams, page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const data = await getAssetMasterHistory(id, page); if (!data) notFound();
  return <><PageHeader title="Master history" description={`${data.asset.asset_code} · ${data.total} changes`}/><WorkspaceGrid><AssetMasterHistoryList history={data.history} source={data.asset.source_data}/>{data.total > 50 ? <nav className="flex items-center justify-between py-3 text-sm" aria-label="Master history pages">{page>1?<Link className="min-h-11 py-3 underline" href={`?page=${page-1}`}>Previous</Link>:<span/>}<span>{page} / {Math.max(1,Math.ceil(data.total/50))}</span>{page*50<data.total?<Link className="min-h-11 py-3 underline" href={`?page=${page+1}`}>Next</Link>:<span/>}</nav> : null}</WorkspaceGrid></>;
}
