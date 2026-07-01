import { WorkspaceSidebar } from "@/components/layout/workspace-sidebar";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import type { UserRole } from "@/types/database";

export async function Sidebar() {
  const [profile, branding] = await Promise.all([getCurrentProfile(), getCompanyBranding()]);
  const profileRole = profile as { role_code?: UserRole; role?: UserRole } | null;
  const role = profileRole?.role_code ?? profileRole?.role ?? "viewer";

  return (
    <aside className="hidden w-72 shrink-0 border-r lg:block">
      <WorkspaceSidebar role={role} companyName={branding.company_name} companyLogoUrl={branding.logo_url} />
    </aside>
  );
}
