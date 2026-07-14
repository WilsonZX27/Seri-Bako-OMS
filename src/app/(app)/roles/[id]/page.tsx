import { RoleForm } from "@/components/foundation-forms";
import Link from "next/link";
import { RecordActionPanel, RecordSection, RecordWorkspace } from "@/components/record-workspace";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { updateRole } from "@/server/actions/foundation";
import { getCompaniesForSelect, getPermissions, getRole } from "@/server/queries/foundation";

export default async function EditRolePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [role, companies, permissions] = await Promise.all([getRole(id), getCompaniesForSelect(), getPermissions()]);
  const permissionGroups = Array.from(permissions.reduce((groups, permission) => groups.set(permission.module, [...(groups.get(permission.module) ?? []), permission]), new Map<string, typeof permissions>()));
  return (
    <>
      <PageHeader title={role.role_name} description={`${role.role_code} · Role and permission context`} />
      <RecordWorkspace actionPanel={<><RecordActionPanel title="Role Actions"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Status</span><StatusBadge status={role.status} /></div><Button type="submit" form="role-edit-form" className="w-full" data-mobile-primary-action>Save Role</Button><Button asChild variant="outline" className="w-full"><Link href="/roles">Back to Roles</Link></Button></RecordActionPanel><RecordActionPanel title="Permission Summary"><p className="text-xs text-muted-foreground">{permissions.length} permission definitions across {permissionGroups.length} modules. Role permissions are defaults; individual staff overrides may alter effective access.</p>{role.company_id === null ? <p className="border border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] p-2 text-xs text-[var(--sb-warning)]">System role identity should be changed only with care.</p> : null}</RecordActionPanel></>}>
        <RoleForm formId="role-edit-form" role={role} companies={companies} action={updateRole.bind(null, id)} showSubmit={false} />
        <RecordSection title="Permission Catalogue" description="Available permissions grouped by module. This view does not change assignments."><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{permissionGroups.map(([module, modulePermissions]) => <section key={module} className="rounded-[2px] border p-3"><h3 className="text-sm font-semibold capitalize">{module.replaceAll("_", " ")}</h3><ul className="mt-2 space-y-2 text-xs">{modulePermissions.map((permission) => <li key={permission.id} className="flex justify-between gap-3"><span>{permission.action}</span><code className="text-muted-foreground">{permission.permission_code}</code></li>)}</ul></section>)}</div></RecordSection>
      </RecordWorkspace>
    </>
  );
}
