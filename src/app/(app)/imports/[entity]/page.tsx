import { notFound } from "next/navigation";
import { ImportWorkflow } from "@/components/imports/import-workflow";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/system-states";
import { importTemplates, type ImportEntity } from "@/lib/imports/config";
import { formatPageError } from "@/server/actions/error-handling";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile, getSuppliersForSelect } from "@/server/queries/common";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity } = await params;
    if (!(entity in importTemplates)) notFound();
    const typedEntity = entity as ImportEntity;
    const profile = await getCurrentProfile();
    const allowed = (await hasPermission("imports.create")) || (await hasPermission("company.update"));
    const label = importTemplates[typedEntity].label;
    const suppliers = typedEntity === "items" ? await getSuppliersForSelect() : [];

    return (
      <>
        <PageHeader title={`Import ${label}`} description="Upload, preview, validate, and import only clean rows." />
        {allowed && profile?.company_id ? <ImportWorkflow draftScope={`${profile.company_id}:${profile.id}:${"auth_user_id" in profile ? profile.auth_user_id ?? "" : profile.id}`} entity={typedEntity} suppliers={suppliers} /> : <WorkspaceGrid tabletCanvas="contained"><Notice tone="error" title="Permission required">You do not have permission to manage data imports.</Notice></WorkspaceGrid>}
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Import Data" description="Upload, preview, validate, and import only clean rows." />
        <WorkspaceGrid tabletCanvas="contained"><Notice tone="error" title="Import unavailable">{formatPageError(error, "This import workspace is unavailable right now. Please try again shortly.")}</Notice></WorkspaceGrid>
      </>
    );
  }
}
