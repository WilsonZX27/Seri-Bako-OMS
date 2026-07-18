import Link from "next/link";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { getRoleDisplayLabel } from "@/lib/roles";
import { signOut } from "@/server/actions/auth";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { getTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";

export async function TopBar({ permissionMap }: { permissionMap: Record<string, boolean> }) {
  const [profile, branding, activity] = await Promise.all([getCurrentProfile(), getCompanyBranding(), getTopBarActivity()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "outlet_staff";
  const displayName = account?.full_name ?? account?.email ?? "Signed in";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <header className="relative z-40 grid h-12 grid-cols-[minmax(0,1fr)_auto] items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] bg-card px-4">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} permissionMap={permissionMap} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
        <div className="min-w-0">
          <Breadcrumbs />
        </div>
      </div>
      <div data-testid="topbar-account-region" className="flex items-center justify-end gap-2">
        <div data-testid="topbar-search-region">
          <GlobalSearch permissionMap={permissionMap} />
        </div>
        <TopBarActivityMenu data={activity} />
        <details className="relative block">
          <summary aria-label={`Open account for ${displayName}`} className="pointer-events-auto flex h-11 w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-[2px] border border-[var(--sb-border-soft)] bg-white px-0 text-xs font-medium text-[var(--sb-text)] transition-colors hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-amber-700)] sm:h-8 sm:w-auto sm:justify-start sm:px-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sb-amber-100)] text-[10px] font-semibold text-[var(--sb-green-950)]">{initials}</span>
            <span className="hidden max-w-28 truncate md:inline">{displayName}</span>
            <span className="hidden max-w-32 truncate text-[10px] font-normal text-muted-foreground lg:inline">{getRoleDisplayLabel(role)}</span>
          </summary>
          <div className="absolute right-0 mt-1 w-56 border border-[var(--sb-border-soft)] bg-white p-1 text-xs shadow-sm">
            <div className="border-b px-2 py-2">
              <p className="truncate font-semibold">{displayName}</p>
              <p className="truncate text-[11px] text-muted-foreground">{getRoleDisplayLabel(role)}</p>
            </div>
            <Link href="/account" className="block px-2 py-2 hover:bg-[var(--sb-surface-muted)]">Update Account</Link>
            <form action={signOut}>
              <button type="submit" className="block w-full px-2 py-2 text-left text-[var(--sb-danger)] hover:bg-[var(--sb-surface-muted)]">Logout</button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
