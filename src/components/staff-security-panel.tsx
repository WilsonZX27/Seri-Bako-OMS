import { CopyTextButton } from "@/components/ui/copy-text-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getStaffAuthState, staffAuthStateLabels } from "@/lib/staff-auth-state";
import { readTemporaryPasswordHandoff } from "@/server/auth/temporary-password-handoff";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import { getStaff, getStaffAccess, getRoles } from "@/server/queries/foundation";
import { forceStaffPasswordChange, permanentlyDeleteStaff, repairStaffSignInLink, resetStaffTemporaryPassword } from "@/server/actions/foundation";
import { ConsoleSection } from "@/components/layout/right-console";

async function securityContext(id: string) {
  if (!(await hasPermission("staffs.update"))) return null;
  const [staff, access, roles, profile] = await Promise.all([getStaff(id), getStaffAccess(id), getRoles(), getCurrentProfile()]);
  if (!staff || !profile || staff.company_id !== profile.company_id) return null;
  const isOwner = profile.role_code === "super_admin";
  if (roles.some(role => role.id === access.staffRole?.role_id && role.role_code === "super_admin") && !isOwner) return null;
  return { staff, isOwner, authState: getStaffAuthState(staff) };
}

export async function StaffSecurityPanel({ id }: { id: string }) {
  const context = await securityContext(id);
  if (!context) return null;
  const { staff, authState } = context;
  const temporaryPassword = await readTemporaryPasswordHandoff(id);
  return <div className="w-full space-y-3">
    <Card>
      <CardHeader className="pb-2"><CardTitle>Staff overview</CardTitle></CardHeader>
      <CardContent><dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
        <div><dt className="text-muted-foreground">Name</dt><dd className="mt-0.5 font-medium">{staff.full_name}</dd></div>
        <div><dt className="text-muted-foreground">Username</dt><dd className="mt-0.5 font-medium">{staff.username ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Staff code</dt><dd className="mt-0.5 font-medium">{staff.staff_code?.toUpperCase() ?? "—"}</dd></div>
        <div><dt className="text-muted-foreground">Account</dt><dd className="mt-0.5 font-medium">{staffAuthStateLabels[authState]}</dd></div>
      </dl></CardContent>
    </Card>
    {temporaryPassword ? (
      <Card className="border-[var(--sb-warning)] bg-[var(--sb-warning-bg)]">
        <CardHeader className="pb-2"><CardTitle>Temporary password</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sb-radius-control)] border bg-white p-3">
            <span className="break-all font-mono text-lg font-semibold">{temporaryPassword}</span>
            <CopyTextButton value={temporaryPassword} label="Copy temporary password" />
          </div>
          <p className="text-xs text-[var(--sb-warning)]">Copy it now and share it securely. It expires from this view in five minutes, and the employee must change it after signing in.</p>
        </CardContent>
      </Card>
    ) : null}
  </div>;
}

export async function StaffSecurityRail({ id }: { id: string }) {
  const context = await securityContext(id);
  if (!context) return null;
  const { staff, isOwner, authState } = context;
  return <>
    <ConsoleSection title="Password actions" kind="action">
      {isOwner && authState === "link_needs_repair" ? <form action={repairStaffSignInLink.bind(null, id)}><SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Checking exact match...">Repair sign-in link</SubmitButton></form> : null}
      <form action={resetStaffTemporaryPassword.bind(null, id)}><SubmitButton type="submit" className="w-full" pendingLabel="Generating...">{staff.auth_user_id ? "Reset temporary password" : "Create auth account"}</SubmitButton></form>
      {staff.auth_user_id ? <form action={forceStaffPasswordChange.bind(null, id)}><SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Processing...">Force password change</SubmitButton></form> : null}
    </ConsoleSection>
    <ConsoleSection title="Danger zone" kind="danger">
      <DangerConfirmForm action={permanentlyDeleteStaff.bind(null, id)} title="Permanent delete staff" description="Only use this for test users with no linked business records. Real staff with history must use Disable sign-in instead." warning="This is blocked for protected owner accounts and anyone with historical records." checkboxLabel="I understand this permanently deletes only safe test staff records." confirmWord="DELETE" buttonLabel="Permanent delete staff" pendingLabel="Deleting..." />
    </ConsoleSection>
  </>;
}
