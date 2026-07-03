import { StaffForm } from "@/components/foundation-forms";
import { RecordActionPanel, RecordSection, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { canAssignRoleCode, getRoleDisplayLabel, normalizeRoleCode, sortRolesForDisplay } from "@/lib/roles";
import { disableStaff, enableStaff, forceStaffPasswordChange, resendStaffInvite, resetStaffTemporaryPassword, updateStaff } from "@/server/actions/foundation";
import { roleDescriptions } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import { getBranches, getCompaniesForSelect, getRoles, getStaff, getStaffAccess } from "@/server/queries/foundation";

const roleSummaries = {
  super_admin: {
    allowed: ["Own the system", "Manage users and roles", "Run all workflow actions"],
    denied: ["No standard restrictions"],
  },
  operations_admin: {
    allowed: ["Invite staff", "Manage branches and locations", "Admin review purchase requests"],
    denied: ["Purchasing verification", "Manager approval", "Protected owner role assignment"],
  },
  purchasing: {
    allowed: ["Manage suppliers and items", "Purchasing review purchase requests", "Create and send purchase orders"],
    denied: ["Manage users", "Manager approval", "System owner settings"],
  },
  manager: {
    allowed: ["Approve purchase requests", "Approve purchase orders", "View reports and workflow history"],
    denied: ["Purchasing verification", "Manage users", "Create supplier or item master data"],
  },
  finance: {
    allowed: ["View finance and report summaries", "Review documents", "Track operational records"],
    denied: ["Approve PR workflow", "Manage users", "Post stock"],
  },
  kitchen_staff: {
    allowed: ["Create PR", "View assigned branch stock", "Prepare receiving and upload attachments"],
    denied: ["Approve PR", "Convert to PO", "Manage users"],
  },
  viewer: {
    allowed: ["View assigned documents and reports"],
    denied: ["Create, approve, post, or manage master data"],
  },
} as const;

function getRoleSummary(roleCode?: string | null) {
  const normalized = normalizeRoleCode(roleCode) as keyof typeof roleSummaries;
  return roleSummaries[normalized] ?? roleSummaries.viewer;
}

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
    getBranches(),
    getRoles(),
    getCurrentProfile(),
  ]);
  const assignedRole = allRoles.find((role) => role.id === access.staffRole?.role_id);
  const currentRole = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role ?? "viewer";
  const roles = sortRolesForDisplay(allRoles).filter((role) => canAssignRoleCode(currentRole, role.role_code) || role.id === assignedRole?.id);
  const roleCode = normalizeRoleCode(assignedRole?.role_code);
  const roleSummary = getRoleSummary(assignedRole?.role_code);
  const formId = "staff-edit-form";
  const branchName = access.staffBranch?.branch_id ? branches.find((branch) => branch.id === access.staffBranch?.branch_id)?.branch_name ?? "-" : "-";

  return (
    <>
      <PageHeader title={staff.full_name} description="Update staff identity, access, and account actions." />
      <RecordWorkspace
        actionPanel={
          <>
            <RecordActionPanel title="Staff Actions" description="Save changes and manage this staff member's login setup.">
              <Button type="submit" form={formId} className="w-full">
                Save Staff
              </Button>

              <div className="rounded-lg border bg-secondary/30 p-4">
                <p className="text-sm font-semibold">Auth Setup</p>
                <p className="mt-1 text-xs text-muted-foreground">Temporary password is recommended for internal staff. Email invitation is optional and can expire.</p>
                <div className="mt-3 grid gap-2 text-sm">
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
                    <span className="font-medium">{staff.invitation_status ?? staff.status}</span>
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
                  <form action={resendStaffInvite.bind(null, id)}>
                    <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Sending invite...">
                      Resend email invitation
                    </SubmitButton>
                  </form>
                </div>
              </div>

              <div className="rounded-lg border bg-secondary/30 p-4 text-sm">
                <p className="font-semibold">Permission Summary</p>
                <p className="mt-1 text-muted-foreground">{getRoleDisplayLabel(assignedRole?.role_code, assignedRole?.role_name)}</p>
                <p className="mt-2 text-xs text-muted-foreground">{roleDescriptions[roleCode as keyof typeof roleDescriptions] ?? "No role summary available."}</p>
                <div className="mt-3 grid gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase text-emerald-800">Allowed</p>
                    <ul className="mt-1 space-y-1 text-xs text-emerald-950">
                      {roleSummary.allowed.map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-slate-600">Not allowed</p>
                    <ul className="mt-1 space-y-1 text-xs text-slate-700">
                      {roleSummary.denied.map((item) => <li key={item}>- {item}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            </RecordActionPanel>

            {staff.status === "disabled" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Enable Staff</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={enableStaff.bind(null, id)}>
                    <SubmitButton type="submit" variant="outline" pendingLabel="Processing...">
                      Enable user
                    </SubmitButton>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <DangerConfirmForm
                action={disableStaff.bind(null, id)}
                title="Deactivate this staff?"
                description="This staff will no longer be able to sign in. Existing documents and stock history will remain linked."
                warning="This action is blocked if it would deactivate the last Super Admin / Owner."
                checkboxLabel="I understand this staff will no longer be able to sign in."
                confirmWord="DEACTIVATE"
                buttonLabel="Deactivate user"
                pendingLabel="Deactivating..."
              />
            )}
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
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-white p-3">
                <span className="font-mono text-lg font-semibold">{messageParams.temp_password}</span>
                <CopyTextButton value={messageParams.temp_password} label="Copy temporary password" />
              </div>
              <p className="text-xs text-amber-900">Share it securely. The staff member must change it after first login.</p>
            </CardContent>
          </Card>
        ) : null}

        <StaffForm formId={formId} staff={staff} access={access} companies={companies} branches={branches} roles={roles} action={updateStaff.bind(null, id)} showSubmit={false} />

        <RecordSection title="Staff Review" description="Quick account and access details for admin review.">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-md border bg-secondary/30 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">Role</p>
              <p className="mt-1 font-semibold">{getRoleDisplayLabel(assignedRole?.role_code, assignedRole?.role_name)}</p>
            </div>
            <div className="rounded-md border bg-secondary/30 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">Branch access</p>
              <p className="mt-1 font-semibold">{branchName}</p>
            </div>
            <div className="rounded-md border bg-secondary/30 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">Password changed at</p>
              <p className="mt-1 font-semibold">{staff.password_changed_at ? new Date(staff.password_changed_at).toLocaleString("en-MY") : "-"}</p>
            </div>
          </div>
        </RecordSection>
      </RecordWorkspace>
    </>
  );
}
