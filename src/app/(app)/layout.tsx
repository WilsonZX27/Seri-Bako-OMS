import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { GlobalActionToast } from "@/components/global-action-toast";
import { SessionTimeoutProvider } from "@/components/session-timeout-provider";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/queries/common";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isMockMode()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const { data: staff } = await supabase
      .from("staffs")
      .select("status, must_change_password")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (staff && ["disabled", "inactive", "archived"].includes(staff.status)) {
      await supabase.auth.signOut();
      redirect("/login?error=disabled");
    }

    if (staff?.must_change_password) {
      redirect("/change-password");
    }
  }

  const profile = await getCurrentProfile();
  const hasStaffRole = (profile as { has_staff_role?: boolean } | null)?.has_staff_role ?? false;

  return (
    <div className="h-dvh overflow-hidden bg-background">
      <div className="flex h-dvh min-w-0">
        <Sidebar />
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex h-dvh min-w-0 flex-col">
            <TopBar />
            {!hasStaffRole ? (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
                Your account has no staff role assigned. Please run setup or contact admin.
              </div>
            ) : null}
            <GlobalActionToast />
            <SessionTimeoutProvider />
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">{children}</main>
            <MobileBottomNav />
          </div>
        </div>
      </div>
    </div>
  );
}
