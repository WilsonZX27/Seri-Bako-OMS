import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { getCurrentProfile } from "@/server/queries/common";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const hasStaffRole = (profile as { has_staff_role?: boolean } | null)?.has_staff_role ?? true;

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          {!hasStaffRole ? (
            <div className="border-b border-amber-200 bg-amber-50 px-5 py-3 text-sm font-medium text-amber-800">
              Your account has no staff role assigned. Please run setup or contact admin.
            </div>
          ) : null}
          <main className="flex-1 pb-16 md:pb-0">{children}</main>
          <MobileBottomNav />
        </div>
      </div>
    </div>
  );
}
