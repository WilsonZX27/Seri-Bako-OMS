import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getVisibleNavGroups, navPermissionCodes } from "@/components/layout/nav-items";
import { OperationalToolList } from "@/components/operational-tool-list";
import { PageHeader } from "@/components/ui/page-header";
import { isSystemRoleCode, normalizeRoleCode } from "@/lib/roles";
import { getPermissionMap } from "@/server/auth/permissions";
import { getCurrentProfile } from "@/server/queries/common";

export default async function AdministrationPage() {
  const [profile, permissionMap] = await Promise.all([getCurrentProfile(), getPermissionMap(navPermissionCodes)]);
  const rawRole = (profile as { role_code?: string; role?: string } | null)?.role_code ?? (profile as { role?: string } | null)?.role;
  const role = normalizeRoleCode(rawRole);
  const administration = isSystemRoleCode(role)
    ? getVisibleNavGroups(role, permissionMap).find((group) => group.id === "administration")?.items ?? []
    : [];
  const links = administration
    .filter((item) => item.administrationCard)
    .map((item) => ({ href: item.href, title: item.label, description: item.administrationCard ?? "", icon: item.icon }));

  return (
    <>
      <PageHeader title="Administration" description="Owner controls and authorized master-data tools in one permission-aware workspace." />
      <WorkspaceGrid tabletCanvas="contained"><OperationalToolList items={links} /></WorkspaceGrid>
    </>
  );
}
