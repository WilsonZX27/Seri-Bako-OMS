import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AccountMenu } from "@/components/layout/account-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { MobileContextBack, MobileContextTitle } from "@/components/layout/mobile-context-header";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";

export async function TopBar({ permissionMap, role, companyName, companyLogoUrl, displayName }: { permissionMap: Record<string, boolean>; role: UserRole; companyName: string; companyLogoUrl: string | null; displayName: string }) {
  const activity = await getTopBarActivity();
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header data-app-topbar className="sticky top-0 z-40 grid h-[calc(3.5rem+env(safe-area-inset-top))] grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center border-b border-[var(--sb-border-soft)] bg-white px-2 pt-[env(safe-area-inset-top)] shadow-[0_1px_3px_rgb(6_44_31_/_0.08)] md:h-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-3 md:px-4 md:pt-0 md:shadow-none">
      <div className="md:hidden"><MobileContextBack /></div>
      <div className="min-w-0 md:hidden"><MobileContextTitle /></div>
      <div className="hidden min-w-0 items-center md:flex">
          <MobileSidebar role={role} permissionMap={permissionMap} companyName={companyName} companyLogoUrl={companyLogoUrl} />
          <div className="min-w-0"><Breadcrumbs /></div>
      </div>
      <div data-testid="topbar-account-region" className="flex min-w-0 items-center justify-end gap-2">
        <div data-testid="topbar-search-region" className="hidden md:block">
          <GlobalSearch permissionMap={permissionMap} />
        </div>
        <TopBarActivityMenu data={activity} />
        <div className="hidden md:block"><AccountMenu displayName={displayName} roleLabel={getRoleDisplayLabel(role)} initials={initials} /></div>
      </div>
    </header>
  );
}
