import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
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
    <header className="relative z-40 grid h-12 grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>
      <div data-testid="topbar-account-region" className="flex items-center justify-end gap-2">
        <div data-testid="topbar-search-region">
          <GlobalSearch />
        </div>
        <TopBarActivityMenu data={activity} />
        <Link href="/account" aria-label={`Open account for ${displayName}`} className="pointer-events-auto hidden h-8 items-center gap-2 rounded-[2px] border border-[var(--sb-border-soft)] bg-white px-2 text-xs font-medium text-[var(--sb-text)] transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-300)] sm:flex">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-amber-100)] text-[10px] font-semibold text-[var(--sb-green-950)]">{initials}</span>
          <span className="hidden max-w-28 truncate md:inline">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
