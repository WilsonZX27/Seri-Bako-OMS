import { LocationForm } from "@/components/foundation-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { restoreLocation, updateLocation } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getLocation } from "@/server/queries/foundation";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [location, companies, branches] = await Promise.all([getLocation(id), getCompaniesForSelect(), getBranches()]);
  return (
    <>
      <PageHeader title="Edit Location" description="Update storage location details and branch assignment." />
      <div className="space-y-4 p-5">
        <LocationForm location={location} companies={companies} branches={branches} action={updateLocation.bind(null, id)} />
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
      </div>
    </>
  );
}
