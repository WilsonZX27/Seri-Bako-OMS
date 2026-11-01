import Link from "next/link";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { randomUUID } from "node:crypto";
import { AssetMasterForm } from "@/components/asset-master-form";
import { assetMasterValues } from "@/lib/asset-master";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/server/auth/permissions";
import { getAssetRegistration, getAssetMasterOptions } from "@/server/queries/assets";

export default async function NewAssetPage() {
  const actor=await requireActiveTenantActor();
  await requirePermission("assets.manage");
  const data = await getAssetRegistration();
  const options = data.active ? await getAssetMasterOptions() : undefined;
  return <>{actor.roleCode === "super_admin" ? <Link href="/asset-management/import" className="inline-flex min-h-11 items-center px-4 text-sm underline">Import from Excel</Link> : null}<PageHeader title="Register asset" description="Register an asset and its initial physical holding."/>{data.active ? <AssetMasterForm automaticId={data.automaticId} nextCode={data.nextCode} options={options} values={assetMasterValues({},{})} locations={data.locations} requestKey={randomUUID()}/> : <WorkspaceGrid><EmptyState title="Asset migration pending" description="Complete migration reconciliation before registering new assets."/></WorkspaceGrid>}</>;
}
