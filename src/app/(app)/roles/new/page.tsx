import { RoleForm } from "@/components/foundation-forms";
import { PageHeader } from "@/components/ui/page-header";
import { createRole } from "@/server/actions/foundation";
import { getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewRolePage() {
  const companies = await getCompaniesForSelect();
  return (
    <>
      <PageHeader title="New Role" description="Create a role definition for permission governance." />
      <div className="p-5"><RoleForm companies={companies} action={createRole} /></div>
    </>
  );
}
