import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

export async function Sidebar({ permissionMap }: { permissionMap: Record<string, boolean> }) {
  // Navigation must never hold the application shell behind ten live COUNT
  // queries. Queue totals belong to pre-aggregated workspaces, not the global
  // navigation critical path.
  const [profile, branding] = await Promise.all([getCurrentProfile(), getCompanyBranding()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "outlet_staff";

  return (
    <aside className="hidden h-dvh shrink-0 xl:block">
      <WorkspaceSidebar
        role={role}
        companyName={branding.company_name}
        companyLogoUrl={branding.logo_url}
        permissionMap={permissionMap}
        userName={account?.full_name ?? account?.email ?? "Signed in"}
        userRoleLabel={getRoleDisplayLabel(role)}
      />
    </aside>
  );
}
