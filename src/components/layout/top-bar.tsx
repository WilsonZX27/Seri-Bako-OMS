import { signOut } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { GlobalSearch } from "@/components/search/global-search";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { getCurrentProfile } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

export async function TopBar() {
  const profile = await getCurrentProfile();
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-5">
      <div className="flex min-w-0 items-center gap-3">
        <MobileSidebar role={role} />
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm font-medium">Operations Workspace</p>
          <Breadcrumbs role={role} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <GlobalSearch />
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium">{profile?.full_name ?? "Signed in"}</p>
          <p className="text-xs capitalize text-muted-foreground">{profile?.role ?? "viewer"}</p>
        </div>
        <form action={signOut}>
          <Button variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  );
}
