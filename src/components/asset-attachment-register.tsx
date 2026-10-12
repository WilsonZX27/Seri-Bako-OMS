import Link from "next/link";
import { notFound } from "next/navigation";
import { AssetAttachmentList } from "@/components/asset-attachment-list";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getAssetAttachmentRegister } from "@/server/queries/assets";

export async function AssetAttachmentRegister({ kind, id, page: rawPage }: { kind: "asset" | "maintenance"; id: string; page?: string }) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const parsed = Number(rawPage ?? "1"), page = Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 1_000_000 ? parsed : 1;
  const data = await getAssetAttachmentRegister(kind, id, page); if (!data) notFound();
  return <><PageHeader title="Attachment records" description={`${data.label} · ${data.total} attachments`}/><WorkspaceGrid>
    <section className="sb-work-surface px-4"><AssetAttachmentList attachments={data.attachments} showMaintenanceLink={kind === "asset"}/></section>
    {data.total > 50 ? <nav className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm" aria-label="Attachment pages">
      {page > 1 ? <Link className="min-h-11 py-3 underline" href={`?page=${page - 1}`}>Previous</Link> : <span/>}
      <span className="tabular-nums">{page} / {Math.max(1,Math.ceil(data.total / 50))}</span>
      {page * 50 < data.total ? <Link className="min-h-11 py-3 underline" href={`?page=${page + 1}`}>Next</Link> : <span/>}
    </nav> : null}
  </WorkspaceGrid></>;
}
