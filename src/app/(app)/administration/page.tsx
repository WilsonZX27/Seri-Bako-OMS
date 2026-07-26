import { CategoryCardGrid } from "@/components/category-card-grid";
import { getVisibleNavGroups, navPermissionCodes } from "@/components/layout/nav-items";
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
      <div className="space-y-4 p-3 sm:space-y-5 sm:p-5"><CategoryCardGrid items={links} /></div>
    </>
  );
}
