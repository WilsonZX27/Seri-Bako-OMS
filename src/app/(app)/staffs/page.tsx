import Link from "next/link";
import { Eye } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { Card, CardContent } from "@/components/ui/card";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
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
        <StatusTabs statuses={[
          { value: "invited", label: "Invited" },
          { value: "active", label: "Active" },
          { value: "disabled", label: "Disabled" },
        ]} activeStatus={filters.status} />
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
        <DataGridHint text="Pro-tip: Double-click any row to open the staff profile." />
        <div className="overflow-x-auto"><Table><TableHeader><TableRow>
          <TableHead className="w-16"><BulkSelectAllCheckbox /></TableHead><TableHead>Staff Code</TableHead><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Default Branch</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Last Login</TableHead><TableHead>Invited</TableHead><TableHead>Accepted</TableHead>
        </TableRow></TableHeader><TableBody>
          {staffs.map((staff) => (
            <DataGridRow key={staff.id} href={`/staffs/${staff.id}`}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <BulkSelectRowCheckbox id={staff.id} />
                  <Link href={`/staffs/${staff.id}`} aria-label={`Quick view ${staff.full_name}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                    <Eye className="h-4 w-4" />
                  </Link>
                </div>
              </TableCell>
              <TableCell>{staff.staff_code ?? "-"}</TableCell>
              <TableCell className="font-medium">{staff.full_name}</TableCell>
              <TableCell>{staff.email ?? "-"}</TableCell>
              <TableCell>{staff.default_branch_name ?? "-"}</TableCell>
              <TableCell>{staff.role_name ?? "-"}</TableCell>
              <TableCell><StatusBadge status={staff.status} /></TableCell>
              <TableCell>{formatDate(staff.last_login_at)}</TableCell>
              <TableCell>{formatDate(staff.invited_at)}</TableCell>
              <TableCell>{formatDate(staff.accepted_at)}</TableCell>
            </DataGridRow>
          ))}
          {!staffs.length ? <TableRow><TableCell colSpan={10}><EmptyState title="No staffs found" description="Staff accounts will appear here after they are invited or created." action={{ href: "/staffs/new", label: "New staff" }} /></TableCell></TableRow> : null}
        </TableBody></Table></div>
        </BulkSelectionProvider>
      </div></div>
    </>
  );
}
