import { StaffAuthSetupFields, StaffForm } from "@/components/foundation-forms";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { canAssignRoleCode, getRoleDisplayLabel, sortRolesForDisplay } from "@/lib/roles";
import { createStaff } from "@/server/actions/foundation";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
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
        <PageHeader title="New Staff" description="Create a staff record, assign access, and set up login." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              You do not have permission to invite staff. Please contact an administrator.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const [companies, branches, allRoles, profile] = await Promise.all([getCompaniesForSelect(), getBranches(), getRoles(), getCurrentProfile()]);
  const currentRole = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role ?? "viewer";
  const roles = sortRolesForDisplay(allRoles).filter((role) => canAssignRoleCode(currentRole, role.role_code));
  const formId = "staff-create-form";

  if (!roles.length) {
    return (
      <>
        <PageHeader title="New Staff" description="Create a staff record, assign access, and set up login." />
        <div className="p-5">
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">
              You do not have permission to assign staff roles.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="New Staff" description="Create a staff profile, assign role and branch access, then complete login setup from the action panel." />
      <RecordWorkspace
        actionPanel={
          <RecordActionPanel title="Staff Actions" description="Create the profile and choose how this staff member signs in.">
            <div className="rounded-[2px] border bg-secondary/30 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Auth Setup</p>
                <p className="mt-1 text-xs text-muted-foreground">Temporary password is recommended for internal staff.</p>
              </div>
              <StaffAuthSetupFields formId={formId} />
            </div>
            <div className="rounded-[2px] border bg-secondary/30 p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Role assignment</p>
              <p className="mt-1">Your current role can assign: {roles.map((role) => getRoleDisplayLabel(role.role_code, role.role_name)).join(", ")}.</p>
            </div>
            <Button type="submit" form={formId} className="w-full" data-mobile-primary-action>
              Create Staff
            </Button>
          </RecordActionPanel>
        }
      >
        {params.error ? (
          <Card>
            <CardContent className="p-4 text-sm text-destructive">{params.error}</CardContent>
          </Card>
        ) : null}
        <StaffForm formId={formId} companies={companies} branches={branches} roles={roles} action={createStaff} showSubmit={false} />
      </RecordWorkspace>
    </>
  );
}
