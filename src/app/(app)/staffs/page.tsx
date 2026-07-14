import Link from "next/link";
import { Pencil } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStaffs } from "@/server/queries/foundation";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";

export default async function StaffsPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const staffs = await getStaffs(filters);
  return (
    <>
      <PageHeader title="Staffs" description="Staff access, default branch assignment, and account status." />
      <WorkspaceGrid rightRail={<><ConsoleSection title="Actions"><Button asChild size="sm" className="w-full"><Link href="/staffs/new">New staff</Link></Button></ConsoleSection><ConsoleSection title="Staff Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{staffs.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active</dt><dd className="font-semibold">{staffs.filter((staff) => staff.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Invited / pending</dt><dd className="font-semibold">{staffs.filter((staff) => ["invited", "pending"].includes(staff.invitation_status ?? staff.status)).length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Disabled</dt><dd className="font-semibold">{staffs.filter((staff) => staff.status === "disabled").length}</dd></div></dl></ConsoleSection></>}>
        {filters.error || filters.success ? (
          <Card>
            <CardContent className={`p-4 text-sm ${filters.error ? "text-destructive" : "text-emerald-700"}`}>
              {filters.error ?? filters.success}
            </CardContent>
          </Card>
        ) : null}
        <div className="overflow-hidden rounded-[2px] border bg-card">
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
          <TableHead className="hidden w-16 md:table-cell"><BulkSelectAllCheckbox /></TableHead><TableHead>Staff Code</TableHead><TableHead>Name</TableHead><TableHead className="hidden lg:table-cell">Email</TableHead><TableHead className="hidden lg:table-cell">Default Branch</TableHead><TableHead>Role</TableHead><TableHead>Staff Status</TableHead><TableHead className="hidden md:table-cell">Account Status</TableHead><TableHead className="w-12 text-right">Action</TableHead>
        </TableRow></TableHeader><TableBody>
          {staffs.map((staff) => (
            <DataGridRow key={staff.id} href={`/staffs/${staff.id}`}>
              <TableCell className="hidden md:table-cell">
                <BulkSelectRowCheckbox id={staff.id} />
              </TableCell>
              <TableCell>{staff.staff_code?.toUpperCase() ?? "-"}</TableCell>
              <TableCell className="font-medium">{staff.full_name}</TableCell>
              <TableCell className="hidden lg:table-cell">{staff.email ?? "-"}</TableCell>
              <TableCell className="hidden lg:table-cell">{staff.default_branch_name ?? "-"}</TableCell>
              <TableCell>{staff.role_name ?? "-"}</TableCell>
              <TableCell><StatusBadge status={staff.status} /></TableCell>
              <TableCell className="hidden md:table-cell"><StatusBadge status={staff.invitation_status ?? (staff.auth_user_id ? "active" : "pending")} /></TableCell>
              <TableCell className="text-right"><TableActionLink href={`/staffs/${staff.id}`} label={`Open ${staff.full_name}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
            </DataGridRow>
          ))}
          {!staffs.length ? <TableRow><TableCell colSpan={8}><EmptyState title="No staff found" description="Staff accounts will appear here after they are invited or created." action={{ href: "/staffs/new", label: "New staff" }} /></TableCell></TableRow> : null}
        </TableBody></Table></div>
        </BulkSelectionProvider>
      </div></WorkspaceGrid>
    </>
  );
}
