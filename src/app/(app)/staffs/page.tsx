import Link from "next/link";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { resendStaffInvite } from "@/server/actions/foundation";
import { getStaffs } from "@/server/queries/foundation";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-MY") : "-";
}

export default async function StaffsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const staffs = await getStaffs(filters);
  return (
    <>
      <PageHeader title="Staffs" description="Staff access, default branch assignment, and account status." action={{ href: "/staffs/new", label: "New staff" }} />
      <div className="space-y-4 p-5">
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-lg border bg-card">
        <MasterDataFilters
          search={filters.search}
          status={filters.status}
          placeholder="Search staff, email, branch, or role"
          statuses={[
            { value: "invited", label: "Invited" },
            { value: "active", label: "Active" },
            { value: "disabled", label: "Disabled" },
          ]}
        />
        <BulkSelectionProvider ids={staffs.map((staff) => staff.id)} actionLabel="Deactivate selected" actionHint="Disable staff users from their detail page to keep a clear access history.">
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead className="w-10"><BulkSelectAllCheckbox /></TableHead><TableHead>Staff Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Default Branch</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Invited</TableHead><TableHead>Accepted</TableHead><TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {staffs.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell><BulkSelectRowCheckbox id={staff.id} /></TableCell>
              <TableCell>{staff.staff_code ?? "-"}</TableCell>
              <TableCell className="font-medium">{staff.full_name}</TableCell>
              <TableCell>{staff.email ?? "-"}</TableCell>
              <TableCell>{staff.default_branch_name ?? "-"}</TableCell>
              <TableCell>{staff.role_name ?? "-"}</TableCell>
              <TableCell><Badge variant={staff.status === "active" ? "success" : staff.status === "disabled" ? "danger" : "secondary"}>{staff.status}</Badge></TableCell>
              <TableCell>{formatDate(staff.last_login_at)}</TableCell>
              <TableCell>{formatDate(staff.invited_at)}</TableCell>
              <TableCell>{formatDate(staff.accepted_at)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {staff.status === "invited" ? (
                    <form action={resendStaffInvite.bind(null, staff.id)}>
                      <Button type="submit" variant="outline" size="sm">Resend</Button>
                    </form>
                  ) : null}
                  <Button asChild variant="outline" size="sm"><Link href={`/staffs/${staff.id}`}>Edit</Link></Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!staffs.length ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No staffs found.</TableCell></TableRow> : null}
        </TableBody></Table></div>
        </BulkSelectionProvider>
      </div></div>
    </>
  );
}
