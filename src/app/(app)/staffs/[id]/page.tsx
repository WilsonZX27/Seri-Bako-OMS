import { StaffForm } from "@/components/foundation-forms";
import { RecordActionPanel, RecordSection, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { canAssignRoleCode, getRoleDisplayLabel, normalizeRoleCode, sortRolesForDisplay } from "@/lib/roles";
import { disableStaff, enableStaff, forceStaffPasswordChange, permanentlyDeleteStaff, resendStaffInvite, resetStaffTemporaryPassword, updateStaff } from "@/server/actions/foundation";
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

const permissionGroups = [
  {
    title: "Procurement",
    permissions: ["Create Purchase Request", "Submit Purchase Request", "Manager Approve PR", "Admin Key In / Review", "Finance Review", "Convert PR to PO", "Send PO to Supplier"],
  },
  {
    title: "Inventory",
    permissions: ["View Stock Balance", "Create Stock Count", "Create Stock Transfer", "Record Wastage", "View Movement Ledger", "Import Opening Stock"],
  },
  {
    title: "Master Data / Admin",
    permissions: ["Manage Items", "Manage Suppliers", "Manage UOM Conversions", "Manage Branches", "Manage Locations", "Manage Staff", "Manage Roles & Permissions"],
  },
];

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
  const allowedSummaryItems = roleSummary.allowed as readonly string[];
  const formId = "staff-edit-form";
  const branchName = access.staffBranch?.branch_id ? branches.find((branch) => branch.id === access.staffBranch?.branch_id)?.branch_name ?? "-" : "-";

  return (
    <>
      <PageHeader title={staff.full_name} description="Update staff identity, access, and account actions." />
      <RecordWorkspace
        actionPanel={
          <>
            <RecordActionPanel title="Staff Actions" description="Save changes and manage this staff member's login setup.">
              <div className="rounded-lg border bg-white p-3">
                <p className="text-[11px] font-medium uppercase text-muted-foreground">Current Status</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <StatusBadge status={staff.status} />
                  <span className="text-[11px] text-muted-foreground">Use actions below</span>
                </div>
              </div>

              <Button type="submit" form={formId} className="w-full">
                Save Staff
              </Button>

              <div className="rounded-lg border bg-secondary/30 p-3">
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

              <div className="rounded-lg border bg-secondary/30 p-3 text-sm">
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

              <div className="rounded-lg border bg-white p-3">
                <p className="text-sm font-semibold">Function Permissions</p>
                <p className="mt-1 text-xs text-muted-foreground">Role-derived checklist. Additional responsibilities can be assigned through Roles & Permissions.</p>
                <div className="mt-3 space-y-3">
                  {permissionGroups.map((group) => (
                    <div key={group.title}>
                      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{group.title}</p>
                      <div className="mt-1 grid gap-1">
                        {group.permissions.map((permission) => {
                          const allowed = allowedSummaryItems.some((item) => permission.toLowerCase().includes(item.toLowerCase().split(" ")[0])) || allowedSummaryItems.includes("No standard restrictions");
                          return (
                            <div key={permission} className="flex items-center gap-2 text-xs">
                              <span className={`h-2 w-2 rounded-full ${allowed ? "bg-emerald-500" : "bg-slate-300"}`} />
                              <span className={allowed ? "text-foreground" : "text-muted-foreground"}>{permission}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3 text-sm">
                <p className="font-semibold">Branch Access Summary</p>
                <div className="mt-2 flex justify-between gap-3 text-xs">
                  <span className="text-muted-foreground">Default branch</span>
                  <span className="font-medium">{branchName}</span>
                </div>
              </div>

              <div className="rounded-lg border bg-white p-3 text-sm">
                <p className="font-semibold">Recent Account Activity</p>
                <div className="mt-2 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Last login</span>
                    <span className="font-medium">{staff.last_login_at ? new Date(staff.last_login_at).toLocaleString("en-MY") : "-"}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Password changed</span>
                    <span className="font-medium">{staff.password_changed_at ? new Date(staff.password_changed_at).toLocaleString("en-MY") : "-"}</span>
                  </div>
                </div>
              </div>
            </RecordActionPanel>

            <RecordActionPanel title="Danger Zone" description="Status and removal actions require confirmation.">
              {staff.status === "disabled" ? (
                  <form action={enableStaff.bind(null, id)}>
                    <SubmitButton type="submit" variant="outline" pendingLabel="Processing...">
                      Enable user
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
              <DangerConfirmForm
                action={permanentlyDeleteStaff.bind(null, id)}
                title="Permanent delete staff"
                description="Only use this for test users with no linked business records. Real staff with history must use Disable sign-in instead."
                warning="This is blocked for Wilson Super Admin / Owner, protected owner accounts, and anyone with historical records."
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
