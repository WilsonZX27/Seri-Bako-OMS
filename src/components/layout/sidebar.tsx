import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { getRoleDisplayLabel } from "@/lib/roles";
import type { UserRole } from "@/types/database";

export function Sidebar({ permissionMap, role, companyName, companyLogoUrl, displayName }: { permissionMap: Record<string, boolean>; role: UserRole; companyName: string; companyLogoUrl: string | null; displayName: string }) {
  // Navigation must never hold the application shell behind ten live COUNT queries.
  // Role and permission visibility are already resolved by the parent layout.
  return (
    <aside data-app-sidebar className="hidden h-dvh shrink-0 xl:block">
      <WorkspaceSidebar
        role={role}
        companyName={companyName}
        companyLogoUrl={companyLogoUrl}
        permissionMap={permissionMap}
        userName={displayName}
        userRoleLabel={getRoleDisplayLabel(role)}
      />
    </aside>
  );
}
