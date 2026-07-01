import { RoleForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { updateRole } from "@/server/actions/foundation";
import { getCompaniesForSelect, getRole } from "@/server/queries/foundation";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [role, companies] = await Promise.all([getRole(id), getCompaniesForSelect()]);
  return (
    <>
      <PageHeader title="Edit Role" description="Update role details and status." />
      <div className="p-5"><RoleForm role={role} companies={companies} action={updateRole.bind(null, id)} /></div>
    </>
  );
}
