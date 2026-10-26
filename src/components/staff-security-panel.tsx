import Link from "next/link";
import { StaffIdentityFacts } from "@/components/staff-identity-facts";
import { staffEmploymentStatus } from "@/lib/staff-employment-status";
import { todayInKualaLumpur } from "@/lib/business-date";
import { employmentSignInBlockReason } from "@/lib/staff-employment-status";
import { CopyTextButton } from "@/components/ui/copy-text-button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getStaffAuthState, staffAuthStateLabels } from "@/lib/staff-auth-state";
import { readTemporaryPasswordHandoff } from "@/server/auth/temporary-password-handoff";
import { hasPermission } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";
import { getStaff, getStaffAccess, getRoles, getStaffProfileSummary } from "@/server/queries/foundation";
import { disableStaff, forceStaffPasswordChange, permanentlyDeleteStaff, repairStaffSignInLink, resetStaffTemporaryPassword } from "@/server/actions/foundation";
import { ConsoleSection } from "@/components/layout/right-console";
import { formatDateTime } from "@/lib/utils";

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
  const blockedReason=employmentSignInBlockReason(staff,todayInKualaLumpur());
  const [temporaryPassword, summary] = await Promise.all([readTemporaryPasswordHandoff(id), getStaffProfileSummary(id)]);
  return <div className="w-full space-y-3">
    <section className="min-w-0 rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-raised)] p-4">
      <h2 className="mb-3 border-b border-[var(--sb-border-soft)] pb-3 text-sm font-semibold">Overview</h2>
      <StaffIdentityFacts staff={staff} locations={summary?.accessible_branch_names?.join(", ")} status={staffEmploymentStatus(staff,todayInKualaLumpur())}/>
      <dl className="mt-3 grid gap-x-6 gap-y-3 border-t pt-3 sm:grid-cols-2"><div><dt className="text-xs text-muted-foreground">Account</dt><dd className="mt-1 text-sm">{blockedReason ?? staffAuthStateLabels[authState]}</dd></div><div><dt className="text-xs text-muted-foreground">Last sign-in</dt><dd className="mt-1 text-sm">{staff.auth_last_sign_in_at ? formatDateTime(staff.auth_last_sign_in_at) : "Not available"}</dd></div></dl>
    </section>
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

export async function StaffAccessActions({id}:{id:string}) {
  const context=await securityContext(id);
  if(!context)return null;
  const reason=employmentSignInBlockReason(context.staff,todayInKualaLumpur());
  return <ConsoleSection title="Employment and sign-in" kind="action">
    <Link data-console-command href={`/people/${id}?section=employment#staff-last-working-day`} className="inline-flex min-h-11 items-center text-sm underline">Record last working day</Link>
    <p className="text-xs text-muted-foreground">For resignation, record the last working day. Access ends after that date; history is retained. Disable sign-in is a separate immediate access restriction.</p>
    {reason ? <p className="text-xs">{reason}</p> : null}
    {!reason ? <DangerConfirmForm action={disableStaff.bind(null,id)} title="Disable sign-in" description="Existing records are retained." checkboxLabel="Confirm disable sign-in." triggerIcon="deactivate" triggerVariant="outline" buttonLabel="Disable sign-in" pendingLabel="Disabling…"/> : null}
  </ConsoleSection>;
}

export async function StaffSecurityRail({ id }: { id: string }) {
  const context = await securityContext(id);
  if (!context) return null;
  const { staff, isOwner, authState } = context;
  const blockedReason=employmentSignInBlockReason(staff,todayInKualaLumpur());
  return <>
    <StaffAccessActions id={id}/>
    {!blockedReason ? <ConsoleSection title="Password actions" kind="action">
      {isOwner && authState === "link_needs_repair" ? <form action={repairStaffSignInLink.bind(null, id)}><SubmitButton data-console-command type="submit" variant="outline" className="w-full" pendingLabel="Checking exact match...">Repair sign-in link</SubmitButton></form> : null}
      <form action={resetStaffTemporaryPassword.bind(null, id)}><SubmitButton data-console-command type="submit" className="w-full" pendingLabel="Generating...">{staff.auth_user_id ? "Reset temporary password" : "Create auth account"}</SubmitButton></form>
      {staff.auth_user_id ? <form action={forceStaffPasswordChange.bind(null, id)}><SubmitButton data-console-command type="submit" variant="outline" className="w-full" pendingLabel="Processing...">Force password change</SubmitButton></form> : null}
    </ConsoleSection>
    : null}
    {isOwner ? <details><summary className="min-h-11 cursor-pointer py-3 text-xs text-muted-foreground">Advanced: unused test profiles</summary>
    <ConsoleSection title="Test profile cleanup" kind="danger">
      <DangerConfirmForm action={permanentlyDeleteStaff.bind(null, id)} title="Permanent delete staff" description="Only use this for test users with no linked business records. For resignation, record the last working day and retain the profile." warning="This is blocked for protected owner accounts and anyone with historical records." checkboxLabel="I understand this permanently deletes only safe test staff records." confirmWord="DELETE" buttonLabel="Permanent delete staff" pendingLabel="Deleting..." />
    </ConsoleSection></details> : null}
  </>;
}
