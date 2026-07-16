import { notFound } from "next/navigation";
import { ImportWorkflow } from "@/components/imports/import-workflow";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { importTemplates, type ImportEntity } from "@/lib/imports/config";
import { formatPageError } from "@/server/actions/error-handling";
import { hasPermission } from "@/server/auth/permissions";
import { getSuppliersForSelect } from "@/server/queries/common";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";

export const dynamic = "force-dynamic";

export default async function ImportPage({ params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity } = await params;
    if (!(entity in importTemplates)) notFound();
    const typedEntity = entity as ImportEntity;
    const allowed = (await hasPermission("imports.create")) || (await hasPermission("company.update"));
    const label = importTemplates[typedEntity].label;
    const suppliers = typedEntity === "items" ? await getSuppliersForSelect() : [];

    return (
      <>
        <PageHeader title={`Import ${label}`} description="Upload, preview, validate, and import only clean rows." />
        <RightConsoleMount>
          <ConsoleSection title="Import context">
            <p className="text-xs text-muted-foreground">Step through template, upload, review, and confirmation for {label}.</p>
            <p className="text-xs text-muted-foreground">Confirm stays unavailable until the current rows pass validation.</p>
          </ConsoleSection>
        </RightConsoleMount>
        <div className="p-5">
          {allowed ? (
            <ImportWorkflow entity={typedEntity} suppliers={suppliers} />
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
              {formatPageError(error, "This import workspace is unavailable right now. Please try again shortly.")}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }
}
