import { RoleForm } from "@/components/foundation-forms";
import Link from "next/link";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { createRole } from "@/server/actions/foundation";
import { getCompaniesForSelect } from "@/server/queries/foundation";

export default async function NewRolePage() {
  const companies = await getCompaniesForSelect();
  return (
    <>
      <PageHeader title="New Role" description="Create a role definition for permission governance." />
      <RecordWorkspace actionPanel={<RecordActionPanel title="Role Actions" description="Create the role identity. Permission behavior remains governed by existing assignments."><Button type="submit" form="role-create-form" className="w-full">Create Role</Button><Button asChild variant="outline" className="w-full"><Link href="/roles">Cancel</Link></Button></RecordActionPanel>}><RoleForm formId="role-create-form" companies={companies} action={createRole} showSubmit={false} /></RecordWorkspace>
    </>
  );
}
