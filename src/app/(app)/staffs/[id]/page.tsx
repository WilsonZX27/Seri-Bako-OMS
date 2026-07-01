import { StaffForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateStaff } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getLocations, getRoles, getStaff, getStaffAccess } from "@/server/queries/foundation";

export default async function EditStaffPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [staff, access, companies, branches, roles, locations] = await Promise.all([getStaff(id), getStaffAccess(id), getCompaniesForSelect(), getBranches(), getRoles(), getLocations()]);
  return (
    <>
      <PageHeader title="Edit Staff" description="Update staff identity, branch assignment, and status." />
      <div className="p-5"><StaffForm staff={staff} access={access} companies={companies} branches={branches} roles={roles} locations={locations} action={updateStaff.bind(null, id)} /></div>
    </>
  );
}
