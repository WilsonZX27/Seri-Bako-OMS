import { todayInKualaLumpur } from "@/lib/business-date";
import { AssetTransferBatchForm } from "@/components/asset-transfer-batch-form";
import { AssetOtherLocationForm } from "@/components/asset-other-location-form";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
import { ConsoleSection } from "@/components/layout/right-console";
import { getAssetTransferRequestOptions } from "@/server/queries/assets";
import { requirePermission } from "@/server/auth/permissions";

export default async function NewTransfer({ searchParams }: { searchParams: Promise<{ asset?: string; q?: string; from?: string }> }) {
  await requirePermission("assets.transfer");
  const actor = await requireActiveTenantActor();
  const [query, options] = await Promise.all([searchParams, getAssetTransferRequestOptions()]);
  return <DocumentWorkspace breadcrumbs={[{ label: "Asset Management", href: "/asset-management" }, { label: "Transfers", href: "/asset-management?view=transfers" }]} documentNo="New Asset Transfer" title="Asset transfer" status="request" currentStatus="request" workflowSteps={[{ key: "request", label: "Request" }, { key: "approved", label: "Approve" }, { key: "dispatched", label: "Dispatch" }, { key: "received", label: "Receive" }]} mobilePrimaryAction={<div data-transfer-request-slot/>} sidePanel={<><ConsoleSection title="Actions"><div data-transfer-request-slot/></ConsoleSection><ConsoleSection title="Transfer history"><Link className="min-h-11 py-3 underline" href="/asset-management?view=transfers">Open transfer register</Link></ConsoleSection></>}>
    <AssetTransferBatchForm {...options} requestKey={randomUUID()} today={todayInKualaLumpur()} initialAsset={query.asset} initialSource={options.sourceIds.includes(query.from ?? "") ? query.from : ""} initialQuery={(query.q ?? "").slice(0, 120)}/>
    {actor.roleCode === "super_admin" ? <AssetOtherLocationForm/> : null}
  </DocumentWorkspace>;
}
