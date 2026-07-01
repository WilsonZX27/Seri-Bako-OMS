import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getStaffs } from "@/server/queries/foundation";

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString("en-MY") : "-";
}

export default async function StaffsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const filters = await searchParams;
  const staffs = await getStaffs(filters);
  return (
    <>
      <PageHeader title="Staffs" description="Staff access, default branch assignment, and account status." action={{ href: "/staffs/new", label: "New staff" }} />
      <div className="p-5"><div className="overflow-hidden rounded-lg border bg-card">
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
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead>Staff Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Default Branch</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Invited</TableHead><TableHead>Accepted</TableHead><TableHead className="w-24 text-right">Actions</TableHead>
        </TableRow></TableHeader><TableBody>
          {staffs.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>{staff.staff_code ?? "-"}</TableCell>
              <TableCell className="font-medium">{staff.full_name}</TableCell>
              <TableCell>{staff.email ?? "-"}</TableCell>
              <TableCell>{staff.default_branch_name ?? "-"}</TableCell>
              <TableCell>{staff.role_name ?? "-"}</TableCell>
              <TableCell><Badge variant={staff.status === "active" ? "success" : staff.status === "disabled" ? "danger" : "secondary"}>{staff.status}</Badge></TableCell>
              <TableCell>{formatDate(staff.last_login_at)}</TableCell>
              <TableCell>{formatDate(staff.invited_at)}</TableCell>
              <TableCell>{formatDate(staff.accepted_at)}</TableCell>
              <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/staffs/${staff.id}`}>Edit</Link></Button></TableCell>
            </TableRow>
          ))}
          {!staffs.length ? <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground">No staffs found.</TableCell></TableRow> : null}
        </TableBody></Table></div>
      </div></div>
    </>
  );
}
