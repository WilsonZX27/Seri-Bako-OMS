import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { RightConsoleProvider } from "@/components/layout/right-console";
import { GlobalActionToast } from "@/components/global-action-toast";
import { SessionTimeoutProvider } from "@/components/session-timeout-provider";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";
import { getPermissionMap } from "@/server/auth/permissions";
import { navPermissionCodes } from "@/components/layout/nav-items";
import { MobileAppNavigation } from "@/components/layout/mobile-app-navigation";
import { getCompanyBranding } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const mobileNavigationPermissionCodes = ["outlet_daily_record.create", "goods_receiving.create", "stock_count.create"];
  const permissionCodes = Array.from(new Set([...navPermissionCodes, ...mobileNavigationPermissionCodes]));
  const [profile, permissionMap, branding] = await Promise.all([getCurrentProfile(), getPermissionMap(permissionCodes), getCompanyBranding()]);

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

  const hasStaffRole = (profile as { has_staff_role?: boolean } | null)?.has_staff_role ?? false;
  const roleProfile = profile as { role_code?: UserRole; role?: UserRole } | null;
  const role = roleProfile?.role_code ?? roleProfile?.role ?? "outlet_staff";

  return (
    <div data-app-shell className="h-dvh overflow-hidden bg-[var(--app-bg)]">
      <div className="flex h-dvh min-w-0">
        <Sidebar permissionMap={permissionMap} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar permissionMap={permissionMap} />
          {!hasStaffRole ? (
            <div className="border-b border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] px-5 py-3 text-sm font-medium text-[var(--sb-warning)]" role="alert">
              Your account has no staff role assigned. Please contact the Super Admin / Owner.
            </div>
          ) : null}
          <div className="relative z-10 flex min-h-0 flex-1">
            <RightConsoleProvider>
              <div data-center-workspace className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <GlobalActionToast />
                <SessionTimeoutProvider />
                <main id="main-content" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+1rem)] xl:pb-0">{children}</main>
              </div>
            </RightConsoleProvider>
          </div>
        </div>
      </div>
      <MobileAppNavigation role={role} permissionMap={permissionMap} companyName={branding.company_name} />
    </div>
  );
}
