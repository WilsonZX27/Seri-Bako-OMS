import { notFound } from "next/navigation";
import { ImportWorkflow } from "@/components/imports/import-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { importTemplates, type ImportEntity } from "@/lib/imports/config";
import { hasPermission } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity } = await params;
    if (!(entity in importTemplates)) notFound();
    const typedEntity = entity as ImportEntity;
    const allowed = (await hasPermission("imports.create")) || (await hasPermission("company.update"));
    const label = importTemplates[typedEntity].label;

    return (
      <>
        <PageHeader title={`Import ${label}`} description="Upload, preview, validate, and import only clean rows." />
        <div className="p-5">
          {allowed ? (
            <ImportWorkflow entity={typedEntity} />
          ) : (
            <Card>
              <CardContent className="p-5 text-sm text-muted-foreground">
                You do not have permission to manage data imports.
              </CardContent>
            </Card>
          )}
        </div>
      </>
    );
  } catch (error) {
    console.error(error);
    return (
      <>
        <PageHeader title="Import Data" description="Upload, preview, validate, and import only clean rows." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              This import workspace is unavailable right now. Please try again shortly.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
