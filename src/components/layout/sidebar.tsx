import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { getCurrentProfile } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

export async function Sidebar() {
  const profile = await getCurrentProfile();
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";

  return (
    <aside className="hidden w-72 shrink-0 border-r lg:block">
      <WorkspaceSidebar role={role} />
    </aside>
  );
}
