import Link from "next/link";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { getStaffs } from "@/server/queries/foundation";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getStaffAuthState, staffAuthStateLabels } from "@/lib/staff-auth-state";
import { hasActiveFilters } from "@/lib/table-state";

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; error?: string; success?: string }> }) {
  const filters = await searchParams;
  const staffs = await getStaffs(filters);
  const filtered = hasActiveFilters(filters);
  const statuses = [{ value: "invited", label: "Invited" }, { value: "active", label: "Active" }, { value: "disabled", label: "Disabled" }];
  return <>
    <PageHeader title="Employees" description="Employee profiles, outlet assignments, compliance status, documents and OMS account access." action={{ href: "/people/calendar", label: "People calendar" }} secondaryAction={{ href: "/staffs/new", label: "New employee" }} />
    <WorkspaceGrid rightRail={<><ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/staffs/new">New employee</Link></Button><Button asChild size="sm" variant="outline" className="mt-2 w-full"><Link href="/people/calendar">People calendar</Link></Button></ConsoleSection><ConsoleSection title="Employee Summary"><dl className="grid gap-2 text-xs"><Summary label="Total" value={staffs.length}/><Summary label="Active" value={staffs.filter((staff)=>staff.status==="active").length}/><Summary label="Invited / pending" value={staffs.filter((staff)=>["invited","pending"].includes(staff.invitation_status??staff.status)).length}/><Summary label="Disabled" value={staffs.filter((staff)=>staff.status==="disabled").length}/></dl></ConsoleSection></>}>
      {filters.error || filters.success ? <Card><CardContent className={`p-4 text-sm ${filters.error?"text-destructive":"text-[var(--sb-success)]"}`}>{filters.error??filters.success}</CardContent></Card> : null}
      <div className="overflow-hidden rounded-[2px] border bg-card">
        <MasterDataFilters search={filters.search} status={filters.status} showStatus={false} leadingFilter={<StatusTabs statuses={statuses} activeStatus={filters.status}/>} placeholder="Search employee, email, outlet, or role" resultCount={staffs.length} filtered={filtered} resetHref="/people" statuses={statuses}/>
        <DataGridHint text="Double-click a row to open the employee profile." />
        <Table className="sb-staff-table" mobileHidden aria-label="Employees" stickyColumn="second"><TableHeader><TableRow><TableHead className="w-16 text-center">Action</TableHead><TableHead>Employee</TableHead><TableHead>Assignment</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{staffs.map((staff)=><DataGridRow key={staff.id} href={`/people/${staff.id}`}><TableCell className="w-16 p-0 text-center"><TableActionLink href={`/people/${staff.id}`} label={`Open ${staff.full_name}`}><Pencil className="h-4 w-4"/></TableActionLink></TableCell><TableCell><p className="font-medium">{staff.full_name}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{staff.staff_code?.toUpperCase()??"No staff code"} · {staff.email??"No email"}</p></TableCell><TableCell><p>{staff.role_name??"No role"}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{staff.default_branch_name??"No default outlet"}</p></TableCell><TableCell><StatusBadge status={staff.status}/><p className="mt-1 text-[11px] font-medium text-muted-foreground">{staffAuthStateLabels[getStaffAuthState(staff)]}</p></TableCell></DataGridRow>)}{!staffs.length?<TableRow><TableCell colSpan={4}><EmptyState title="No employees found" description="Only employees within your authorised outlet scope appear here." action={{href:"/staffs/new",label:"New employee"}}/></TableCell></TableRow>:null}</TableBody></Table>
        <OperationalList ariaLabel="Employees">{staffs.map((staff)=><OperationalListRow key={staff.id} href={`/people/${staff.id}`} label={`Open ${staff.full_name}`} primary={staff.full_name} status={<StatusBadge status={staff.status}/>} statusMeta={staffAuthStateLabels[getStaffAuthState(staff)]} secondary={`${staff.staff_code?.toUpperCase()??"No staff code"} · ${staff.role_name??"No role"}`} detail={`${staff.email??"No email"} · ${staff.default_branch_name??"No default outlet"}`} meta="Open profile"/>)}{!staffs.length?<EmptyState title="No employees found" description="Only employees within your authorised outlet scope appear here."/>:null}</OperationalList>
      </div>
    </WorkspaceGrid>
  </>;
}

function Summary({label,value}:{label:string;value:number}) { return <div className="flex justify-between"><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>; }
