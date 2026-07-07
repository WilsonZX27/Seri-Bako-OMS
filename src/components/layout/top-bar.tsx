import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { getTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";

export async function TopBar() {
  const [profile, branding, activity] = await Promise.all([getCurrentProfile(), getCompanyBranding(), getTopBarActivity()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";

  return (
    <header className="grid h-12 grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>
      <div data-testid="topbar-account-region" className="flex items-center justify-end gap-2">
        <TopBarActivityMenu data={activity} />
        <Button asChild size="sm">
          <Link href="/purchase-requests/new"><Plus className="h-3.5 w-3.5" /> Create PR</Link>
        </Button>
      </div>
    </header>
  );
}
