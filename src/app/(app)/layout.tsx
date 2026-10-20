import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { RightConsoleProvider } from "@/components/layout/right-console";
import { GlobalActionToast } from "@/components/global-action-toast";
import { FormValidationRecovery } from "@/components/form-validation-recovery";
import { SessionTimeoutProvider } from "@/components/session-timeout-provider";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";
import { getPermissionMap } from "@/server/auth/permissions";
import { navPermissionCodes } from "@/components/layout/nav-items";
import { MobileAppNavigation } from "@/components/layout/mobile-app-navigation";
import { getCompanyBranding } from "@/server/queries/common";
import { getTopBarActivity, getNavAttentionHrefs } from "@/server/queries/topbar";
import type { getTopBarActivity as GetTopBarActivity } from "@/server/queries/topbar";
import { Suspense } from "react";
import type { UserRole } from "@/types/database";
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const mobileNavigationPermissionCodes = ["outlet_daily_record.create", "goods_receiving.create", "stock_count.create"];
  const permissionCodes = Array.from(new Set([...navPermissionCodes, ...mobileNavigationPermissionCodes]));
  // Resolve the session/profile boundary before tenant-scoped permission RPCs.
  // Otherwise an expired or detached identity can throw from the shared layout
  // before the intended login/access-status redirect is allowed to run.
  const profile = await getCurrentProfile();

  if (!isMockMode()) {
    if (!profile) redirect("/login");
    const staff = profile as { status?: string; must_change_password?: boolean };

    if (staff.status && ["disabled", "inactive", "archived"].includes(staff.status)) {
      const supabase = await createClient();
      await supabase.auth.signOut();
      redirect("/login?error=disabled");
    }

    if (staff?.must_change_password) {
      redirect("/change-password");
    }
  }

  const [permissionMap, branding] = await Promise.all([getPermissionMap(permissionCodes), getCompanyBranding()]);
  const activityPromise = getTopBarActivity();

  const hasStaffRole = (profile as { has_staff_role?: boolean } | null)?.has_staff_role ?? false;
  const roleProfile = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null } | null;
  const role = roleProfile?.role_code ?? roleProfile?.role ?? "outlet_staff";
  const displayName = account?.full_name ?? account?.email ?? "Signed in";

  return (
    <div data-app-shell data-design-layer="v2" className="min-h-dvh bg-[var(--app-bg)] xl:h-dvh xl:overflow-hidden">
      <div className="flex min-h-dvh min-w-0 xl:h-dvh">
        <Suspense fallback={<aside data-app-sidebar aria-hidden="true" className="hidden h-dvh w-[var(--sb-sidebar-width)] shrink-0 bg-[var(--sb-green-950)] xl:block"/>}><Sidebar permissionMap={permissionMap} role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} displayName={displayName} activityPromise={activityPromise} /></Suspense>
        <div className="flex min-w-0 flex-1 flex-col xl:overflow-hidden">
          <TopBar permissionMap={permissionMap} role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} displayName={displayName} activityPromise={activityPromise} />
          {!hasStaffRole ? (
            <div className="border-b border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] px-5 py-3 text-sm font-medium text-[var(--sb-warning)]" role="alert">
              Your account has no staff role assigned. Please contact the Super Admin / Owner.
            </div>
          ) : null}
          <div className="relative z-10 flex min-h-0 flex-1">
            <RightConsoleProvider>
              <div data-center-workspace className="flex min-h-0 min-w-0 flex-1 flex-col xl:overflow-hidden">
                <GlobalActionToast />
                <FormValidationRecovery />
                <SessionTimeoutProvider />
                <main id="main-content" className="min-h-0 flex-1 overflow-x-hidden pb-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] xl:pb-0 xl:overflow-y-auto">{children}</main>
              </div>
            </RightConsoleProvider>
          </div>
        </div>
      </div>
      <Suspense fallback={null}><MobileNavigationWithAttention role={role} permissionMap={permissionMap} companyName={branding.company_name} activityPromise={activityPromise}/></Suspense>
    </div>
  );
}

async function MobileNavigationWithAttention({ role, permissionMap, companyName, activityPromise }: { role: UserRole; permissionMap: Record<string, boolean>; companyName: string; activityPromise: ReturnType<typeof GetTopBarActivity> }) {
  const activity = await activityPromise;
  return <MobileAppNavigation role={role} permissionMap={permissionMap} companyName={companyName} attentionHrefs={getNavAttentionHrefs(activity)} />;
}
