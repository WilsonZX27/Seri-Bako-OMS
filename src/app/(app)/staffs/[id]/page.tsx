import { StaffForm } from "@/components/foundation-forms";
import { redirect } from "next/navigation";
import { RecordActionPanel, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StaffPermissionOverrides } from "@/components/staff-permission-overrides";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { canAssignRoleCode, getRoleDisplayLabel, normalizeRoleCode, sortRolesForDisplay } from "@/lib/roles";
import { formatStatusLabel } from "@/lib/status-label";
import { disableStaff, enableStaff, forceStaffPasswordChange, permanentlyDeleteStaff, resetStaffPermissionOverrides, resetStaffTemporaryPassword, updateStaff, updateStaffPermissionOverrides } from "@/server/actions/foundation";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import { getBranches, getCompaniesForSelect, getRoles, getStaff, getStaffAccess, getStaffPermissionAccess } from "@/server/queries/foundation";

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string; temp_password?: string }>;
}) {
  const { id } = await params;
  const [messageParams, staff, access, companies, branches, allRoles, profile] = await Promise.all([
    searchParams,
    getStaff(id),
    getStaffAccess(id),
    getCompaniesForSelect(),
    getBranches({ status: "active" }),
    getRoles(),
    getCurrentProfile(),
  ]);
  const assignedRole = allRoles.find((role) => role.id === access.staffRole?.role_id);
  const additionalRoles = sortRolesForDisplay(allRoles.filter((role) => access.staffRoles?.some((assignment) => assignment.role_id === role.id && role.id !== assignedRole?.id) ?? false));
  const currentRole = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role ?? null;
  const roles = sortRolesForDisplay(allRoles).filter((role) => canAssignRoleCode(currentRole, role.role_code) || role.id === assignedRole?.id);
  const roleCode = normalizeRoleCode(assignedRole?.role_code);
  const [permissionAccess, canManageOverrides] = await Promise.all([getStaffPermissionAccess(id), hasPermission("roles.update")]);
  const protectedRole = roleCode === "super_admin";
  if (protectedRole && currentRole !== "super_admin") redirect("/access-status?reason=no-permitted-route");
  const overrideCounts = {
    inherited: permissionAccess.filter((permission) => !permission.override).length,
    allowed: permissionAccess.filter((permission) => permission.override === "allow").length,
    denied: permissionAccess.filter((permission) => permission.override === "deny").length,
  };
  const formId = "staff-edit-form";
  const branchName = access.staffBranch?.branch_id ? branches.find((branch) => branch.id === access.staffBranch?.branch_id)?.branch_name ?? "-" : "-";

  return (
    <>
      <PageHeader title={staff.full_name} description="Update staff identity, access, and account actions." />
      <RecordWorkspace
        actionPanel={
          <>
            <RecordActionPanel title="Staff Actions" description="Save changes and manage this staff member's login setup.">
              <div className="rounded-[2px] border bg-white p-3">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Current Status</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StatusBadge status={staff.status} />
                  <span className="text-[11px] text-muted-foreground">Use actions below</span>
                </div>
                <div className="mt-3 flex justify-between gap-3 border-t pt-2 text-xs">
                  <span className="text-muted-foreground">Default branch</span>
                  <span className="font-medium">{branchName}</span>
                </div>
              </div>

              <div className="rounded-[2px] border bg-white p-3 text-xs">
                <p className="font-semibold">Recent Account Activity</p>
                <div className="mt-2 grid gap-2">
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Last login</span><span className="font-medium">{staff.last_login_at ? new Date(staff.last_login_at).toLocaleString("en-MY") : "-"}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-muted-foreground">Password changed</span><span className="font-medium">{staff.password_changed_at ? new Date(staff.password_changed_at).toLocaleString("en-MY") : "-"}</span></div>
                </div>
              </div>

              <Button type="submit" form={formId} className="w-full" data-mobile-primary-action>
                Save Staff
              </Button>

              <div className="grid gap-2">
                {staff.status === "disabled" ? (
                  <form action={enableStaff.bind(null, id)}>
                    <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Processing...">
                      Reactivate staff
                    </SubmitButton>
                  </form>
                ) : (
                  <DangerConfirmForm
                    action={disableStaff.bind(null, id)}
                    title="Disable sign-in?"
                    description="This staff will no longer be able to sign in. Existing documents and stock history will remain linked."
                    warning="This action is blocked if it would deactivate the last Super Admin / Owner."
                    checkboxLabel="I understand this staff will no longer be able to sign in."
                    confirmWord="DISABLE"
                    buttonLabel="Disable sign-in"
                    pendingLabel="Disabling..."
                  />
                )}
              </div>

              <div className="rounded-[2px] border bg-secondary/30 p-3 text-xs">
                <p className="font-semibold">Auth Setup</p>
                <p className="mt-1 text-xs text-muted-foreground">Internal staff accounts use a temporary password and require a secure password change.</p>
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Auth linked</span>
                    <span className="font-medium">{staff.auth_user_id ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Setup method</span>
                    <span className="font-medium">{staff.auth_setup_method === "email_invitation" ? "Email invitation" : staff.auth_setup_method === "temporary_password" ? "Temporary password" : "Not configured"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Must change password</span>
                    <span className="font-medium">{staff.must_change_password ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Invitation</span>
                    <span className="font-medium">{formatStatusLabel(staff.invitation_status ?? staff.status)}</span>
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <form action={resetStaffTemporaryPassword.bind(null, id)}>
                    <SubmitButton type="submit" className="w-full" pendingLabel="Generating...">
                      {staff.auth_user_id ? "Reset temporary password" : "Create auth account"}
                    </SubmitButton>
                  </form>
                  <form action={forceStaffPasswordChange.bind(null, id)}>
                    <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Processing...">
                      Force password change
                    </SubmitButton>
                  </form>
                </div>
              </div>

              <div className="rounded-[2px] border bg-secondary/30 p-3 text-xs">
                <p className="font-semibold">Permission Summary</p>
                <p className="mt-1 text-muted-foreground">{getRoleDisplayLabel(assignedRole?.role_code, assignedRole?.role_name)}</p>
                {additionalRoles.length ? <p className="mt-1 text-muted-foreground">Additional: {additionalRoles.map((role) => getRoleDisplayLabel(role.role_code, role.role_name)).join(", ")}</p> : null}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div><strong className="block text-sm">{overrideCounts.inherited}</strong><span className="text-muted-foreground">Inherited</span></div>
                  <div><strong className="block text-sm text-[var(--sb-success)]">{overrideCounts.allowed}</strong><span className="text-muted-foreground">Allowed</span></div>
                  <div><strong className="block text-sm text-[var(--sb-danger)]">{overrideCounts.denied}</strong><span className="text-muted-foreground">Denied</span></div>
                </div>
              </div>

            </RecordActionPanel>

            <RecordActionPanel title="Danger Zone" description="Status and removal actions require confirmation.">
              <DangerConfirmForm
                action={permanentlyDeleteStaff.bind(null, id)}
                title="Permanent delete staff"
                    description="Only use this for test users with no linked business records. Real staff with history must use Disable sign-in instead."
                    warning="This is blocked for protected owner accounts and anyone with historical records."
                checkboxLabel="I understand this permanently deletes only safe test staff records."
                confirmWord="DELETE"
                buttonLabel="Permanent delete staff"
                pendingLabel="Deleting..."
              />
            </RecordActionPanel>
          </>
        }
      >
        {messageParams.error || messageParams.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${messageParams.error ? "text-destructive" : "text-emerald-700"}`}>
              {messageParams.error ?? messageParams.success}
            </CardContent>
          </Card>
        ) : null}

        {messageParams.temp_password ? (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle>Temporary password shown once</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-amber-900">Copy this temporary password now. It will not be shown again.</p>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border bg-white p-3">
                <span className="font-mono text-lg font-semibold">{messageParams.temp_password}</span>
                <CopyTextButton value={messageParams.temp_password} label="Copy temporary password" />
              </div>
              <p className="text-xs text-amber-900">Share it securely. The staff member must change it after first login.</p>
            </CardContent>
          </Card>
        ) : null}

        <StaffForm formId={formId} staff={staff} access={access} companies={companies} branches={branches} roles={roles} action={updateStaff.bind(null, id)} showSubmit={false} />
        <StaffPermissionOverrides
          permissions={permissionAccess}
          canManage={canManageOverrides}
          protectedRole={protectedRole}
          updateAction={updateStaffPermissionOverrides.bind(null, id)}
          resetAction={resetStaffPermissionOverrides.bind(null, id)}
        />
      </RecordWorkspace>
    </>
  );
}
