import { LocationForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createLocation } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewLocationPage() {
  const [companies, branches] = await Promise.all([getCompaniesForSelect(), getBranches()]);
  return (
    <>
      <PageHeader title="New Location" description="Create an inventory storage area under a branch." />
      <div className="p-5"><LocationForm companies={companies} branches={branches} action={createLocation} /></div>
    </>
  );
}
