import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MasterDataFilters } from "@/components/master-data-filters";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getPermissions, getRoles } from "@/server/queries/foundation";

export default async function RolesPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string }> }) {
  const filters = await searchParams;
  const [roles, permissions] = await Promise.all([getRoles(filters), getPermissions()]);
  return (
    <>
      <PageHeader title="Roles & Permissions" description="Role definitions and the Sprint 1 permission catalogue." action={{ href: "/roles/new", label: "New role" }} />
      <WorkspaceGrid
        rightRail={
          <section className="rounded-lg border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Permission Catalogue</h2>
            <p className="mt-1 text-xs text-muted-foreground">Sprint 1 foundation permissions seeded by the migration.</p>
            <div className="mt-4 space-y-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="rounded-md border bg-background px-3 py-2 text-xs">
                  <p className="font-medium">{permission.permission_code}</p>
                  <p className="capitalize text-muted-foreground">{permission.module} / {permission.action}</p>
                </div>
              ))}
            </div>
          </section>
        }
      >
        <div className="overflow-hidden rounded-lg border bg-card">
          <MasterDataFilters search={filters.search} status={filters.status} placeholder="Search role code, name, or description" />
          <div className="overflow-x-auto"><Table><TableHeader><TableRow>
            <TableHead>Role Code</TableHead><TableHead>Role Name</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="w-24 text-right">Actions</TableHead>
          </TableRow></TableHeader><TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell>{role.role_code}</TableCell>
                <TableCell className="font-medium">{getRoleDisplayLabel(role.role_code, role.role_name)}</TableCell>
                <TableCell>{role.description ?? "-"}</TableCell>
                <TableCell><Badge variant={role.status === "active" ? "success" : "secondary"}>{role.status}</Badge></TableCell>
                <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/roles/${role.id}`}>Edit</Link></Button></TableCell>
              </TableRow>
            ))}
            {!roles.length ? <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No roles found.</TableCell></TableRow> : null}
          </TableBody></Table></div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
