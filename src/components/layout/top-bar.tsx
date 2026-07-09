import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopBarAction } from "@/components/layout/top-bar-action";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { getTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";

export async function TopBar() {
  const [profile, branding, activity] = await Promise.all([getCurrentProfile(), getCompanyBranding(), getTopBarActivity()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";
  const displayName = account?.full_name ?? account?.email ?? "Signed in";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="relative z-40 grid h-12 grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 border-b bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>
      <div data-testid="topbar-account-region" className="flex items-center justify-end gap-2">
        <TopBarAction />
        <div className="h-6 w-px bg-border" />
        <GlobalSearch />
        <TopBarActivityMenu data={activity} />
        <Link href="/account" className="pointer-events-auto hidden max-w-[160px] items-center gap-2 rounded-md px-1.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">{initials}</span>
          <span className="truncate">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
