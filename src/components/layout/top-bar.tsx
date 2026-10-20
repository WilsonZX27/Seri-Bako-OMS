import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { AccountMenu } from "@/components/layout/account-menu";
import { GlobalSearch } from "@/components/search/global-search";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { MobileContextBack, MobileContextTitle } from "@/components/layout/mobile-context-header";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getNavAttentionHrefs } from "@/server/queries/topbar";
import type { getTopBarActivity as GetTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";
import { Suspense } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

async function WorkspaceUpdates({ activityPromise, canOpenActivity }: { activityPromise: ReturnType<typeof GetTopBarActivity>; canOpenActivity: boolean }) {
  return <TopBarActivityMenu data={await activityPromise} canOpenActivity={canOpenActivity} />;
}

async function MobileSidebarWithAttention({ role, permissionMap, companyName, companyLogoUrl, activityPromise }: { role: UserRole; permissionMap: Record<string, boolean>; companyName: string; companyLogoUrl: string | null; activityPromise: ReturnType<typeof GetTopBarActivity> }) {
  const activity = await activityPromise;
  return <MobileSidebar role={role} permissionMap={permissionMap} companyName={companyName} companyLogoUrl={companyLogoUrl} attentionHrefs={getNavAttentionHrefs(activity)} />;
}

export function TopBar({ permissionMap, role, companyName, companyLogoUrl, displayName, activityPromise }: { permissionMap: Record<string, boolean>; role: UserRole; companyName: string; companyLogoUrl: string | null; displayName: string; activityPromise: ReturnType<typeof GetTopBarActivity> }) {
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header data-app-topbar className="sticky top-0 z-40 grid h-[calc(3.5rem+env(safe-area-inset-top))] grid-cols-[3.5rem_minmax(0,1fr)_3.5rem] items-center border-b border-[var(--sb-border-soft)] bg-white px-2 pt-[env(safe-area-inset-top)] shadow-[0_1px_3px_rgb(6_44_31_/_0.08)] md:h-12 md:grid-cols-[minmax(0,1fr)_auto] md:gap-3 md:px-4 md:pt-0 md:shadow-none">
      <div className="md:hidden"><MobileContextBack /></div>
      <div className="min-w-0 md:hidden"><MobileContextTitle /></div>
      <div className="hidden min-w-0 items-center md:flex">
          <Suspense fallback={<Button type="button" variant="ghost" size="icon" disabled aria-label="Loading navigation" aria-busy="true"><span className="sr-only">Loading navigation</span></Button>}><MobileSidebarWithAttention role={role} permissionMap={permissionMap} companyName={companyName} companyLogoUrl={companyLogoUrl} activityPromise={activityPromise} /></Suspense>
          <div className="min-w-0"><Breadcrumbs /></div>
      </div>
      <div data-testid="topbar-account-region" className="flex min-w-0 items-center justify-end gap-2">
        <div data-testid="topbar-search-region" className="hidden md:block">
          <GlobalSearch permissionMap={permissionMap} />
        </div>
        {role !== "kitchen" ? <Suspense fallback={<Button type="button" variant="ghost" size="icon" disabled aria-label="Loading workspace updates" aria-busy="true"><Bell className="h-5 w-5" /></Button>}>
          <WorkspaceUpdates activityPromise={activityPromise} canOpenActivity />
        </Suspense> : null}
        <div className="hidden md:block"><AccountMenu displayName={displayName} roleLabel={getRoleDisplayLabel(role)} initials={initials} /></div>
      </div>
    </header>
  );
}
