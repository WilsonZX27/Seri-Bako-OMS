import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AccountMenu } from "@/components/layout/account-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { getTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";

export async function TopBar({ permissionMap }: { permissionMap: Record<string, boolean> }) {
  const [profile, branding, activity] = await Promise.all([getCurrentProfile(), getCompanyBranding(), getTopBarActivity()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "outlet_staff";
  const displayName = account?.full_name ?? account?.email ?? "Signed in";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="relative z-40 grid h-12 grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} permissionMap={permissionMap} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>
      <div data-testid="topbar-account-region" className="flex items-center justify-end gap-2">
        <div data-testid="topbar-search-region">
          <GlobalSearch permissionMap={permissionMap} />
        </div>
        <TopBarActivityMenu data={activity} />
        <AccountMenu displayName={displayName} roleLabel={getRoleDisplayLabel(role)} initials={initials} />
      </div>
    </header>
  );
}
