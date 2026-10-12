import { randomUUID } from "node:crypto";
import { AssetMasterForm } from "@/components/asset-master-form";
import { assetMasterValues } from "@/lib/asset-master";
import { PageHeader } from "@/components/ui/page-header";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { EmptyState } from "@/components/ui/empty-state";
import { requirePermission } from "@/server/auth/permissions";
import { getAssetRegistration } from "@/server/queries/assets";

export default async function NewAssetPage() {
  await requirePermission("assets.manage");
  const data = await getAssetRegistration();
  return <><PageHeader title="Register asset" description="Record the original ID and initial physical holding."/><WorkspaceGrid>{data.active ? <AssetMasterForm values={assetMasterValues({},{})} locations={data.locations} requestKey={randomUUID()}/> : <EmptyState title="Asset migration pending" description="Complete migration reconciliation before registering new assets."/>}</WorkspaceGrid></>;
}
