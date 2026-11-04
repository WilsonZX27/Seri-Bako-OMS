import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { randomUUID } from "node:crypto";
import { AssetMasterForm } from "@/components/asset-master-form";
import { assetMasterValues } from "@/lib/asset-master";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceCanvas, WorkspaceGrid } from "@/components/layout/workspace-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/server/auth/permissions";
import { getAssetRegistration, getAssetMasterOptions } from "@/server/queries/assets";

export default async function NewAssetPage() {
  const actor=await requireActiveTenantActor();
  await requirePermission("assets.manage");
  const data = await getAssetRegistration();
  const options = data.active ? await getAssetMasterOptions() : undefined;
  return <>{actor.roleCode === "super_admin" ? <WorkspaceCanvas className="py-3"><Button asChild variant="secondary" className="max-xl:h-11 max-xl:min-h-11"><Link href="/asset-management/import"><FileSpreadsheet className="size-4" aria-hidden="true"/>Import from Excel</Link></Button></WorkspaceCanvas> : null}<PageHeader title="Register asset" description="Register an asset and its initial physical holding."/>{data.active ? <AssetMasterForm automaticId={data.automaticId} nextCode={data.nextCode} options={options} values={assetMasterValues({},{})} locations={data.locations} requestKey={randomUUID()}/> : <WorkspaceGrid><EmptyState title="Asset migration pending" description="Complete migration reconciliation before registering new assets."/></WorkspaceGrid>}</>;
}
