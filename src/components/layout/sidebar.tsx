import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { getSidebarCounts } from "@/server/queries/sidebar";
import type { UserRole } from "@/types/database";

export async function Sidebar({ permissionMap }: { permissionMap: Record<string, boolean> }) {
  const [profile, branding, counts] = await Promise.all([getCurrentProfile(), getCompanyBranding(), getSidebarCounts()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "outlet_staff";

  return (
    <aside className="hidden h-dvh shrink-0 xl:block">
      <WorkspaceSidebar
        role={role}
        companyName={branding.company_name}
        companyLogoUrl={branding.logo_url}
        navCounts={counts}
        permissionMap={permissionMap}
        userName={account?.full_name ?? account?.email ?? "Signed in"}
        userRoleLabel={getRoleDisplayLabel(role)}
      />
    </aside>
  );
}
