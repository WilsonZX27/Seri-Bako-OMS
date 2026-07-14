import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { RightConsoleProvider } from "@/components/layout/right-console";
import { GlobalActionToast } from "@/components/global-action-toast";
import { SessionTimeoutProvider } from "@/components/session-timeout-provider";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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

  const hasStaffRole = (profile as { has_staff_role?: boolean } | null)?.has_staff_role ?? false;

  return (
    <div data-app-shell className="h-dvh overflow-hidden bg-[var(--app-bg)]">
      <div className="flex h-dvh min-w-0">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <TopBar />
          {!hasStaffRole ? (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
              Your account has no staff role assigned. Please run setup or contact admin.
            </div>
          ) : null}
          <div className="relative z-10 flex min-h-0 flex-1">
            <RightConsoleProvider>
              <div data-center-workspace className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                <GlobalActionToast />
                <SessionTimeoutProvider />
                <main id="main-content" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-20 xl:pb-0">{children}</main>
              </div>
            </RightConsoleProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
