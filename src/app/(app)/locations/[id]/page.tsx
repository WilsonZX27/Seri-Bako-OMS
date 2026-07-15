import { LocationForm } from "@/components/foundation-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { StatusBadge } from "@/components/ui/status-badge";
import Link from "next/link";
import { deleteLocation, restoreLocation, updateLocation } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getLocation } from "@/server/queries/foundation";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [location, companies, branches] = await Promise.all([getLocation(id), getCompaniesForSelect(), getBranches()]);
  const formId = "location-edit-form";
  const isSystemDefault = branches.some((branch) => branch.default_location_id === id);
  return (
    <>
      <PageHeader title="Edit Location" description="Update storage location details and branch assignment." />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Location Actions"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={location.deleted_at ? "archived" : location.status} /></div><Button form={formId} type="submit" className="w-full" data-mobile-primary-action>Save location</Button><Button asChild variant="outline" className="w-full"><Link href="/locations">Back to locations</Link></Button></RecordActionPanel><RecordActionPanel title="Lifecycle">{location.deleted_at ? <form action={restoreLocation.bind(null, id)}><Button type="submit" className="w-full">Restore location</Button></form> : isSystemDefault ? <p className="text-xs text-muted-foreground">This is the branch system-default stock area. It cannot be archived while assigned as the branch default.</p> : <DangerConfirmForm action={deleteLocation.bind(null, id)} title="Archive this location?" description="The location will leave active lists while its ledger history is preserved." checkboxLabel="I understand this location will no longer be available for new stock movements." confirmWord="ARCHIVE" buttonLabel="Archive location" pendingLabel="Archiving..." />}</RecordActionPanel></>}>
        <LocationForm formId={formId} showSubmit={false} location={location} companies={companies} branches={branches} action={updateLocation.bind(null, id)} />
        {location.deleted_at ? (
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">This location is archived.</p>
                <p className="text-sm text-muted-foreground">Restore it instead of creating a duplicate internal stock area.</p>
              </div>
              <form action={restoreLocation.bind(null, id)}>
                <Button type="submit">Restore location</Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </RecordWorkspace>
    </>
  );
}
