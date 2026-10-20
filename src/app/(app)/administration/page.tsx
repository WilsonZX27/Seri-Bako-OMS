import { ConsoleSection } from "@/components/layout/right-console";
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
      <WorkspaceGrid tabletCanvas="contained" hideMobileConsole rightRail={<><ConsoleSection title="Administration overview"><dl className="grid gap-3 text-xs"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Available tools</dt><dd className="font-semibold">{links.length}</dd></div></dl></ConsoleSection><ConsoleSection title="Access"><p className="text-xs leading-5 text-muted-foreground">Choose a tool to manage company records, document numbering or system operations. Available tools reflect your current permissions.</p></ConsoleSection></>}><OperationalToolList items={links} /></WorkspaceGrid>
    </>
  );
}
