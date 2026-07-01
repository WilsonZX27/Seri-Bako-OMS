import { StaffForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createStaff } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getLocations, getRoles } from "@/server/queries/foundation";

export default async function NewStaffPage() {
  const [companies, branches, roles, locations] = await Promise.all([getCompaniesForSelect(), getBranches(), getRoles(), getLocations()]);
  return (
    <>
      <PageHeader title="New Staff" description="Create a staff record, assign access, and send an invitation email." />
      <div className="p-5"><StaffForm companies={companies} branches={branches} roles={roles} locations={locations} action={createStaff} /></div>
    </>
  );
}
