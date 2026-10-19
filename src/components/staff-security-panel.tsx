import { CopyTextButton } from "@/components/ui/copy-text-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDateTime } from "@/lib/utils";
import { getStaffAuthState, staffAuthStateLabels } from "@/lib/staff-auth-state";
import { readTemporaryPasswordHandoff } from "@/server/auth/temporary-password-handoff";
import { formatStatusLabel } from "@/lib/status-label";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import { getStaff, getStaffAccess, getRoles } from "@/server/queries/foundation";
import { forceStaffPasswordChange, permanentlyDeleteStaff, repairStaffSignInLink, resetStaffTemporaryPassword } from "@/server/actions/foundation";
export async function StaffSecurityPanel({ id }: { id: string }) {
  if (!(await hasPermission("staffs.update"))) return null;
  const [staff, access, roles, profile] = await Promise.all([getStaff(id), getStaffAccess(id), getRoles(), getCurrentProfile()]);
  if (!staff || !profile || staff.company_id !== profile.company_id) return null;
  const isOwner = profile.role_code === "super_admin";
  if (roles.some(role => role.id === access.staffRole?.role_id && role.role_code === "super_admin") && !isOwner) return null;
  const authState = getStaffAuthState(staff);
  const temporaryPassword = await readTemporaryPasswordHandoff(id);
  return <div className="mx-auto w-full max-w-[760px] space-y-3">
    {temporaryPassword ? (
      <Card className="border-[var(--sb-warning)] bg-[var(--sb-warning-bg)]">
        <CardHeader><CardTitle>Temporary password</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sb-radius-control)] border bg-white p-3">
            <span className="break-all font-mono text-lg font-semibold">{temporaryPassword}</span>
            <CopyTextButton value={temporaryPassword} label="Copy temporary password" />
          </div>
          <p className="text-xs text-[var(--sb-warning)]">Copy it now and share it securely. It expires from this view in five minutes, and the employee must change it after signing in.</p>
        </CardContent>
      </Card>
    ) : null}
    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface-raised)] p-3 text-xs">
        <h2 className="text-sm font-semibold">Sign-in status</h2>
        <dl className="mt-3 divide-y divide-[var(--sb-border-soft)]">
          <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Account state</dt><dd className="text-right font-medium">{staffAuthStateLabels[authState]}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Last sign-in</dt><dd className="text-right font-medium">{staff.auth_last_sign_in_at ? formatDateTime(staff.auth_last_sign_in_at) : "Never"}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Change password</dt><dd className="text-right font-medium">{staff.must_change_password ? "Required" : "Not required"}</dd></div>
          <div className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">Invitation</dt><dd className="text-right font-medium">{formatStatusLabel(staff.invitation_status ?? staff.status)}</dd></div>
        </dl>
      </section>
      <section className="rounded-[var(--sb-panel-radius)] border bg-[var(--sb-surface-raised)] p-3">
        <h2 className="text-sm font-semibold">Password actions</h2>
        <div className="mt-3 space-y-2">
          {isOwner && authState === "link_needs_repair" ? (
            <form action={repairStaffSignInLink.bind(null, id)}>
              <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Checking exact match...">Repair sign-in link</SubmitButton>
            </form>
          ) : null}
          <form action={resetStaffTemporaryPassword.bind(null, id)}>
            <SubmitButton type="submit" className="w-full" pendingLabel="Generating...">
              {staff.auth_user_id ? "Reset temporary password" : "Create auth account"}
            </SubmitButton>
          </form>
          {staff.auth_user_id ? (
            <form action={forceStaffPasswordChange.bind(null, id)}>
              <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Processing...">Force password change</SubmitButton>
            </form>
          ) : null}
        </div>
      </section>
    </div>
    <details className="sb-work-surface p-3"><summary className="text-sm">Danger zone</summary>
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
    </details>
  </div>;
}
