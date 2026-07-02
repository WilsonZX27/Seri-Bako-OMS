import { StaffForm } from "@/components/foundation-forms";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { createStaff } from "@/server/actions/foundation";
import { hasPermission } from "@/server/auth/permissions";
import { getBranches, getCompaniesForSelect, getRoles } from "@/server/queries/foundation";

export default async function NewStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [params, allowed] = await Promise.all([searchParams, hasPermission("staffs.create")]);

  if (!allowed) {
    return (
      <>
        <PageHeader title="New Staff" description="Create a staff record, assign access, and send an invitation email." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              You do not have permission to invite staff. Please contact an Admin.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const [companies, branches, roles] = await Promise.all([getCompaniesForSelect(), getBranches(), getRoles()]);
  return (
    <>
      <PageHeader title="New Staff" description="Create a staff record, assign access, and send an invitation email." />
      <div className="space-y-4 p-5">
        {params.error ? (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent>
          </Card>
        ) : null}
        <StaffForm companies={companies} branches={branches} roles={roles} action={createStaff} />
      </div>
    </>
  );
}
