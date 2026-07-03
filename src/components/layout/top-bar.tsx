import { signOut } from "@/server/actions/auth";
import Link from "next/link";
import { ChevronDown, KeyRound, LogOut, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopBarActivityMenu } from "@/components/layout/top-bar-activity-menu";
import { getRoleDisplayLabel } from "@/lib/roles";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { getTopBarActivity } from "@/server/queries/topbar";
import type { UserRole } from "@/types/database";

export async function TopBar() {
  const [profile, branding, activity] = await Promise.all([getCurrentProfile(), getCompanyBranding(), getTopBarActivity()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const account = profile as { full_name?: string | null; email?: string | null; avatar_url?: string | null } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";
  const initials = (account?.full_name ?? account?.email ?? "U").slice(0, 2).toUpperCase();

  return (
    <header className="grid h-16 grid-cols-[minmax(0,1fr)_minmax(260px,520px)_auto] items-center gap-4 border-b bg-card px-5 max-lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">Operations Workspace</p>
          <Breadcrumbs />
        </div>
      </div>
      <div className="min-w-0 max-lg:hidden">
        <GlobalSearch />
      </div>
      <div className="flex items-center justify-end gap-3">
        <TopBarActivityMenu data={activity} />
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-full border bg-white px-2 py-1.5 text-left shadow-sm hover:bg-secondary">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {account?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={account.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : initials}
            </span>
            <span className="hidden min-w-0 text-right sm:block">
              <span className="block max-w-36 truncate text-sm font-medium">{profile?.full_name ?? "Signed in"}</span>
              <span className="block text-xs text-muted-foreground">{getRoleDisplayLabel(role)}</span>
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </summary>
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border bg-white p-2 shadow-lg">
            <Link href="/account" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
              <UserRound className="h-4 w-4 text-muted-foreground" />
              My Profile
            </Link>
            <Link href="/account#password" className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-secondary">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              Change Password
            </Link>
            <form action={signOut}>
              <Button variant="ghost" size="sm" className="mt-1 w-full justify-start px-3 text-sm font-normal text-red-700 hover:bg-red-50 hover:text-red-800">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
