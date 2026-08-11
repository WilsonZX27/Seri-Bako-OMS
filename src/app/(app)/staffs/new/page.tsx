import { StaffForm } from "@/components/foundation-forms";
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
              You do not have permission to invite staff. Please contact the Super Admin / Owner.
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const [companies, branches, allRoles, profile] = await Promise.all([getCompaniesForSelect(), getBranches({ status: "active" }), getRoles(), getCurrentProfile()]);
  const companyId = profile?.company_id ?? "";
  const tenantCompanies = companies.filter((company) => company.id === companyId);
  const tenantBranches = branches.filter((branch) => branch.company_id === companyId);
  const tenantRoles = allRoles.filter((role) => role.company_id === companyId);
  const currentRole = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role ?? null;
  const roles = sortRolesForDisplay(tenantRoles).filter((role) => canAssignRoleCode(currentRole, role.role_code));
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
            <div className="rounded-[var(--sb-panel-radius)] border bg-secondary/30 p-4 text-sm text-muted-foreground">
              The temporary password is entered in the Sign-in setup section and must be changed at first login.
            </div>
            <div className="rounded-[var(--sb-panel-radius)] border bg-secondary/30 p-4 text-sm text-muted-foreground">
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
        <StaffForm formId={formId} companies={tenantCompanies} branches={tenantBranches} roles={roles} action={createStaff} showSubmit={false} includeAuthSetup />
      </RecordWorkspace>
    </>
  );
}
