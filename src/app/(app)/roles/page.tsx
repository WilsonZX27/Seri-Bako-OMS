import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PageHeader } from "@/components/ui/page-header";
import { Notice } from "@/components/ui/system-states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getRoleDisplayLabel, isSuperAdminRole } from "@/lib/roles";
import { getCurrentProfile } from "@/server/queries/common";
import { getRolePermissionManagement, getRoles } from "@/server/queries/foundation";

export default async function RolesPage() {
  const profile = await getCurrentProfile();
  const roleCode = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  if (!isSuperAdminRole(roleCode)) redirect("/access-status?reason=no-permitted-route");
  const roles = await getRoles();
  const summaries = await Promise.all(roles.map(async (role) => {
    const management = await getRolePermissionManagement(role.id);
    const enabled = management.permissions.filter((permission) => management.selectedPermissionIds.has(permission.id));
    return { ...role, permissionCount: enabled.length, moduleCount: new Set(enabled.map((permission) => permission.module)).size };
  }));
  return <>
    <PageHeader title="Roles & Permissions" description="Read-only overview of the six system-controlled roles." />
    <WorkspaceGrid
      tabletCanvas="contained"
      hideMobileConsole
      rightRail={<ConsoleSection title="Role Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">System roles</dt><dd className="font-semibold">{summaries.length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Active roles</dt><dd className="font-semibold">{summaries.filter((role) => role.status === "active").length}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Enabled permissions</dt><dd className="font-semibold">{summaries.reduce((total, role) => total + role.permissionCount, 0)}</dd></div></dl></ConsoleSection>}
    >
      <Notice tone="info" title="System-controlled access">Role names and permissions are controlled by reviewed migrations. Assign a role from Users &amp; Staff; custom roles cannot be created or edited here.</Notice>
      <div className="overflow-hidden rounded-[2px] border bg-card">
        <Table mobileHidden aria-label="Roles and permissions"><TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Purpose</TableHead><TableHead className="text-right">Modules</TableHead><TableHead className="text-right">Permissions</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
        {summaries.map((role) => <TableRow key={role.id}><TableCell className="font-medium">{getRoleDisplayLabel(role.role_code, role.role_name)}</TableCell><TableCell>{role.description ?? "System-controlled access role."}</TableCell><TableCell className="text-right">{role.moduleCount}</TableCell><TableCell className="text-right">{role.permissionCount}</TableCell><TableCell><Badge variant={role.status === "active" ? "success" : "secondary"}>{role.status}</Badge></TableCell></TableRow>)}
        </TableBody></Table>
        <div className="divide-y md:hidden" role="list" aria-label="Roles and permissions">
          {summaries.map((role) => <div key={role.id} role="listitem" className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-3 py-2.5"><p className="min-w-0 text-[13px] font-semibold">{getRoleDisplayLabel(role.role_code, role.role_name)}</p><Badge variant={role.status === "active" ? "success" : "secondary"}>{role.status}</Badge><p className="min-w-0 text-xs text-muted-foreground">{role.description ?? "System-controlled access role."}</p><p className="whitespace-nowrap text-[11px] text-muted-foreground">{role.moduleCount} modules · {role.permissionCount} permissions</p></div>)}
        </div>
      </div>
    </WorkspaceGrid>
  </>;
}
