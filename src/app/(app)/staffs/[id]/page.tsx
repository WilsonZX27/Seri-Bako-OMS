import { StaffForm } from "@/components/foundation-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { disableStaff, enableStaff, resendStaffInvite, updateStaff } from "@/server/actions/foundation";
import { getBranches, getCompaniesForSelect, getLocations, getRoles, getStaff, getStaffAccess } from "@/server/queries/foundation";

export default async function EditStaffPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  const [messageParams, staff, access, companies, branches, roles, locations] = await Promise.all([searchParams, getStaff(id), getStaffAccess(id), getCompaniesForSelect(), getBranches(), getRoles(), getLocations()]);
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
              <Button type="submit" variant="outline">Resend invite</Button>
            </form>
            {staff.status === "disabled" ? (
              <form action={enableStaff.bind(null, id)}>
                <Button type="submit" variant="outline">Enable user</Button>
              </form>
            ) : (
              <form action={disableStaff.bind(null, id)}>
                <Button type="submit" variant="destructive">Disable user</Button>
              </form>
            )}
          </CardContent>
        </Card>
        <StaffForm staff={staff} access={access} companies={companies} branches={branches} roles={roles} locations={locations} action={updateStaff.bind(null, id)} />
      </div>
    </>
  );
}
