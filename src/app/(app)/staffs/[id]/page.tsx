import { StaffForm } from "@/components/foundation-forms";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/ui/submit-button";
import { disableStaff, enableStaff, resendStaffInvite, updateStaff } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getRoles, getStaff, getStaffAccess } from "@/server/queries/foundation";

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const [messageParams, staff, access, companies, branches, roles] = await Promise.all([searchParams, getStaff(id), getStaffAccess(id), getCompaniesForSelect(), getBranches(), getRoles()]);
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
        <Card>
          <CardHeader>
            <CardTitle>Invitation Controls</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <form action={resendStaffInvite.bind(null, id)}>
              <SubmitButton type="submit" variant="outline" pendingLabel="Sending invite...">Resend invite</SubmitButton>
            </form>
            <div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">
              Branch access: {access.staffBranch?.branch_id ? branches.find((branch) => branch.id === access.staffBranch?.branch_id)?.branch_name ?? "-" : "-"}
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
