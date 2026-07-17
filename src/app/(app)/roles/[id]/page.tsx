import Link from "next/link";
import { RoleForm } from "@/components/foundation-forms";
import { RolePermissionMatrix } from "@/components/role-permission-matrix";
import { RecordActionPanel, RecordSection, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { updateRole, updateRolePermissions } from "@/server/actions/foundation";
import { getCompaniesForSelect, getRolePermissionManagement } from "@/server/queries/foundation";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [management, companies] = await Promise.all([getRolePermissionManagement(id), getCompaniesForSelect()]);
  const { role, permissions, selectedPermissionIds, assignedUsers, assignedCount } = management;
  const activeModules = new Set(permissions.filter((permission) => selectedPermissionIds.has(permission.id)).map((permission) => permission.module)).size;
  const highRisk = permissions.filter((permission) => selectedPermissionIds.has(permission.id) && /(delete|approve|post|pay|manage)/.test(permission.action)).length;
  const description = role.role_code === "super_admin" ? "Full system access." : ["admin", "operations_admin"].includes(role.role_code) ? "Office administration and data-entry access." : role.description ?? "Role and permission context.";

  return <>
    <PageHeader title={role.role_code === "super_admin" ? "Super Admin / Owner" : role.role_name} description={description} />
    <RecordWorkspace actionPanel={<>
      <RecordActionPanel title="Save Changes">
        <Button type="submit" form="role-permissions-form" className="w-full" data-mobile-primary-action>Save permissions</Button>
        <Button asChild variant="ghost" className="w-full"><Link href={`/roles/${id}`}>Discard changes</Link></Button>
        <Button asChild variant="outline" className="w-full"><Link href="/roles">Back to Roles</Link></Button>
      </RecordActionPanel>
      <RecordActionPanel title="Role Summary">
        <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={role.status} /></div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs"><div><strong>{assignedCount}</strong><span className="block text-muted-foreground">Users</span></div><div><strong>{activeModules}</strong><span className="block text-muted-foreground">Modules</span></div><div><strong>{highRisk}</strong><span className="block text-muted-foreground">High-risk</span></div></div>
      </RecordActionPanel>
      <RecordActionPanel title="Assigned Users">
        {assignedUsers.length ? <ul className="space-y-2 text-xs">{assignedUsers.map((staff) => <li key={staff.id}><Link className="font-medium underline" href={`/staffs/${staff.id}`}>{staff.full_name}</Link><span className="block text-muted-foreground">{staff.staff_code ?? "No code"} · {staff.branch_name ?? "No branch"} · {staff.status}</span></li>)}</ul> : <p className="text-xs text-muted-foreground">No current assignments.</p>}
      </RecordActionPanel>
    </>}>
      <RoleForm formId="role-edit-form" role={role} companies={companies} action={updateRole.bind(null, id)} showSubmit={false} />
      <RecordSection title="Business Permission Matrix" description="Roles define default access. Staff overrides can allow or deny specific actions."><RolePermissionMatrix permissions={permissions} selectedPermissionIds={selectedPermissionIds} action={updateRolePermissions.bind(null, id)} /></RecordSection>
    </RecordWorkspace>
  </>;
}
