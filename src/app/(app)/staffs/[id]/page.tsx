import { StaffForm } from "@/components/foundation-forms";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { roleDescriptions } from "@/server/auth/permissions";
import { disableStaff, enableStaff, forceStaffPasswordChange, resendStaffInvite, resetStaffTemporaryPassword, updateStaff } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getRoles, getStaff, getStaffAccess } from "@/server/queries/foundation";

const roleSummaries = {
  super_admin: {
    allowed: ["Manage system settings", "Manage users and roles", "Run all workflow actions"],
    denied: ["No standard restrictions"],
  },
  operations_admin: {
    allowed: ["Invite staff", "Manage branches and locations", "Admin review purchase requests"],
    denied: ["Purchasing verification", "Manager approval", "Convert PR to PO unless explicitly assigned"],
  },
  purchasing: {
    allowed: ["Manage suppliers and items", "Purchasing review purchase requests", "Create and send purchase orders"],
    denied: ["Manage users", "Manager approval", "System settings"],
  },
  manager: {
    allowed: ["Approve purchase requests", "Approve purchase orders", "View reports and workflow history"],
    denied: ["Purchasing verification", "Manage users", "Create supplier or item master data"],
  },
  kitchen_staff: {
    allowed: ["Create PR", "View assigned branch stock", "Prepare receiving and upload attachments"],
    denied: ["Approve PR", "Convert to PO", "Manage users"],
  },
  admin: {
    allowed: ["Manage system settings", "Manage users and roles", "Run all workflow actions"],
    denied: ["No standard restrictions"],
  },
  kitchen: {
    allowed: ["Create PR", "View assigned branch stock", "Prepare receiving and upload attachments"],
    denied: ["Approve PR", "Convert to PO", "Manage users"],
  },
} as const;

function normalizeRoleCode(roleCode?: string | null) {
  if (roleCode === "kitchen") return "kitchen_staff";
  return (roleCode ?? "kitchen_staff") as keyof typeof roleSummaries;
}

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string; temp_password?: string }>;
}) {
  const { id } = await params;
  const [messageParams, staff, access, companies, branches, roles] = await Promise.all([searchParams, getStaff(id), getStaffAccess(id), getCompaniesForSelect(), getBranches(), getRoles()]);
  const assignedRole = roles.find((role) => role.id === access.staffRole?.role_id);
  const roleCode = normalizeRoleCode(assignedRole?.role_code);
  const roleSummary = roleSummaries[roleCode] ?? roleSummaries.kitchen_staff;
  return (
    <>
      <PageHeader title="Edit Staff" description="Update staff identity, branch assignment, and status." />
      <div className="grid gap-5 p-5">
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
              <div className="rounded-md border bg-white p-3 font-mono text-lg font-semibold">{messageParams.temp_password}</div>
              <p className="text-xs text-amber-900">Share it securely. The staff member must change it after first login.</p>
            </CardContent>
          </Card>
        ) : null}
        <Card>
          <CardHeader>
            <CardTitle>Auth Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Auth account linked</p>
                <p className="mt-1 font-semibold">{staff.auth_user_id ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Setup method</p>
                <p className="mt-1 font-semibold">{staff.auth_setup_method === "email_invitation" ? "Email invitation" : staff.auth_setup_method === "temporary_password" ? "Temporary password" : "Not configured"}</p>
              </div>
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Must change password</p>
                <p className="mt-1 font-semibold">{staff.must_change_password ? "Yes" : "No"}</p>
              </div>
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Invitation status</p>
                <p className="mt-1 font-semibold">{staff.invitation_status ?? staff.status}</p>
              </div>
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Last login</p>
                <p className="mt-1 font-semibold">{staff.last_login_at ? new Date(staff.last_login_at).toLocaleString("en-MY") : "-"}</p>
              </div>
              <div className="rounded-md border bg-secondary/30 p-3 text-sm">
                <p className="text-xs uppercase text-muted-foreground">Password changed at</p>
                <p className="mt-1 font-semibold">{staff.password_changed_at ? new Date(staff.password_changed_at).toLocaleString("en-MY") : "-"}</p>
              </div>
            </div>
            <p className="rounded-md border bg-amber-50 p-3 text-sm text-amber-900">Temporary passwords should be shared securely and changed immediately.</p>
            <div className="flex flex-wrap gap-2">
              <form action={resetStaffTemporaryPassword.bind(null, id)}>
                <SubmitButton type="submit" pendingLabel="Generating...">{staff.auth_user_id ? "Reset temporary password" : "Create auth account"}</SubmitButton>
              </form>
              <form action={forceStaffPasswordChange.bind(null, id)}>
                <SubmitButton type="submit" variant="outline" pendingLabel="Processing...">Force password change</SubmitButton>
              </form>
              <form action={resendStaffInvite.bind(null, id)}>
                <SubmitButton type="submit" variant="outline" pendingLabel="Sending invite...">Resend email invitation</SubmitButton>
              </form>
              <div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
                Branch access: {access.staffBranch?.branch_id ? branches.find((branch) => branch.id === access.staffBranch?.branch_id)?.branch_name ?? "-" : "-"}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Role and Permission Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_1fr]">
            <div className="rounded-lg border bg-secondary/30 p-4">
              <p className="text-xs font-medium uppercase text-muted-foreground">Role</p>
              <p className="mt-1 font-semibold">{assignedRole?.role_name ?? "Unassigned"}</p>
              <p className="mt-2 text-sm text-muted-foreground">{roleDescriptions[roleCode] ?? "No role summary available."}</p>
            </div>
            <div className="rounded-lg border bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase text-emerald-800">Allowed</p>
              <ul className="mt-2 space-y-1 text-sm text-emerald-950">
                {roleSummary.allowed.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </div>
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-xs font-medium uppercase text-slate-600">Not allowed</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-700">
                {roleSummary.denied.map((item) => <li key={item}>- {item}</li>)}
              </ul>
            </div>
          </CardContent>
        </Card>
        <StaffForm staff={staff} access={access} companies={companies} branches={branches} roles={roles} action={updateStaff.bind(null, id)} />
        {staff.status === "disabled" ? (
          <Card>
            <CardHeader><CardTitle>Advanced actions</CardTitle></CardHeader>
            <CardContent>
              <form action={enableStaff.bind(null, id)}>
                <SubmitButton type="submit" variant="outline" pendingLabel="Processing...">Enable user</SubmitButton>
              </form>
            </CardContent>
          </Card>
        ) : (
          <DangerConfirmForm
            action={disableStaff.bind(null, id)}
            title="Deactivate this staff?"
            description="This will hide the record from active lists. Existing documents and stock history will remain linked."
            warning="This action may affect future operations and should only be done by an admin."
            checkboxLabel="I understand this does not delete history and may affect future operations."
            confirmWord="DEACTIVATE"
            buttonLabel="Deactivate user"
            pendingLabel="Deactivating..."
          />
        )}
      </div>
    </>
  );
}
