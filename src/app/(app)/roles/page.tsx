import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
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
    <div className="space-y-4 p-5">
      <Card><CardContent className="p-4 text-sm text-muted-foreground">Role names and permissions are controlled by reviewed migrations. Assign a role from Users & Staff; custom roles cannot be created or edited here.</CardContent></Card>
      <div className="overflow-x-auto rounded-[2px] border bg-card"><Table><TableHeader><TableRow><TableHead>Role</TableHead><TableHead>Purpose</TableHead><TableHead className="text-right">Modules</TableHead><TableHead className="text-right">Permissions</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>
        {summaries.map((role) => <TableRow key={role.id}><TableCell className="font-medium">{getRoleDisplayLabel(role.role_code, role.role_name)}</TableCell><TableCell>{role.description ?? "System-controlled access role."}</TableCell><TableCell className="text-right">{role.moduleCount}</TableCell><TableCell className="text-right">{role.permissionCount}</TableCell><TableCell><Badge variant={role.status === "active" ? "success" : "secondary"}>{role.status}</Badge></TableCell></TableRow>)}
      </TableBody></Table></div>
    </div>
  </>;
}
