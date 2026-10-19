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
  return <div className="space-y-3"><p className="text-xs text-muted-foreground">Manage sign-in and passwords for this employee.</p>
  <p className="text-xs">Last successful sign-in: {staff.auth_last_sign_in_at ? formatDateTime(staff.auth_last_sign_in_at) : "Never"}</p>
        {temporaryPassword ? (
          <Card className="border-[var(--sb-warning)] bg-[var(--sb-warning-bg)]">
            <CardHeader>
              <CardTitle>Temporary password shown once</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--sb-radius-control)] border bg-white p-3">
                <span className="font-mono text-lg font-semibold">{temporaryPassword}</span>
                <CopyTextButton value={temporaryPassword} label="Copy temporary password" />
              </div>
              <p className="text-xs text-[var(--sb-warning)]">Share it securely. The staff member must change it after first login.</p>
            </CardContent>
          </Card>
        ) : null}

              <div className="rounded-[var(--sb-panel-radius)] border bg-secondary/30 p-3 text-xs">
                <p className="font-semibold">Auth Setup</p>
                <div className="mt-3 grid gap-2 text-xs">
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Account state</span>
                    <span className="font-medium">{staffAuthStateLabels[authState]}</span>
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
                  {isOwner && authState === "link_needs_repair" ? (
                    <form action={repairStaffSignInLink.bind(null, id)}>
                      <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Checking exact match...">
                        Repair sign-in link
                      </SubmitButton>
                    </form>
                  ) : null}
                  <form action={resetStaffTemporaryPassword.bind(null, id)}>
                    <SubmitButton type="submit" className="w-full" pendingLabel="Generating...">
                      {staff.auth_user_id ? "Reset temporary password" : "Create auth account"}
                    </SubmitButton>
                  </form>
                  {staff.auth_user_id ? (
                    <form action={forceStaffPasswordChange.bind(null, id)}>
                      <SubmitButton type="submit" variant="outline" className="w-full" pendingLabel="Processing...">
                        Force password change
                      </SubmitButton>
                    </form>
                  ) : null}
                </div>
              </div>

<details className="sb-work-surface p-3"><summary className="text-sm">Danger zone</summary>              <DangerConfirmForm
                action={permanentlyDeleteStaff.bind(null, id)}
                title="Permanent delete staff"
                    description="Only use this for test users with no linked business records. Real staff with history must use Disable sign-in instead."
                    warning="This is blocked for protected owner accounts and anyone with historical records."
                checkboxLabel="I understand this permanently deletes only safe test staff records."
                confirmWord="DELETE"
                buttonLabel="Permanent delete staff"
                pendingLabel="Deleting..."
              />
</details></div>;
}
