import { LocationForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateLocation } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getLocation } from "@/server/queries/foundation";

export default async function EditLocationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [location, companies, branches] = await Promise.all([getLocation(id), getCompaniesForSelect(), getBranches()]);
  return (
    <>
      <PageHeader title="Edit Location" description="Update storage location details and branch assignment." />
      <div className="p-5"><LocationForm location={location} companies={companies} branches={branches} action={updateLocation.bind(null, id)} /></div>
    </>
  );
}
