import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { getRoleDisplayLabel } from "@/lib/roles";
import type { UserRole } from "@/types/database";
import { getNavAttentionHrefs } from "@/server/queries/topbar";
import type { getTopBarActivity } from "@/server/queries/topbar";

export async function Sidebar({ permissionMap, role, companyName, companyLogoUrl, displayName, activityPromise }: { permissionMap: Record<string, boolean>; role: UserRole; companyName: string; companyLogoUrl: string | null; displayName: string; activityPromise: ReturnType<typeof getTopBarActivity> }) {
  // Navigation must never hold the application shell behind ten live COUNT queries.
  // Role and permission visibility are already resolved by the parent layout.
  const attentionHrefs = getNavAttentionHrefs(await activityPromise);
  return (
    <aside data-app-sidebar className="hidden h-dvh shrink-0 xl:block">
      <WorkspaceSidebar
        role={role}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        permissionMap={permissionMap}
        attentionHrefs={attentionHrefs}
        userName={displayName}
        userRoleLabel={getRoleDisplayLabel(role)}
      />
    </aside>
  );
}
